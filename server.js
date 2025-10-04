const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const { 
    extendedTaobaoItems, 
    searchItems, 
    getItemById, 
    getRandomItems, 
    getItemsByCategory, 
    getBestsellers 
} = require('./taobao-api');

const {
    DELIVERY_METHODS,
    ADDITIONAL_SERVICES,
    calculateDelivery,
    getAvailableDeliveryMethods,
    getRecommendedDeliveryMethod,
    formatDeliveryInfo
} = require('./delivery-calculator');

const { 
    calculateDeliveryByAddress, 
    getSupportedCountries 
} = require('./geo-delivery-calculator');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройки
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-email@gmail.com'; // Замените на реальный email
const ADMIN_TELEGRAM = '@bg.m01k';
const MARKUP_PERCENTAGE = 30; // 30% наценка

// Telegram настройки
const TELEGRAM_CONFIG = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '7372849164:AAEknGKNz3TJ7HdtYvFJLB2V8dJbB9m9eDo', // Временный тестовый токен
    chatId: process.env.TELEGRAM_CHAT_ID || '7372849164', // Временный тестовый chat ID
    enabled: process.env.TELEGRAM_ENABLED === 'true' || true // включаем для тестирования
};

// Email настройки
const EMAIL_CONFIG = {
    service: 'gmail', // или другой сервис
    user: process.env.EMAIL_USER || '', // ваш email для отправки
    password: process.env.EMAIL_PASSWORD || '', // пароль приложения Gmail
    enabled: process.env.EMAIL_ENABLED === 'true' || false
};

console.log('📧 Email настройки:');
console.log('- Админ email:', ADMIN_EMAIL);
console.log('- Email сервис:', EMAIL_CONFIG.enabled ? 'включен' : 'отключен');
if (EMAIL_CONFIG.enabled && EMAIL_CONFIG.user) {
    console.log('- Отправитель:', EMAIL_CONFIG.user);
}

console.log('📱 Telegram настройки:');
console.log('- Telegram бот:', TELEGRAM_CONFIG.enabled ? 'включен' : 'отключен');
if (TELEGRAM_CONFIG.enabled && TELEGRAM_CONFIG.botToken) {
    console.log('- Chat ID:', TELEGRAM_CONFIG.chatId || 'не указан');
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Хранилище данных
let userCarts = {}; // {sessionId: {items: [], total: 0}}
let orders = {}; // {orderId: {...}}

// Файлы для хранения данных
const CARTS_FILE = './data/web_carts.json';
const ORDERS_FILE = './data/web_orders.json';

// Загрузка и сохранение данных
function loadData() {
    try {
        if (fs.existsSync(CARTS_FILE)) {
            userCarts = JSON.parse(fs.readFileSync(CARTS_FILE, 'utf8'));
        }
        if (fs.existsSync(ORDERS_FILE)) {
            orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

function saveData() {
    try {
        fs.writeFileSync(CARTS_FILE, JSON.stringify(userCarts, null, 2));
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
    }
}

// Настройка email для уведомлений
let transporter = null;

if (EMAIL_CONFIG.enabled && EMAIL_CONFIG.user && EMAIL_CONFIG.password) {
    try {
        transporter = nodemailer.createTransport({
            service: EMAIL_CONFIG.service,
            auth: {
                user: EMAIL_CONFIG.user,
                pass: EMAIL_CONFIG.password
            }
        });
        console.log('✅ Email транспорт настроен успешно');
    } catch (error) {
        console.error('❌ Ошибка настройки email:', error.message);
    }
} else {
    console.log('⚠️ Email не настроен. Для включения установите переменные среды:');
    console.log('   EMAIL_ENABLED=true');
    console.log('   EMAIL_USER=your-email@gmail.com');
    console.log('   EMAIL_PASSWORD=your-app-password');
    console.log('   ADMIN_EMAIL=admin@example.com');
}

// Показываем инструкции по настройке Telegram
if (!TELEGRAM_CONFIG.enabled || !TELEGRAM_CONFIG.botToken || !TELEGRAM_CONFIG.chatId) {
    console.log('⚠️ Telegram не настроен. Для включения:');
    console.log('   1. Создайте бота у @BotFather в Telegram');
    console.log('   2. Получите токен бота');
    console.log('   3. Найдите ваш Chat ID (отправьте сообщение @userinfobot)');
    console.log('   4. Установите переменные среды:');
    console.log('      TELEGRAM_ENABLED=true');
    console.log('      TELEGRAM_BOT_TOKEN=ваш_токен_бота');
    console.log('      TELEGRAM_CHAT_ID=ваш_chat_id');
}

// Функция отправки уведомлений в Telegram
async function sendTelegramNotification(message) {
    if (!TELEGRAM_CONFIG.enabled || !TELEGRAM_CONFIG.botToken || !TELEGRAM_CONFIG.chatId) {
        console.log('📱 Telegram не настроен, пропускаем отправку');
        return { success: false, error: 'Telegram не настроен' };
    }
    
    try {
        const telegramAPI = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;
        
        const response = await fetch(telegramAPI, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CONFIG.chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            console.log('✅ Сообщение в Telegram отправлено');
            return { success: true };
        } else {
            console.error('❌ Ошибка отправки в Telegram:', result);
            return { success: false, error: result.description };
        }
    } catch (error) {
        console.error('❌ Ошибка при отправке в Telegram:', error);
        return { success: false, error: error.message };
    }
}

// Функции работы с корзиной
function getCart(sessionId) {
    if (!userCarts[sessionId]) {
        userCarts[sessionId] = { items: [], total: 0 };
    }
    return userCarts[sessionId];
}

function addToCart(sessionId, item, quantity = 1) {
    const cart = getCart(sessionId);
    const finalPrice = item.price * (1 + MARKUP_PERCENTAGE / 100);
    
    const existingItem = cart.items.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.items.push({
            ...item,
            finalPrice: finalPrice,
            quantity: quantity
        });
    }
    
    updateCartTotal(sessionId);
    saveData();
    return cart;
}

function removeFromCart(sessionId, itemId) {
    const cart = getCart(sessionId);
    cart.items = cart.items.filter(item => item.id !== itemId);
    updateCartTotal(sessionId);
    saveData();
    return cart;
}

function updateCartTotal(sessionId) {
    const cart = getCart(sessionId);
    cart.total = cart.items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
}

function clearCart(sessionId) {
    userCarts[sessionId] = { items: [], total: 0 };
    saveData();
}

// API Routes

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Получить все товары
app.get('/api/items', (req, res) => {
    const { category, search, limit } = req.query;
    
    let items = extendedTaobaoItems;
    
    if (search) {
        items = searchItems(search, category);
    } else if (category && category !== 'all') {
        items = getItemsByCategory(category);
    }
    
    if (limit) {
        items = items.slice(0, parseInt(limit));
    }
    
    // Добавляем финальную цену к каждому товару
    items = items.map(item => ({
        ...item,
        finalPrice: item.price * (1 + MARKUP_PERCENTAGE / 100)
    }));
    
    res.json(items);
});

// Получить товар по ID
app.get('/api/items/:id', (req, res) => {
    const item = getItemById(req.params.id);
    if (item) {
        res.json({
            ...item,
            finalPrice: item.price * (1 + MARKUP_PERCENTAGE / 100)
        });
    } else {
        res.status(404).json({ error: 'Товар не найден' });
    }
});

// Получить бестселлеры
app.get('/api/bestsellers', (req, res) => {
    const items = getBestsellers(6).map(item => ({
        ...item,
        finalPrice: item.price * (1 + MARKUP_PERCENTAGE / 100)
    }));
    res.json(items);
});

// Получить категории
app.get('/api/categories', (req, res) => {
    const categories = [
        { id: 'hoodies', name: 'Худи и свитшоты', icon: '🔥' },
        { id: 'sneakers', name: 'Кроссовки', icon: '⚡' },
        { id: 'tshirts', name: 'Футболки', icon: '🌟' },
        { id: 'accessories', name: 'Аксессуары', icon: '💎' },
        { id: 'jackets', name: 'Куртки', icon: '🧥' },
        { id: 'pants', name: 'Штаны', icon: '👖' },
        { id: 'bags', name: 'Сумки', icon: '🎒' }
    ];
    res.json(categories);
});

// Корзина - получить
app.get('/api/cart/:sessionId', (req, res) => {
    const cart = getCart(req.params.sessionId);
    res.json(cart);
});

// Корзина - добавить товар
app.post('/api/cart/:sessionId/add', (req, res) => {
    const { itemId, id, quantity = 1, size = 'M' } = req.body;
    const productId = itemId || id; // Поддерживаем оба варианта
    
    console.log('Добавление в корзину:', { productId, quantity, size });
    
    // Сначала пробуем найти в основной базе
    let item = getItemById(productId);
    
    // Если не нашли, ищем в fallback товарах
    if (!item) {
        const fallbackItems = [
            {
                id: 'nike-jordan-1',
                title: '👟 Nike Jordan 1 Retro High',
                price: 150,
                finalPrice: 195,
                category: 'sneakers',
                seller: 'Nike Official Store',
                description: 'Легендарные кроссовки Jordan 1 в классической расцветке',
                weight: 1.2
            },
            {
                id: 'supreme-hoodie',
                title: '👕 Supreme Box Logo Hoodie',
                price: 200,
                finalPrice: 260,
                category: 'tops',
                seller: 'Supreme',
                description: 'Оригинальное худи от Supreme с культовым логотипом',
                weight: 0.8
            },
            {
                id: 'off-white-tee',
                title: '👕 Off-White Arrows T-Shirt',
                price: 120,
                finalPrice: 156,
                category: 'tops',
                seller: 'Off-White',
                description: 'Стильная футболка с фирменным принтом стрелок',
                weight: 0.3
            },
            {
                id: 'yeezy-350',
                title: '👟 Adidas Yeezy Boost 350',
                price: 220,
                finalPrice: 286,
                category: 'sneakers',
                seller: 'Adidas Yeezy',
                description: 'Популярные кроссовки от Kanye West',
                weight: 1.1
            },
            {
                id: 'stone-island-jacket',
                title: '🧥 Stone Island Jacket',
                price: 300,
                finalPrice: 390,
                category: 'outerwear',
                seller: 'Stone Island',
                description: 'Премиальная куртка от итальянского бренда',
                weight: 1.5
            }
        ];
        
        item = fallbackItems.find(f => f.id === productId);
    }
    
    if (!item) {
        console.log('Товар не найден:', productId);
        return res.status(404).json({ error: 'Товар не найден' });
    }
    
    console.log('Найден товар:', item.title);
    
    try {
        const cart = getCart(req.params.sessionId);
        
        // Проверяем, есть ли товар уже в корзине
        const existingItem = cart.items.find(cartItem => cartItem.id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            // Рассчитываем финальную цену с наценкой
            const finalPrice = item.price * (1 + MARKUP_PERCENTAGE / 100);
            
            cart.items.push({
                id: item.id,
                title: item.title,
                price: item.price,
                finalPrice: finalPrice,
                category: item.category,
                seller: item.seller,
                quantity: quantity,
                size: size,
                weight: item.weight || 0.5
            });
        }
        
        // Пересчитываем общую стоимость
        cart.total = cart.items.reduce((sum, cartItem) => {
            return sum + (cartItem.finalPrice * cartItem.quantity);
        }, 0);
        
        saveData();
        console.log('Товар добавлен в корзину:', cart);
        
        res.json(cart);
    } catch (error) {
        console.error('Ошибка добавления в корзину:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Корзина - удалить товар
app.delete('/api/cart/:sessionId/remove/:itemId', (req, res) => {
    const cart = removeFromCart(req.params.sessionId, req.params.itemId);
    res.json({ success: true, cart });
});

// Новый POST-эндпоинт для удаления товара из корзины (для совместимости с клиентом)
app.post('/api/cart/:sessionId/remove', (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'Не указан id товара' });
    }
    const cart = removeFromCart(req.params.sessionId, id);
    res.json(cart);
});

// Корзина - очистить
app.delete('/api/cart/:sessionId/clear', (req, res) => {
    clearCart(req.params.sessionId);
    res.json({ success: true });
});

// Доставка - получить доступные методы
app.get('/api/delivery/methods/:sessionId', (req, res) => {
    const cart = getCart(req.params.sessionId);
    
    if (cart.items.length === 0) {
        return res.status(400).json({ error: 'Корзина пуста' });
    }
    
    try {
        const availableMethods = getAvailableDeliveryMethods(cart.items);
        const recommended = getRecommendedDeliveryMethod(cart.items);
        
        res.json({
            available: availableMethods,
            recommended: recommended,
            additionalServices: ADDITIONAL_SERVICES
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка расчета доставки' });
    }
});

// Доставка - получить поддерживаемые страны
app.get('/api/delivery/countries', (req, res) => {
    try {
        const countries = getSupportedCountries();
        res.json(countries);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения списка стран' });
    }
});

// Доставка - рассчитать по адресу
app.post('/api/delivery/calculate-by-address/:sessionId', (req, res) => {
    const { address, additionalServices = [] } = req.body;
    const cart = getCart(req.params.sessionId);
    
    if (cart.items.length === 0) {
        return res.status(400).json({ error: 'Корзина пуста' });
    }
    
    if (!address || !address.countryCode) {
        return res.status(400).json({ error: 'Необходимо указать адрес с кодом страны' });
    }
    
    try {
        const calculation = calculateDeliveryByAddress(address, cart.items, cart.total);
        
        if (calculation.error) {
            return res.status(400).json({ error: calculation.error });
        }
        
        // Добавляем выбранные дополнительные услуги
        let selectedServices = [];
        let additionalCost = 0;
        
        if (additionalServices.length > 0) {
            for (const serviceId of additionalServices) {
                if (calculation.additionalServices[serviceId]) {
                    const service = calculation.additionalServices[serviceId];
                    selectedServices.push({
                        id: serviceId,
                        ...service
                    });
                    additionalCost += service.cost;
                }
            }
        }
        
        res.json({
            ...calculation,
            selectedServices,
            additionalCost,
            totalWithServices: calculation.methods.map(method => ({
                ...method,
                totalCost: method.cost + additionalCost
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Доставка - получить методы доставки (старый endpoint для совместимости)
app.get('/api/delivery/methods/:sessionId', (req, res) => {
    const cart = getCart(req.params.sessionId);
    
    if (cart.items.length === 0) {
        return res.status(400).json({ error: 'Корзина пуста' });
    }
    
    try {
        const available = getAvailableDeliveryMethods(cart.items);
        const recommended = getRecommendedDeliveryMethod(cart.items);
        
        res.json({
            available: available,
            recommended: recommended,
            additionalServices: ADDITIONAL_SERVICES
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка расчета доставки' });
    }
});

// Доставка - рассчитать стоимость
app.post('/api/delivery/calculate/:sessionId', (req, res) => {
    const { method = 'standard', additionalServices = [] } = req.body;
    const cart = getCart(req.params.sessionId);
    
    if (cart.items.length === 0) {
        return res.status(400).json({ error: 'Корзина пуста' });
    }
    
    try {
        const calculation = calculateDelivery(cart.items, method, additionalServices);
        const formatted = formatDeliveryInfo(calculation);
        
        res.json({
            ...calculation,
            formatted: formatted
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Оформить заказ
app.post('/api/order', async (req, res) => {
    const { sessionId, customerInfo, deliveryMethod = 'express', additionalServices = [] } = req.body;
    const cart = getCart(sessionId);
    
    if (cart.items.length === 0) {
        return res.status(400).json({ error: 'Корзина пуста' });
    }
    
    // Проверяем наличие всех необходимых данных
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
        return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    
    if (!customerInfo.country || !customerInfo.city) {
        return res.status(400).json({ error: 'Укажите страну и город доставки' });
    }
    
    try {
        // Формируем полный адрес для расчета доставки
        const deliveryAddress = {
            countryCode: customerInfo.country,
            country: getCountryNameByCode(customerInfo.country),
            region: customerInfo.region || '',
            city: customerInfo.city,
            postal: customerInfo.postal || '',
            address: customerInfo.address
        };
        
        // Рассчитываем доставку по географическому адресу
        const deliveryCalculation = calculateDeliveryByAddress(deliveryAddress, cart.items, cart.total);
        
        if (deliveryCalculation.error) {
            return res.status(400).json({ error: deliveryCalculation.error });
        }
        
        // Находим выбранный метод доставки
        const selectedMethod = deliveryCalculation.methods.find(m => m.id === deliveryMethod);
        if (!selectedMethod) {
            return res.status(400).json({ error: 'Недопустимый метод доставки' });
        }
        
        // Рассчитываем дополнительные услуги
        let selectedServices = [];
        let additionalCost = 0;
        
        if (additionalServices.length > 0) {
            for (const serviceId of additionalServices) {
                if (deliveryCalculation.additionalServices[serviceId]) {
                    const service = deliveryCalculation.additionalServices[serviceId];
                    selectedServices.push({
                        id: serviceId,
                        name: service.name,
                        description: service.description,
                        cost: service.cost,
                        icon: service.icon
                    });
                    additionalCost += service.cost;
                }
            }
        }
        
        const totalDeliveryCost = selectedMethod.cost + additionalCost;
        
        // Создаем заказ
        const orderId = 'GW' + Date.now().toString().slice(-6);
        const order = {
            orderId,
            sessionId,
            items: [...cart.items],
            subtotal: cart.total,
            delivery: {
                method: selectedMethod,
                address: deliveryAddress,
                baseCost: selectedMethod.cost,
                additionalServices: selectedServices,
                additionalCost: additionalCost,
                totalCost: totalDeliveryCost,
                weight: selectedMethod.weight,
                deliveryTime: selectedMethod.deliveryTime,
                zone: selectedMethod.zone,
                deliveryInfo: deliveryCalculation.deliveryInfo
            },
            total: cart.total + totalDeliveryCost,
            customerInfo: {
                ...customerInfo,
                fullAddress: `${deliveryAddress.address}, ${deliveryAddress.city}${deliveryAddress.region ? ', ' + deliveryAddress.region : ''}, ${deliveryAddress.country}${deliveryAddress.postal ? ', ' + deliveryAddress.postal : ''}`
            },
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        
        orders[orderId] = order;
        clearCart(sessionId);
        saveData();
        
        // Отправляем уведомление на email (если настроен)
        try {
            if (transporter && ADMIN_EMAIL && ADMIN_EMAIL !== 'your-email@gmail.com') {
                const emailContent = `
🔥 НОВЫЙ ЗАКАЗ GLOBEWEARZ! 🌍

Номер заказа: ${orderId}

👤 КЛИЕНТ:
- Имя: ${customerInfo.name}
- Email: ${customerInfo.email}
- Телефон: ${customerInfo.phone}

🌍 АДРЕС ДОСТАВКИ:
- Страна: ${deliveryAddress.country} (${deliveryAddress.countryCode})
- Регион: ${deliveryAddress.region || 'Не указан'}
- Город: ${deliveryAddress.city}
- Почтовый индекс: ${deliveryAddress.postal || 'Не указан'}
- Адрес: ${deliveryAddress.address}
${customerInfo.delivery_notes ? `- Примечания: ${customerInfo.delivery_notes}` : ''}

🛍️ ТОВАРЫ:
${order.items.map((item, index) => 
    `${index + 1}. ${item.title} - $${item.finalPrice} x ${item.quantity} = $${(item.finalPrice * item.quantity).toFixed(2)}`
).join('\n')}

💰 СТОИМОСТЬ:
- Товары: $${order.subtotal.toFixed(2)}

🚚 ДОСТАВКА:
- Метод: ${selectedMethod.name} ${selectedMethod.icon}
- Зона: ${selectedMethod.zone}
- Вес: ${selectedMethod.weight.toFixed(1)} кг
- Базовая стоимость: $${selectedMethod.cost.toFixed(2)}
- Срок доставки: ${selectedMethod.deliveryTime}
${selectedServices.length > 0 ? 
    '\n📦 Дополнительные услуги:\n' + selectedServices.map(s => `- ${s.icon} ${s.name}: $${s.cost.toFixed(2)}`).join('\n') 
    : ''}
- Итого доставка: $${totalDeliveryCost.toFixed(2)}

💳 ИТОГО К ОПЛАТЕ: $${order.total.toFixed(2)}

⏰ Время заказа: ${new Date(order.timestamp).toLocaleString('ru-RU')}

📞 Свяжитесь с клиентом для подтверждения и уточнения деталей!

--
GlobeWearZ Store | Premium Streetwear
Admin: ${ADMIN_TELEGRAM}
                `;
                
                await transporter.sendMail({
                    from: `"GlobeWearZ Store" <${EMAIL_CONFIG.user}>`,
                    to: ADMIN_EMAIL,
                    subject: `🔥 Новый заказ ${orderId} - ${deliveryAddress.country} - GlobeWearZ`,
                    text: emailContent
                });
                
                console.log(`✅ Email уведомление отправлено на ${ADMIN_EMAIL}`);
            } else {
                console.log('⚠️ Email не отправлен - сервис не настроен');
                console.log('💡 Для настройки email установите переменные среды или измените настройки в коде');
            }
        } catch (error) {
            console.error('❌ Ошибка отправки email:', error.message);
        }
        
        // Отправляем уведомление в Telegram
        try {
            const telegramMessage = `
🔥 <b>НОВЫЙ ЗАКАЗ GLOBEWEARZ!</b> 🌍

<b>Номер заказа:</b> ${orderId}

👤 <b>КЛИЕНТ:</b>
• Имя: ${customerInfo.name}
• Email: ${customerInfo.email}
• Телефон: ${customerInfo.phone}

🌍 <b>АДРЕС ДОСТАВКИ:</b>
• ${deliveryAddress.country} (${deliveryAddress.countryCode})
• ${deliveryAddress.city}${deliveryAddress.region ? ', ' + deliveryAddress.region : ''}
• ${deliveryAddress.address}
${customerInfo.delivery_notes ? `• Примечания: ${customerInfo.delivery_notes}` : ''}

🛍️ <b>ТОВАРЫ:</b>
${order.items.map((item, index) => 
    `${index + 1}. ${item.title}\n   $${item.finalPrice} x ${item.quantity} = $${(item.finalPrice * item.quantity).toFixed(2)}`
).join('\n')}

💰 <b>СТОИМОСТЬ:</b>
• Товары: $${order.subtotal.toFixed(2)}
• Доставка: $${totalDeliveryCost.toFixed(2)}
• <b>ИТОГО: $${order.total.toFixed(2)}</b>

🚚 <b>ДОСТАВКА:</b>
• ${selectedMethod.name} ${selectedMethod.icon}
• ${selectedMethod.deliveryTime}

⏰ ${new Date(order.timestamp).toLocaleString('ru-RU')}

📞 <b>Свяжитесь с клиентом для подтверждения!</b>
            `;
            
            await sendTelegramNotification(telegramMessage);
        } catch (error) {
            console.error('❌ Ошибка отправки Telegram:', error.message);
        }
        
        res.json({ success: true, orderId, order });
    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        res.status(500).json({ error: 'Ошибка при оформлении заказа' });
    }
});

// Вспомогательная функция для получения названия страны по коду
function getCountryNameByCode(countryCode) {
    const countryNames = {
        'RU': 'Россия',
        'KZ': 'Казахстан', 
        'BY': 'Беларусь',
        'UA': 'Украина',
        'UZ': 'Узбекистан',
        'KG': 'Киргизия',
        'TJ': 'Таджикистан',
        'US': 'США',
        'DE': 'Германия',
        'FR': 'Франция',
        'IT': 'Италия',
        'ES': 'Испания',
        'GB': 'Великобритания',
        'PL': 'Польша',
        'CZ': 'Чехия',
        'TR': 'Турция',
        'CN': 'Китай',
        'JP': 'Япония',
        'KR': 'Южная Корея',
        'AU': 'Австралия',
        'CA': 'Канада',
        'BR': 'Бразилия'
    };
    return countryNames[countryCode] || 'Другая страна';
}

// Получить заказ по ID
app.get('/api/order/:orderId', (req, res) => {
    const order = orders[req.params.orderId];
    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ error: 'Заказ не найден' });
    }
});

// Статистика для админа
app.get('/api/admin/stats', (req, res) => {
    const totalOrders = Object.keys(orders).length;
    const totalRevenue = Object.values(orders).reduce((sum, order) => sum + order.total, 0);
    const todayOrders = Object.values(orders).filter(order => {
        const orderDate = new Date(order.timestamp).toDateString();
        const today = new Date().toDateString();
        return orderDate === today;
    }).length;
    
    res.json({
        totalOrders,
        totalRevenue: totalRevenue.toFixed(2),
        todayOrders,
        recentOrders: Object.values(orders).slice(-10).reverse()
    });
});

// Запуск сервера
loadData();

// Автосохранение каждые 5 минут
setInterval(saveData, 5 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`🌍 GlobeWearZ Store запущен на http://localhost:${PORT}`);
    console.log(`🔥 Админ: ${ADMIN_TELEGRAM}`);
    console.log(`💎 Наценка: +${MARKUP_PERCENTAGE}% к цене товара`);
    console.log(`🚀 Готов к приему заказов!`);
});
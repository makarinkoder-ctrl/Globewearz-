const TelegramBot = require('node-telegram-bot-api');
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
    getRecommendedDeliveryMethod
} = require('./delivery-calculator');

const { 
    calculateDeliveryByAddress, 
    getSupportedCountries 
} = require('./geo-delivery-calculator');

// Конфигурация бота
const BOT_TOKEN = '8474179699:AAF0hwS1VTzlIyMjrF7Blqj_bRtpmVEKSdM'; // Получите токен от @BotFather
const ADMIN_CHAT_ID = '5557326250'; // Ваш Chat ID для уведомлений
const MARKUP_PERCENTAGE = 30; // 30% наценка

// Создаем бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Хранилище пользовательских данных
let userSessions = {}; // {userId: {cart: [], step: '', data: {}}}
let userOrders = {}; // {orderId: {...}}

// Функции для работы с сессиями
function getUserSession(userId) {
    if (!userSessions[userId]) {
        userSessions[userId] = {
            cart: [],
            step: 'main',
            data: {},
            total: 0
        };
    }
    return userSessions[userId];
}

function clearCart(userId) {
    const session = getUserSession(userId);
    session.cart = [];
    session.total = 0;
    updateCartTotal(userId);
}

function addToCart(userId, item, size = 'M', quantity = 1) {
    const session = getUserSession(userId);
    const finalPrice = item.price * (1 + MARKUP_PERCENTAGE / 100);
    
    const existingItem = session.cart.find(cartItem => cartItem.id === item.id && cartItem.size === size);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        session.cart.push({
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
    
    updateCartTotal(userId);
    return session;
}

function removeFromCart(userId, itemId, size) {
    const session = getUserSession(userId);
    session.cart = session.cart.filter(item => !(item.id === itemId && item.size === size));
    updateCartTotal(userId);
    return session;
}

function updateCartTotal(userId) {
    const session = getUserSession(userId);
    session.total = session.cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
}

// Клавиатуры
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            ['🛍️ Каталог', '🔥 Хиты продаж'],
            ['🛒 Корзина', '📋 Мои заказы'],
            ['ℹ️ Информация', '📞 Поддержка']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

const categoriesKeyboard = {
    reply_markup: {
        keyboard: [
            ['👕 Худи', '👟 Кроссовки'],
            ['👔 Футболки', '🧥 Куртки'],
            ['👖 Брюки', '🎒 Аксессуары'],
            ['🔙 Назад в меню']
        ],
        resize_keyboard: true
    }
};

const cartKeyboard = {
    reply_markup: {
        keyboard: [
            ['➕ Добавить товар', '🗑️ Очистить корзину'],
            ['🚀 Оформить заказ'],
            ['🔙 Назад в меню']
        ],
        resize_keyboard: true
    }
};

const sizesKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: 'XS', callback_data: 'size_XS' },
                { text: 'S', callback_data: 'size_S' },
                { text: 'M', callback_data: 'size_M' }
            ],
            [
                { text: 'L', callback_data: 'size_L' },
                { text: 'XL', callback_data: 'size_XL' },
                { text: 'XXL', callback_data: 'size_XXL' }
            ]
        ]
    }
};

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'Друг';
    
    bot.sendMessage(chatId, 
        `🌍 Добро пожаловать в *GlobeWearZ*, ${firstName}!\\n\\n` +
        `*Premium Streetwear* прямо из Taobao 🔥\\n\\n` +
        `У нас вы найдете:\\n` +
        `👕 Оригинальные худи и футболки\\n` +
        `👟 Эксклюзивные кроссовки\\n` +
        `🧥 Стильные куртки и верхнюю одежду\\n` +
        `🎒 Модные аксессуары\\n\\n` +
        `💎 *Гарантия качества*\\n` +
        `🚚 *Быстрая доставка по всему миру*\\n` +
        `💰 *Честные цены*\\n\\n` +
        `Выберите действие из меню ниже:`,
        { 
            parse_mode: 'Markdown',
            ...mainKeyboard 
        }
    );
});

// Главное меню
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const session = getUserSession(chatId);
    
    if (text === '🛍️ Каталог') {
        bot.sendMessage(chatId, 
            '🛍️ *Каталог товаров*\\n\\n' +
            'Выберите категорию:', 
            { 
                parse_mode: 'Markdown',
                ...categoriesKeyboard 
            }
        );
        session.step = 'catalog';
    }
    
    else if (text === '🔥 Хиты продаж') {
        showBestsellers(chatId);
    }
    
    else if (text === '🛒 Корзина') {
        showCart(chatId);
    }
    
    else if (text === '📋 Мои заказы') {
        showUserOrders(chatId);
    }
    
    else if (text === 'ℹ️ Информация') {
        bot.sendMessage(chatId,
            `ℹ️ *О GlobeWearZ*\\n\\n` +
            `🌍 Мы специализируемся на доставке премиальной streetwear одежды с площадки Taobao\\n\\n` +
            `✅ *Наши преимущества:*\\n` +
            `• Проверенные поставщики\\n` +
            `• Контроль качества\\n` +
            `• Быстрая доставка\\n` +
            `• Поддержка 24/7\\n` +
            `• Гарантия возврата\\n\\n` +
            `💎 Наценка: +${MARKUP_PERCENTAGE}% к цене товара\\n` +
            `🚚 Доставка рассчитывается индивидуально`,
            { 
                parse_mode: 'Markdown',
                ...mainKeyboard 
            }
        );
    }
    
    else if (text === '📞 Поддержка') {
        bot.sendMessage(chatId,
            `📞 *Поддержка клиентов*\\n\\n` +
            `Мы всегда готовы помочь!\\n\\n` +
            `📱 Telegram: @bg\\.m01k\\n` +
            `⏰ Время работы: 24/7\\n\\n` +
            `❓ *Часто задаваемые вопросы:*\\n` +
            `• Сроки доставки: 10\\-30 дней\\n` +
            `• Оплата: После подтверждения заказа\\n` +
            `• Возврат: В течение 14 дней\\n` +
            `• Размеры: Азиатские, на размер меньше`,
            { 
                parse_mode: 'MarkdownV2',
                ...mainKeyboard 
            }
        );
    }
    
    else if (text === '🔙 Назад в меню') {
        session.step = 'main';
        bot.sendMessage(chatId, 
            '🏠 Главное меню', 
            mainKeyboard
        );
    }
    
    // Категории товаров
    else if (text === '👕 Худи') {
        showCategoryItems(chatId, 'hoodies', '👕 Худи');
    }
    else if (text === '👟 Кроссовки') {
        showCategoryItems(chatId, 'sneakers', '👟 Кроссовки');
    }
    else if (text === '👔 Футболки') {
        showCategoryItems(chatId, 'tshirts', '👔 Футболки');
    }
    else if (text === '🧥 Куртки') {
        showCategoryItems(chatId, 'jackets', '🧥 Куртки');
    }
    else if (text === '👖 Брюки') {
        showCategoryItems(chatId, 'pants', '👖 Брюки');
    }
    else if (text === '🎒 Аксессуары') {
        showCategoryItems(chatId, 'accessories', '🎒 Аксессуары');
    }
    
    // Корзина
    else if (text === '➕ Добавить товар') {
        bot.sendMessage(chatId, 
            '🛍️ Выберите категорию для добавления товара:', 
            categoriesKeyboard
        );
    }
    
    else if (text === '🗑️ Очистить корзину') {
        clearCart(chatId);
        bot.sendMessage(chatId, 
            '🗑️ Корзина очищена!', 
            cartKeyboard
        );
    }
    
    else if (text === '🚀 Оформить заказ') {
        if (session.cart.length === 0) {
            bot.sendMessage(chatId, 
                '❌ Корзина пуста! Добавьте товары перед оформлением заказа.', 
                cartKeyboard
            );
        } else {
            startCheckout(chatId);
        }
    }
    
    // Поиск товаров
    else if (text && !text.startsWith('/') && !text.includes('🔙') && session.step === 'main') {
        searchProducts(chatId, text);
    }
});

// Показать товары категории
function showCategoryItems(chatId, category, categoryName) {
    const items = getItemsByCategory(category);
    
    if (items.length === 0) {
        bot.sendMessage(chatId, 
            `❌ В категории "${categoryName}" пока нет товаров.`,
            categoriesKeyboard
        );
        return;
    }
    
    bot.sendMessage(chatId, 
        `${categoryName}\\n\\n` +
        `Найдено товаров: ${items.length}`,
        { 
            parse_mode: 'Markdown',
            ...categoriesKeyboard 
        }
    );
    
    // Показываем первые 10 товаров
    const itemsToShow = items.slice(0, 10);
    itemsToShow.forEach((item, index) => {
        setTimeout(() => {
            showProductCard(chatId, item);
        }, index * 100); // Небольшая задержка между сообщениями
    });
}

// Показать бестселлеры
function showBestsellers(chatId) {
    const bestsellers = getBestsellers();
    
    bot.sendMessage(chatId, 
        `🔥 *Хиты продаж*\\n\\n` +
        `Самые популярные товары:`,
        { 
            parse_mode: 'Markdown',
            ...mainKeyboard 
        }
    );
    
    bestsellers.forEach((item, index) => {
        setTimeout(() => {
            showProductCard(chatId, item);
        }, index * 150);
    });
}

// Показать карточку товара
function showProductCard(chatId, item) {
    const finalPrice = item.price * (1 + MARKUP_PERCENTAGE / 100);
    
    const productText = 
        `🛍️ *${item.title}*\\n\\n` +
        `🏪 Продавец: ${item.seller}\\n` +
        `💰 Цена: ~$${item.price.toFixed(2)}~\\n` +
        `💎 **Итого: $${finalPrice.toFixed(2)}**\\n\\n` +
        `📝 ${item.description || 'Описание отсутствует'}`;
    
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🛒 Добавить в корзину', callback_data: `add_${item.id}` },
                    { text: '👁️ Подробнее', callback_data: `view_${item.id}` }
                ]
            ]
        }
    };
    
    bot.sendMessage(chatId, productText, { 
        parse_mode: 'Markdown',
        ...keyboard 
    });
}

// Обработка callback кнопок
bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const data = callbackQuery.data;
    const session = getUserSession(chatId);
    
    // Добавление товара в корзину
    if (data.startsWith('add_')) {
        const itemId = data.replace('add_', '');
        const item = getItemById(itemId);
        
        if (item) {
            // Показываем выбор размера
            bot.sendMessage(chatId, 
                `👕 Выберите размер для товара:\\n*${item.title}*`,
                { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: 'XS', callback_data: `addsize_${itemId}_XS` },
                                { text: 'S', callback_data: `addsize_${itemId}_S` },
                                { text: 'M', callback_data: `addsize_${itemId}_M` }
                            ],
                            [
                                { text: 'L', callback_data: `addsize_${itemId}_L` },
                                { text: 'XL', callback_data: `addsize_${itemId}_XL` },
                                { text: 'XXL', callback_data: `addsize_${itemId}_XXL` }
                            ]
                        ]
                    }
                }
            );
        }
    }
    
    // Добавление с размером
    else if (data.startsWith('addsize_')) {
        const [, itemId, size] = data.split('_');
        const item = getItemById(itemId);
        
        if (item) {
            addToCart(chatId, item, size, 1);
            bot.answerCallbackQuery(callbackQuery.id, {
                text: `✅ ${item.title} (${size}) добавлен в корзину!`,
                show_alert: false
            });
            
            // Обновляем сообщение
            bot.editMessageReplyMarkup(null, {
                chat_id: chatId,
                message_id: message.message_id
            });
        }
    }
    
    // Просмотр товара
    else if (data.startsWith('view_')) {
        const itemId = data.replace('view_', '');
        const item = getItemById(itemId);
        
        if (item) {
            const finalPrice = item.price * (1 + MARKUP_PERCENTAGE / 100);
            
            const detailText = 
                `📋 *Подробная информация*\\n\\n` +
                `🛍️ **${item.title}**\\n\\n` +
                `🏪 **Продавец:** ${item.seller}\\n` +
                `📂 **Категория:** ${item.category}\\n` +
                `⚖️ **Вес:** ${item.weight || 0.5} кг\\n\\n` +
                `💰 **Цена на Taobao:** $${item.price.toFixed(2)}\\n` +
                `💎 **Итоговая цена:** $${finalPrice.toFixed(2)}\\n` +
                `📈 **Наценка:** +${MARKUP_PERCENTAGE}%\\n\\n` +
                `📝 **Описание:**\\n${item.description || 'Описание отсутствует'}\\n\\n` +
                `🚚 Доставка рассчитывается отдельно`;
            
            bot.sendMessage(chatId, detailText, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🛒 Добавить в корзину', callback_data: `add_${item.id}` }]
                    ]
                }
            });
        }
    }
    
    // Удаление из корзины
    else if (data.startsWith('remove_')) {
        const [, itemId, size] = data.split('_');
        removeFromCart(chatId, itemId, size);
        
        bot.answerCallbackQuery(callbackQuery.id, {
            text: '🗑️ Товар удален из корзины',
            show_alert: false
        });
        
        // Обновляем корзину
        showCart(chatId);
    }
});

// Показать корзину
function showCart(chatId) {
    const session = getUserSession(chatId);
    
    if (session.cart.length === 0) {
        bot.sendMessage(chatId, 
            '🛒 *Ваша корзина пуста*\\n\\n' +
            'Добавьте товары из каталога!',
            { 
                parse_mode: 'Markdown',
                ...cartKeyboard 
            }
        );
        return;
    }
    
    let cartText = `🛒 *Ваша корзина*\\n\\n`;
    let totalItems = 0;
    
    session.cart.forEach((item, index) => {
        totalItems += item.quantity;
        cartText += 
            `${index + 1}\\. **${item.title}**\\n` +
            `   📏 Размер: ${item.size}\\n` +
            `   💰 $${item.finalPrice.toFixed(2)} × ${item.quantity} = $${(item.finalPrice * item.quantity).toFixed(2)}\\n\\n`;
    });
    
    cartText += 
        `📦 **Товаров:** ${totalItems} шт\\.\\n` +
        `💳 **Итого:** $${session.total.toFixed(2)}\\n\\n` +
        `🚚 _Стоимость доставки рассчитывается при оформлении заказа_`;
    
    // Кнопки для управления корзиной
    const cartButtons = [];
    session.cart.forEach((item) => {
        cartButtons.push([
            { 
                text: `🗑️ ${item.title} (${item.size})`, 
                callback_data: `remove_${item.id}_${item.size}` 
            }
        ]);
    });
    
    bot.sendMessage(chatId, cartText, {
        parse_mode: 'MarkdownV2',
        reply_markup: {
            inline_keyboard: cartButtons
        }
    });
    
    bot.sendMessage(chatId, 
        'Управление корзиной:', 
        cartKeyboard
    );
}

// Поиск товаров
function searchProducts(chatId, query) {
    const items = searchItems(query);
    
    if (items.length === 0) {
        bot.sendMessage(chatId, 
            `❌ По запросу "${query}" ничего не найдено.\\n\\n` +
            `Попробуйте другие ключевые слова или выберите категорию из меню.`,
            { 
                parse_mode: 'Markdown',
                ...mainKeyboard 
            }
        );
        return;
    }
    
    bot.sendMessage(chatId, 
        `🔍 **Результаты поиска: "${query}"**\\n\\n` +
        `Найдено товаров: ${items.length}`,
        { 
            parse_mode: 'Markdown',
            ...mainKeyboard 
        }
    );
    
    // Показываем первые 8 товаров
    const itemsToShow = items.slice(0, 8);
    itemsToShow.forEach((item, index) => {
        setTimeout(() => {
            showProductCard(chatId, item);
        }, index * 100);
    });
}

// Начать оформление заказа
function startCheckout(chatId) {
    const session = getUserSession(chatId);
    session.step = 'checkout_name';
    
    bot.sendMessage(chatId, 
        `🚀 *Оформление заказа*\\n\\n` +
        `📋 **Состав заказа:**\\n` +
        session.cart.map((item, index) => 
            `${index + 1}\\. ${item.title} \\(${item.size}\\) × ${item.quantity}`
        ).join('\\n') + '\\n\\n' +
        `💰 **Итого:** $${session.total.toFixed(2)}\\n\\n` +
        `👤 Для оформления заказа мне нужна информация\\. \\n\\n` +
        `Как вас зовут?`,
        { 
            parse_mode: 'MarkdownV2',
            reply_markup: {
                keyboard: [
                    ['❌ Отменить заказ']
                ],
                resize_keyboard: true
            }
        }
    );
}

// Показать заказы пользователя
function showUserOrders(chatId) {
    const orders = Object.values(userOrders).filter(order => order.userId === chatId);
    
    if (orders.length === 0) {
        bot.sendMessage(chatId, 
            '📋 У вас пока нет заказов\\n\\n' +
            'Оформите первый заказ в нашем каталоге\\!',
            { 
                parse_mode: 'MarkdownV2',
                ...mainKeyboard 
            }
        );
        return;
    }
    
    bot.sendMessage(chatId, 
        `📋 *Ваши заказы \\(${orders.length}\\)*`,
        { 
            parse_mode: 'MarkdownV2',
            ...mainKeyboard 
        }
    );
    
    orders.forEach((order, index) => {
        setTimeout(() => {
            const orderText = 
                `📦 **Заказ \\#${order.orderId}**\\n` +
                `📅 ${new Date(order.timestamp).toLocaleDateString('ru-RU')}\\n` +
                `💰 $${order.total.toFixed(2)}\\n` +
                `📊 Статус: ${getStatusEmoji(order.status)} ${getStatusText(order.status)}`;
            
            bot.sendMessage(chatId, orderText, { 
                parse_mode: 'MarkdownV2'
            });
        }, index * 200);
    });
}

function getStatusEmoji(status) {
    const statusEmojis = {
        'pending': '⏳',
        'confirmed': '✅',
        'processing': '🔄',
        'shipped': '🚚',
        'delivered': '📦',
        'cancelled': '❌'
    };
    return statusEmojis[status] || '❓';
}

function getStatusText(status) {
    const statusTexts = {
        'pending': 'Ожидает подтверждения',
        'confirmed': 'Подтвержден',
        'processing': 'В обработке',
        'shipped': 'Отправлен',
        'delivered': 'Доставлен',
        'cancelled': 'Отменен'
    };
    return statusTexts[status] || 'Неизвестно';
}

// Обработка этапов оформления заказа
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const session = getUserSession(chatId);
    
    if (text === '❌ Отменить заказ') {
        session.step = 'main';
        bot.sendMessage(chatId, 
            '❌ Оформление заказа отменено',
            mainKeyboard
        );
        return;
    }
    
    // Этапы оформления заказа
    if (session.step === 'checkout_name') {
        session.data.name = text;
        session.step = 'checkout_phone';
        
        bot.sendMessage(chatId, 
            `Отлично, ${text}! 👋\\n\\n` +
            `📱 Теперь укажите ваш номер телефона:`,
            { 
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    keyboard: [
                        ['❌ Отменить заказ']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }
    
    else if (session.step === 'checkout_phone') {
        session.data.phone = text;
        session.step = 'checkout_email';
        
        bot.sendMessage(chatId, 
            '📧 Укажите ваш email адрес:',
            {
                reply_markup: {
                    keyboard: [
                        ['❌ Отменить заказ']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }
    
    else if (session.step === 'checkout_email') {
        if (!text.includes('@')) {
            bot.sendMessage(chatId, 
                '❌ Неверный формат email\\. Попробуйте еще раз:',
                { parse_mode: 'MarkdownV2' }
            );
            return;
        }
        
        session.data.email = text;
        session.step = 'checkout_country';
        
        bot.sendMessage(chatId, 
            '🌍 В какую страну доставить заказ?\\n\\n' +
            'Укажите страну \\(например: Россия, Казахстан, США\\)',
            { 
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    keyboard: [
                        ['🇷🇺 Россия', '🇰🇿 Казахстан'],
                        ['🇺🇸 США', '🇩🇪 Германия'],
                        ['❌ Отменить заказ']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }
    
    else if (session.step === 'checkout_country') {
        session.data.country = text.replace(/🇷🇺|🇰🇿|🇺🇸|🇩🇪/g, '').trim();
        session.step = 'checkout_city';
        
        bot.sendMessage(chatId, 
            `🏙️ В какой город доставить заказ в стране "${session.data.country}"?`,
            {
                reply_markup: {
                    keyboard: [
                        ['❌ Отменить заказ']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }
    
    else if (session.step === 'checkout_city') {
        session.data.city = text;
        session.step = 'checkout_address';
        
        bot.sendMessage(chatId, 
            '🏠 Укажите полный адрес доставки:\\n\\n' +
            'Улица, дом, квартира, почтовый индекс',
            {
                reply_markup: {
                    keyboard: [
                        ['❌ Отменить заказ']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }
    
    else if (session.step === 'checkout_address') {
        session.data.address = text;
        session.step = 'main';
        
        // Создаем заказ
        const orderId = 'TG' + Date.now().toString().slice(-6);
        const order = {
            orderId,
            userId: chatId,
            items: [...session.cart],
            customerInfo: {
                name: session.data.name,
                phone: session.data.phone,
                email: session.data.email,
                country: session.data.country,
                city: session.data.city,
                address: session.data.address
            },
            subtotal: session.total,
            total: session.total, // TODO: добавить доставку
            status: 'pending',
            timestamp: new Date().toISOString(),
            source: 'telegram'
        };
        
        userOrders[orderId] = order;
        
        // Отправляем уведомление админу
        const adminMessage = 
            `🔥 *НОВЫЙ ЗАКАЗ TELEGRAM*\\n\\n` +
            `📦 **Заказ:** \\#${orderId}\\n` +
            `👤 **Клиент:** ${session.data.name}\\n` +
            `📱 **Телефон:** ${session.data.phone}\\n` +
            `📧 **Email:** ${session.data.email}\\n\\n` +
            `🌍 **Адрес:**\\n` +
            `${session.data.country}, ${session.data.city}\\n` +
            `${session.data.address}\\n\\n` +
            `🛍️ **Товары:**\\n` +
            session.cart.map((item, index) => 
                `${index + 1}\\. ${item.title} \\(${item.size}\\) × ${item.quantity} = $${(item.finalPrice * item.quantity).toFixed(2)}`
            ).join('\\n') + '\\n\\n' +
            `💰 **Итого:** $${session.total.toFixed(2)}\\n\\n` +
            `⏰ ${new Date().toLocaleString('ru-RU')}`;
        
        bot.sendMessage(ADMIN_CHAT_ID, adminMessage, { 
            parse_mode: 'MarkdownV2' 
        });
        
        // Подтверждение клиенту
        bot.sendMessage(chatId, 
            `✅ *Заказ успешно оформлен\\!*\\n\\n` +
            `📦 **Номер заказа:** \\#${orderId}\\n` +
            `💰 **Сумма:** $${session.total.toFixed(2)}\\n\\n` +
            `📞 **Что дальше?**\\n` +
            `1\\. Наш менеджер свяжется с вами в течение 24 часов\\n` +
            `2\\. Уточнит детали заказа и доставки\\n` +
            `3\\. Рассчитает точную стоимость доставки\\n` +
            `4\\. Пришлет реквизиты для оплаты\\n\\n` +
            `🙏 Спасибо за покупку в *GlobeWearZ*\\!`,
            { 
                parse_mode: 'MarkdownV2',
                ...mainKeyboard 
            }
        );
        
        // Очищаем корзину и данные
        clearCart(chatId);
        session.data = {};
    }
});

// Запуск бота
console.log('🤖 GlobeWearZ Telegram Bot запущен!');
console.log('📱 Bot Token:', BOT_TOKEN ? 'Настроен' : 'НЕ НАСТРОЕН');
console.log('👨‍💼 Admin Chat ID:', ADMIN_CHAT_ID);
console.log('💎 Наценка:', MARKUP_PERCENTAGE + '%');
console.log('🚀 Бот готов к работе!');

// Обработка ошибок
bot.on('error', (error) => {
    console.error('❌ Ошибка бота:', error);
});

bot.on('polling_error', (error) => {
    console.error('❌ Ошибка polling:', error);
});
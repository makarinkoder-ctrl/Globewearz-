// ===== GLOBAL VARIABLES =====
let sessionId = generateSessionId();
let cart = { items: [], total: 0 };
let allItems = [];
let categories = [];
let currentPage = 0;
const itemsPerPage = 12;
let deliveryMethods = [];
let selectedDeliveryMethod = 'standard';
let selectedAdditionalServices = [];
let deliveryCalculation = null;

// ===== UTILITY FUNCTIONS =====
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatPrice(price) {
    return `$${price.toFixed(2)}`;
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const icon = notification.querySelector('.notification-icon');
    const text = notification.querySelector('.notification-text');
    
    icon.textContent = type === 'success' ? '✅' : '❌';
    text.textContent = message;
    
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// ===== API FUNCTIONS =====
async function fetchCategories() {
    try {
        const response = await fetch('/api/categories');
        categories = await response.json();
        renderCategories();
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
    }
}

async function fetchBestsellers() {
    try {
        const response = await fetch('/api/bestsellers');
        const bestsellers = await response.json();
        renderProducts(bestsellers, 'bestsellers-grid');
    } catch (error) {
        console.error('Ошибка загрузки бестселлеров:', error);
    }
}

async function fetchItems(category = 'all', search = '', limit = null) {
    try {
        const params = new URLSearchParams();
        if (category !== 'all') params.append('category', category);
        if (search) params.append('search', search);
        if (limit) params.append('limit', limit);
        
        const response = await fetch(`/api/items?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const items = await response.json();
        console.log('✅ Товары получены:', items.length);
        return items;
    } catch (error) {
        console.error('❌ Ошибка загрузки товаров:', error);
        
        // Fallback - показываем статичные товары
        console.log('🔄 Используем резервные товары');
        return getFallbackItems();
    }
}

function getFallbackItems() {
    return [
        {
            id: 'nike-jordan-1',
            title: '👟 Nike Jordan 1 Retro High',
            price: 150,
            finalPrice: 195,
            category: 'sneakers',
            seller: 'Nike Official Store',
            description: 'Легендарные кроссовки Jordan 1 в классической расцветке'
        },
        {
            id: 'supreme-hoodie',
            title: '👕 Supreme Box Logo Hoodie',
            price: 200,
            finalPrice: 260,
            category: 'tops',
            seller: 'Supreme',
            description: 'Оригинальное худи от Supreme с культовым логотипом'
        },
        {
            id: 'off-white-tee',
            title: '👕 Off-White Arrows T-Shirt',
            price: 120,
            finalPrice: 156,
            category: 'tops',
            seller: 'Off-White',
            description: 'Стильная футболка с фирменным принтом стрелок'
        },
        {
            id: 'yeezy-350',
            title: '👟 Adidas Yeezy Boost 350',
            price: 220,
            finalPrice: 286,
            category: 'sneakers',
            seller: 'Adidas Yeezy',
            description: 'Популярные кроссовки от Kanye West'
        },
        {
            id: 'stone-island-jacket',
            title: '🧥 Stone Island Jacket',
            price: 300,
            finalPrice: 390,
            category: 'outerwear',
            seller: 'Stone Island',
            description: 'Премиальная куртка от итальянского бренда'
        },
        {
            id: 'palm-angels-pants',
            title: '👖 Palm Angels Track Pants',
            price: 180,
            finalPrice: 234,
            category: 'bottoms',
            seller: 'Palm Angels',
            description: 'Спортивные брюки с лампасами'
        },
        {
            id: 'bape-hoodie',
            title: '👕 BAPE Shark Hoodie',
            price: 250,
            finalPrice: 325,
            category: 'tops',
            seller: 'A Bathing Ape',
            description: 'Знаменитое худи с принтом акулы'
        },
        {
            id: 'travis-scott-jordan',
            title: '👟 Travis Scott x Jordan 1',
            price: 400,
            finalPrice: 520,
            category: 'sneakers',
            seller: 'Jordan Brand',
            description: 'Коллаборация с рэпером Travis Scott'
        },
        {
            id: 'cdg-shirt',
            title: '👕 Comme des Garçons Play',
            price: 100,
            finalPrice: 130,
            category: 'tops',
            seller: 'CDG',
            description: 'Футболка с культовым сердечком'
        },
        {
            id: 'lv-bag',
            title: '👜 Louis Vuitton Keepall',
            price: 800,
            finalPrice: 1040,
            category: 'bags',
            seller: 'Louis Vuitton',
            description: 'Легендарная дорожная сумка'
        }
    ];
}

// ===== CART FUNCTIONS =====
async function addToCart(id, size = 'M') {
    try {
        console.log('Добавляем в корзину:', id, size);
        
        const response = await fetch(`/api/cart/${sessionId}/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ itemId: id, size, quantity: 1 }),
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Ошибка API:', response.status, errorData);
            throw new Error(`HTTP ${response.status}: ${errorData}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        cart = data;
        updateCartDisplay();
        showNotification('Товар добавлен в корзину!', 'success');
        
        // Пересчитываем доставку если она уже была выбрана
        if (selectedDeliveryMethod) {
            await calculateCurrentDelivery();
        }
    } catch (error) {
        console.error('Ошибка добавления в корзину:', error);
        showNotification(`Ошибка: ${error.message}`, 'error');
    }
}

async function removeFromCart(id) {
    try {
        const response = await fetch(`/api/cart/${sessionId}/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id }),
        });
        
        const data = await response.json();
        cart = data;
        updateCartDisplay();
        showNotification('Товар удален из корзины', 'success');
        
        // Пересчитываем доставку после удаления товара
        if (selectedDeliveryMethod && cart.items.length > 0) {
            await calculateCurrentDelivery();
        } else if (cart.items.length === 0) {
            // Очищаем данные доставки если корзина пуста
            deliveryCalculation = null;
            selectedDeliveryMethod = null;
            selectedAdditionalServices = [];
            renderDeliverySummary(null);
        }
    } catch (error) {
        showNotification('Ошибка при удалении товара', 'error');
    }
}

async function loadCart() {
    try {
        const response = await fetch(`/api/cart/${sessionId}`);
        cart = await response.json();
        updateCartUI();
    } catch (error) {
        console.error('Ошибка загрузки корзины:', error);
    }
}

// ===== CHECKOUT FUNCTIONS =====
function openCheckout() {
    if (cart.items.length === 0) {
        showNotification('Корзина пуста!', 'error');
        return;
    }
    
    showModal('checkout-modal');
    
    // Очищаем предыдущие данные доставки
    clearDeliveryMethods();
}

async function submitOrder(event) {
    if (event) {
        event.preventDefault();
    }
    
    // Собираем данные из формы
    const customerInfo = {
        name: document.getElementById('customer-name').value.trim(),
        email: document.getElementById('customer-email').value.trim(),
        phone: document.getElementById('customer-phone').value.trim(),
        country: document.getElementById('delivery-country').value,
        region: document.getElementById('delivery-region').value.trim(),
        city: document.getElementById('delivery-city').value.trim(),
        postal: document.getElementById('delivery-postal').value.trim(),
        address: document.getElementById('delivery-address').value.trim(),
        delivery_notes: document.getElementById('delivery-notes').value.trim(),
        notes: document.getElementById('customer-notes').value.trim()
    };
    
    // Валидация обязательных полей
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || 
        !customerInfo.country || !customerInfo.city || !customerInfo.address) {
        showNotification('Пожалуйста, заполните все обязательные поля!', 'error');
        return;
    }
    
    // Проверяем, что адрес введен и доставка рассчитана
    if (!customerInfo.country || !customerInfo.city) {
        showNotification('Пожалуйста, укажите страну и город для расчета доставки!', 'error');
        return;
    }
    
    // Проверяем, что доставка рассчитана
    if (!deliveryCalculation || !deliveryCalculation.methods || deliveryCalculation.methods.length === 0) {
        showNotification('Сначала укажите адрес доставки, чтобы рассчитать стоимость!', 'error');
        return;
    }
    
    if (!selectedDeliveryMethod) {
        showNotification('Пожалуйста, выберите способ доставки из списка ниже!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId,
                customerInfo,
                deliveryMethod: selectedDeliveryMethod,
                additionalServices: selectedAdditionalServices
            }),
        });
        
        const result = await response.json();
        if (result.success) {
            cart = { items: [], total: 0 };
            deliveryCalculation = null;
            selectedDeliveryMethod = null;
            selectedAdditionalServices = [];
            
            updateCartUI();
            closeModal('checkout-modal');
            showOrderSuccess(result.orderId);
            
            // Очищаем форму
            document.getElementById('checkout-form').reset();
            clearDeliveryMethods();
        } else {
            throw new Error(result.error || 'Ошибка оформления заказа');
        }
    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        showNotification('Ошибка при оформлении заказа: ' + error.message, 'error');
    }
}

// ===== RENDER FUNCTIONS =====
function renderCategories() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;
    
    grid.innerHTML = categories.map(category => `
        <div class="category-card" onclick="filterByCategory('${category.id}')">
            <span class="category-icon">${category.icon}</span>
            <div class="category-name">${category.name}</div>
        </div>
    `).join('');
}

function renderProducts(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = products.map(product => `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image">
                <img src="${getProductImage(product)}" alt="${product.title}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="product-emoji-fallback" style="display: none;">
                    ${getProductEmoji(product.category)}
                </div>
                <div class="product-overlay">
                    <button class="btn-quick-view" onclick="showProductModal('${product.id}')">
                        👁️ Быстрый просмотр
                    </button>
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-seller">🏪 ${product.seller}</p>
                <div class="product-pricing">
                    <span class="original-price">${formatPrice(product.price)}</span>
                    <span class="final-price">${formatPrice(product.finalPrice)}</span>
                </div>
                <div class="product-actions">
                    <button class="btn-add-cart" onclick="showSizeModal('${product.id}')">
                        🛒 В корзину
                    </button>
                    <button class="btn-view-product" onclick="showProductModal('${product.id}')">
                        👁️
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function getProductImage(product) {
    // Генерируем красивые placeholder изображения на основе категории
    const imageCategories = {
        'outerwear': 'https://images.unsplash.com/photo-1551928831-16aca7cdf832?w=300&h=300&fit=crop&crop=center',
        'tops': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop&crop=center',
        'bottoms': 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=300&fit=crop&crop=center',
        'sneakers': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop&crop=center',
        'accessories': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop&crop=center',
        'jewelry': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop&crop=center',
        'bags': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop&crop=center'
    };
    
    // Если есть специфичное изображение для товара, используем его
    if (product.image) {
        return product.image;
    }
    
    // Иначе используем изображение по категории
    return imageCategories[product.category] || imageCategories['tops'];
}

function getProductEmoji(category) {
    const emojis = {
        hoodies: '🔥',
        sneakers: '⚡',
        tshirts: '🌟',
        accessories: '💎',
        jackets: '🧥',
        pants: '👖',
        bags: '🎒'
    };
    return emojis[category] || '🛍️';
}

function renderCart() {
    const cartItems = document.getElementById('cart-items');
    const cartFooter = document.getElementById('cart-footer');
    
    if (cart.items.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🛒</div>
                <h3>Корзина пуста</h3>
                <p>Добавьте товары из каталога</p>
                <button class="btn btn-primary" onclick="closeModal('cart-modal'); scrollToSection('catalog')">
                    🛍️ Перейти к покупкам
                </button>
            </div>
        `;
        cartFooter.innerHTML = '';
        return;
    }
    
    cartItems.innerHTML = cart.items.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">
                ${getProductEmoji(item.category)}
            </div>
            <div class="cart-item-info">
                <h4 class="cart-item-title">${item.title}</h4>
                <div class="cart-item-details">
                    <span class="cart-item-size">Размер: ${item.size}</span>
                    <div class="cart-item-price">${formatPrice(item.finalPrice)}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">−</button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                    </div>
                    <button class="remove-item-btn" onclick="removeFromCart('${item.id}')">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    cartFooter.innerHTML = `
        <div class="cart-total">
            <div class="cart-total-line">
                <span class="cart-total-label">Товары (${cart.items.reduce((sum, item) => sum + item.quantity, 0)} шт.):</span>
                <span class="cart-total-value">${formatPrice(cart.total)}</span>
            </div>
            <div class="cart-total-line cart-total-final">
                <span class="cart-total-label">Итого:</span>
                <span class="cart-total-value">${formatPrice(cart.total)}</span>
            </div>
        </div>
        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
            <button class="btn btn-secondary" onclick="clearCart()">
                🗑️ Очистить корзину
            </button>
            <button class="btn btn-primary" onclick="showCheckoutModal()">
                🚀 Оформить заказ
            </button>
        </div>
    `;
}

async function updateQuantity(itemId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(itemId);
        return;
    }
    
    try {
        const response = await fetch(`/api/cart/${sessionId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: itemId, quantity: newQuantity }),
        });
        
        const data = await response.json();
        cart = data;
        updateCartDisplay();
        
        // Пересчитываем доставку если она выбрана
        if (selectedDeliveryMethod) {
            await calculateCurrentDelivery();
        }
    } catch (error) {
        showNotification('Ошибка при обновлении количества', 'error');
    }
}

async function clearCart() {
    try {
        const response = await fetch(`/api/cart/${sessionId}/clear`, {
            method: 'POST',
        });
        
        const data = await response.json();
        cart = data;
        deliveryCalculation = null;
        selectedDeliveryMethod = null;
        selectedAdditionalServices = [];
        
        updateCartDisplay();
        renderDeliverySummary(null);
        showNotification('Корзина очищена', 'success');
    } catch (error) {
        showNotification('Ошибка при очистке корзины', 'error');
    }
}

function updateCartUI() {
    const cartCount = document.getElementById('cart-count');
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    if (totalItems > 0) {
        cartCount.style.display = 'inline-flex';
    } else {
        cartCount.style.display = 'none';
    }
}

function updateCartDisplay() {
    updateCartUI();
    
    // Если модальное окно корзины открыто, обновляем его содержимое
    const cartModal = document.getElementById('cart-modal');
    if (cartModal && cartModal.classList.contains('active')) {
        renderCart();
    }
}

// ===== MODAL FUNCTIONS =====
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Убираем active у всех других модалов
        document.querySelectorAll('.modal.active').forEach(m => {
            m.classList.remove('active');
        });
        
        // Добавляем класс active
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        console.error('Модальное окно не найдено:', modalId);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function showCartModal() {
    renderCart();
    showModal('cart-modal');
}

function showCheckoutModal() {
    closeModal('cart-modal');
    showModal('checkout-modal');
}

function showSizeModal(itemId) {
    const product = allItems.find(item => item.id === itemId);
    if (!product) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'size-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Выберите размер</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.style.overflow = 'auto';">&times;</button>
            </div>
            <div class="modal-body">
                <div class="product-preview">
                    <div class="product-emoji">${getProductEmoji(product.category)}</div>
                    <h4>${product.title}</h4>
                    <p class="product-price">${formatPrice(product.finalPrice)}</p>
                </div>
                <div class="size-selection">
                    <h5>Выберите размер:</h5>
                    <div class="size-options">
                        <button class="size-btn" onclick="selectSize('XS', '${product.id}')">XS</button>
                        <button class="size-btn" onclick="selectSize('S', '${product.id}')">S</button>
                        <button class="size-btn active" onclick="selectSize('M', '${product.id}')">M</button>
                        <button class="size-btn" onclick="selectSize('L', '${product.id}')">L</button>
                        <button class="size-btn" onclick="selectSize('XL', '${product.id}')">XL</button>
                        <button class="size-btn" onclick="selectSize('XXL', '${product.id}')">XXL</button>
                    </div>
                </div>
                <div class="add-to-cart-section">
                    <button class="btn btn-primary" onclick="addToCartWithSize('${product.id}', getSelectedSize())">
                        🛒 Добавить в корзину
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function selectSize(size, productId) {
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    window.selectedSize = size;
}

function getSelectedSize() {
    return window.selectedSize || 'M';
}

function addToCartWithSize(productId, size) {
    addToCart(productId, size);
    document.getElementById('size-modal')?.remove();
    document.body.style.overflow = 'auto';
}

function showProductModal(itemId) {
    const product = allItems.find(item => item.id === itemId);
    if (!product) return;
    
    const title = document.getElementById('product-modal-title');
    const body = document.getElementById('product-modal-body');
    
    title.textContent = product.title;
    body.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start;">
            <div>
                <div class="product-image" style="height: 300px; font-size: 4rem; margin-bottom: 1rem;">
                    ${getProductEmoji(product.category)}
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button class="btn btn-primary" onclick="addToCart('${product.id}'); closeModal('product-modal')">
                        🛒 Добавить в корзину
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal('product-modal')">
                        Закрыть
                    </button>
                </div>
            </div>
            <div>
                <h4 style="margin-bottom: 1rem;">Описание:</h4>
                <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem;">
                    ${product.description}
                </p>
                
                <div style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: 1rem; margin-bottom: 1rem;">
                    <h4 style="margin-bottom: 0.5rem;">💰 Цена:</h4>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="text-decoration: line-through; color: var(--text-secondary);">
                            ${formatPrice(product.price)}
                        </span>
                        <span style="font-size: 1.5rem; font-weight: 700; color: var(--accent-color);">
                            ${formatPrice(product.finalPrice)}
                        </span>
                    </div>
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        Цена включает доставку и проверку качества
                    </p>
                </div>
                
                <div style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: 1rem;">
                    <h4 style="margin-bottom: 0.5rem;">🏪 Продавец:</h4>
                    <p>${product.seller}</p>
                    ${product.tags ? `
                        <h4 style="margin: 1rem 0 0.5rem 0;">🏷️ Теги:</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${product.tags.map(tag => `
                                <span style="background: var(--bg-secondary); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">
                                    ${tag}
                                </span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    showModal('product-modal');
}

function showOrderSuccess(orderId) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-body" style="text-align: center; padding: 3rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                <h2 style="margin-bottom: 1rem; color: var(--accent-color);">Заказ оформлен!</h2>
                <p style="font-size: 1.25rem; margin-bottom: 1rem;">
                    Номер заказа: <strong>${orderId}</strong>
                </p>
                <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                    Менеджер свяжется с вами в ближайшее время для подтверждения деталей заказа.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove(); scrollToSection('catalog')">
                        🛍️ Продолжить покупки
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        if (modal.parentNode) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    }, 10000);
}

// ===== DELIVERY FUNCTIONS =====
async function updateDeliveryCalculation() {
    const country = document.getElementById('delivery-country').value;
    const region = document.getElementById('delivery-region').value;
    const city = document.getElementById('delivery-city').value;
    const postal = document.getElementById('delivery-postal').value;
    const address = document.getElementById('delivery-address').value;
    
    if (!country || !city) {
        clearDeliveryMethods();
        return;
    }
    
    showDeliveryLoading(true);
    
    try {
        const fullAddress = {
            countryCode: country,
            country: getCountryName(country),
            region: region,
            city: city,
            postal: postal,
            address: address
        };
        
        const response = await fetch(`/api/delivery/calculate-by-address/${sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                address: fullAddress,
                additionalServices: selectedAdditionalServices 
            }),
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification(data.error, 'error');
            clearDeliveryMethods();
            return;
        }
        
        deliveryCalculation = data;
        renderDeliveryMethods(data.methods, data.recommendedMethod, data.additionalServices);
        
        // Устанавливаем рекомендуемый метод по умолчанию
        if (data.methods && data.methods.length > 0) {
            const recommendedMethod = data.methods.find(m => m.id === 'express') || data.methods[0];
            selectedDeliveryMethod = recommendedMethod.id;
            selectDeliveryMethod(recommendedMethod.id);
        }
        
        await calculateCurrentDelivery();
        
    } catch (error) {
        console.error('Ошибка расчета доставки:', error);
        showNotification('Ошибка при расчете доставки', 'error');
        clearDeliveryMethods();
    } finally {
        showDeliveryLoading(false);
    }
}

function showDeliveryLoading(show) {
    const loadingElement = document.getElementById('delivery-loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}

function clearDeliveryMethods() {
    document.getElementById('delivery-methods').innerHTML = '';
    document.getElementById('additional-services').innerHTML = '';
    document.getElementById('delivery-summary').innerHTML = '';
    deliveryCalculation = null;
    selectedDeliveryMethod = null;
    selectedAdditionalServices = [];
}

function getCountryName(countryCode) {
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

async function loadDeliveryMethods() {
    // Эта функция теперь заменена на updateDeliveryCalculation
    // Оставляем для совместимости
    await updateDeliveryCalculation();
}

function renderDeliveryMethods(methods, recommended, additionalServices) {
    const container = document.getElementById('delivery-methods');
    const hint = document.querySelector('.delivery-hint');
    
    if (!methods || methods.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">📍 Укажите страну и город доставки для расчета стоимости</p>';
        if (hint) hint.style.display = 'block';
        return;
    }
    
    // Скрываем подсказку когда есть методы доставки
    if (hint) hint.style.display = 'none';
    
    container.innerHTML = methods.map(method => `
        <div class="delivery-method ${method.id === recommended?.id ? 'recommended' : ''} ${method.id === selectedDeliveryMethod ? 'selected' : ''}" 
             onclick="selectDeliveryMethod('${method.id}')">
            <div class="delivery-method-header">
                <div class="delivery-method-name">
                    <span>${method.icon}</span>
                    <span>${method.name}</span>
                    ${method.id === recommended?.id ? '<span class="recommended-badge">Рекомендуется</span>' : ''}
                </div>
                <div class="delivery-method-price">$${method.cost.toFixed(2)}</div>
            </div>
            <div class="delivery-method-details">${method.description}</div>
            <div class="delivery-method-info">
                <span class="delivery-weight">📦 ${method.weight.toFixed(1)} кг</span>
                <span class="delivery-time">⏱️ ${method.deliveryTime}</span>
                <span class="delivery-zone">🌍 ${method.zone}</span>
            </div>
        </div>
    `).join('');
    
    // Рендерим дополнительные услуги
    const servicesContainer = document.getElementById('additional-services');
    if (additionalServices) {
        servicesContainer.innerHTML = Object.keys(additionalServices).map(serviceId => {
            const service = additionalServices[serviceId];
            return `
                <div class="service-option">
                    <input type="checkbox" id="service-${serviceId}" value="${serviceId}" 
                           onchange="toggleAdditionalService('${serviceId}')"
                           ${selectedAdditionalServices.includes(serviceId) ? 'checked' : ''}>
                    <div class="service-info">
                        <div class="service-name">
                            <span>${service.icon}</span>
                            <span>${service.name}</span>
                        </div>
                        <div class="service-description">${service.description}</div>
                    </div>
                    <div class="service-price">+$${service.cost.toFixed(2)}</div>
                </div>
            `;
        }).join('');
    }
}

function selectDeliveryMethod(methodId) {
    selectedDeliveryMethod = methodId;
    
    // Обновляем визуальное выделение
    document.querySelectorAll('.delivery-method').forEach(el => {
        el.classList.remove('selected');
    });
    
    document.querySelector(`[onclick="selectDeliveryMethod('${methodId}')"]`)?.classList.add('selected');
    
    // Пересчитываем доставку
    calculateCurrentDelivery();
}

function toggleAdditionalService(serviceId) {
    const checkbox = document.getElementById(`service-${serviceId}`);
    
    if (checkbox.checked) {
        if (!selectedAdditionalServices.includes(serviceId)) {
            selectedAdditionalServices.push(serviceId);
        }
    } else {
        selectedAdditionalServices = selectedAdditionalServices.filter(id => id !== serviceId);
    }
    
    // Пересчитываем доставку
    calculateCurrentDelivery();
}

async function calculateCurrentDelivery() {
    if (!selectedDeliveryMethod || !deliveryCalculation) {
        return;
    }
    
    try {
        // Находим выбранный метод доставки
        const selectedMethod = deliveryCalculation.methods.find(m => m.id === selectedDeliveryMethod);
        if (!selectedMethod) {
            return;
        }
        
        // Рассчитываем стоимость дополнительных услуг
        let additionalCost = 0;
        let selectedServices = [];
        
        if (selectedAdditionalServices.length > 0 && deliveryCalculation.additionalServices) {
            for (const serviceId of selectedAdditionalServices) {
                const service = deliveryCalculation.additionalServices[serviceId];
                if (service) {
                    selectedServices.push({
                        id: serviceId,
                        icon: service.icon,
                        name: service.name,
                        cost: service.cost
                    });
                    additionalCost += service.cost;
                }
            }
        }
        
        const calculationResult = {
            method: selectedMethod,
            baseCost: selectedMethod.cost,
            selectedServices: selectedServices,
            additionalCost: additionalCost,
            totalCost: selectedMethod.cost + additionalCost,
            deliveryInfo: deliveryCalculation.deliveryInfo || {}
        };
        
        deliveryCalculation.currentCalculation = calculationResult;
        renderDeliverySummary(calculationResult);
        
    } catch (error) {
        console.error('Ошибка расчета доставки:', error);
    }
}

function renderDeliverySummary(calculation) {
    const container = document.getElementById('delivery-summary');
    
    if (!calculation || calculation.error) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Выберите метод доставки</p>';
        return;
    }
    
    let html = `
        <h5>📋 Итого по доставке</h5>
        <div class="delivery-total-line">
            <span class="delivery-total-label">Товары:</span>
            <span class="delivery-total-value">$${cart.total.toFixed(2)}</span>
        </div>
        <div class="delivery-total-line">
            <span class="delivery-total-label">${calculation.method.name}:</span>
            <span class="delivery-total-value">$${calculation.baseCost.toFixed(2)}</span>
        </div>
    `;
    
    if (calculation.selectedServices && calculation.selectedServices.length > 0) {
        calculation.selectedServices.forEach(service => {
            html += `
                <div class="delivery-total-line">
                    <span class="delivery-total-label">${service.icon} ${service.name}:</span>
                    <span class="delivery-total-value">$${service.cost.toFixed(2)}</span>
                </div>
            `;
        });
    }
    
    // Добавляем информацию о доставке
    if (calculation.deliveryInfo) {
        html += `
            <div class="delivery-info-section">
                <div class="delivery-info-line">
                    <span class="delivery-info-label">🌍 Страна:</span>
                    <span class="delivery-info-value">${calculation.deliveryInfo.country || 'Не указана'}</span>
                </div>
                <div class="delivery-info-line">
                    <span class="delivery-info-label">📦 Общий вес:</span>
                    <span class="delivery-info-value">${calculation.method.weight.toFixed(1)} кг</span>
                </div>
                <div class="delivery-info-line">
                    <span class="delivery-info-label">⏱️ Срок доставки:</span>
                    <span class="delivery-info-value">${calculation.method.deliveryTime}</span>
                </div>
            </div>
        `;
    }
    
    html += `
        <div class="delivery-total-line final">
            <span class="delivery-total-label">ИТОГО К ОПЛАТЕ:</span>
            <span class="delivery-total-value final">$${(cart.total + calculation.totalCost).toFixed(2)}</span>
        </div>
    `;
    
    container.innerHTML = html;
}
async function updateQuantity(itemId, newQuantity) {
    if (newQuantity <= 0) {
        await removeFromCart(itemId);
        return;
    }
    
    const item = cart.items.find(item => item.id === itemId);
    if (item) {
        const difference = newQuantity - item.quantity;
        if (difference > 0) {
            await addToCart(itemId, difference);
        } else {
            // Для упрощения просто перезагружаем корзину
            await loadCart();
        }
    }
}

async function clearCart() {
    try {
        const response = await fetch(`/api/cart/${sessionId}/clear`, {
            method: 'DELETE',
        });
        
        const result = await response.json();
        if (result.success) {
            cart = { items: [], total: 0 };
            updateCartUI();
            renderCart();
            showNotification('Корзина очищена');
        }
    } catch (error) {
        console.error('Ошибка очистки корзины:', error);
    }
}

// ===== CATALOG FUNCTIONS =====
async function filterByCategory(categoryId) {
    const items = await fetchItems(categoryId);
    allItems = items;
    renderProducts(items, 'catalog-grid');
    scrollToSection('catalog');
    
    // Обновляем селект категорий
    const categoryFilter = document.getElementById('category-filter');
    categoryFilter.value = categoryId;
}

async function searchItems(query) {
    const items = await fetchItems('all', query);
    allItems = items;
    renderProducts(items, 'catalog-grid');
    
    if (items.length === 0) {
        document.getElementById('catalog-grid').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                <h3>Ничего не найдено</h3>
                <p style="color: var(--text-secondary);">Попробуйте изменить поисковый запрос</p>
            </div>
        `;
    }
}

function sortProducts(sortType) {
    let sortedItems = [...allItems];
    
    switch (sortType) {
        case 'price-asc':
            sortedItems.sort((a, b) => a.finalPrice - b.finalPrice);
            break;
        case 'price-desc':
            sortedItems.sort((a, b) => b.finalPrice - a.finalPrice);
            break;
        case 'name':
            sortedItems.sort((a, b) => a.title.localeCompare(b.title));
            break;
        default:
            // По умолчанию
            break;
    }
    
    renderProducts(sortedItems, 'catalog-grid');
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Инициализация приложения...');
    
    // Инициализация
    await loadCart();
    console.log('✅ Корзина загружена');
    
    await fetchCategories();
    console.log('✅ Категории загружены:', categories);
    
    await fetchBestsellers();
    console.log('✅ Хиты продаж загружены');
    
    // Загружаем каталог
    console.log('📦 Загружаем каталог товаров...');
    allItems = await fetchItems();
    console.log('✅ Товары загружены:', allItems.length, 'шт.');
    
    if (allItems.length > 0) {
        renderProducts(allItems, 'catalog-grid');
        console.log('✅ Товары отображены в каталоге');
    } else {
        console.error('❌ Товары не загружены!');
        // Показываем сообщение об ошибке
        const catalogGrid = document.getElementById('catalog-grid');
        if (catalogGrid) {
            catalogGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <h3>😔 Товары временно недоступны</h3>
                    <p>Попробуйте обновить страницу</p>
                    <button class="btn btn-primary" onclick="location.reload()">🔄 Обновить</button>
                </div>
            `;
        }
    }
    
    // Заполняем селект категорий
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter && categories.length > 0) {
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = `${category.icon} ${category.name}`;
            categoryFilter.appendChild(option);
        });
        console.log('✅ Фильтр категорий заполнен');
    }
    
    // Поиск
    const searchInput = document.getElementById('search-input');
    const searchIcon = document.querySelector('.search-icon');
    
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (this.value.trim()) {
                searchItems(this.value.trim());
                scrollToSection('catalog');
            } else {
                filterByCategory('all');
            }
        }, 500);
    });
    
    searchIcon.addEventListener('click', function() {
        const query = searchInput.value.trim();
        if (query) {
            searchItems(query);
            scrollToSection('catalog');
        }
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
                searchItems(query);
                scrollToSection('catalog');
            }
        }
    });
    
    // Корзина
    const cartBtn = document.getElementById('cart-btn');
    cartBtn.addEventListener('click', function() {
        showCartModal();
    });
    
    // Фильтры каталога
    categoryFilter.addEventListener('change', function() {
        filterByCategory(this.value);
    });
    
    document.getElementById('sort-filter').addEventListener('change', function() {
        sortProducts(this.value);
    });
    
    // Модальные окна
    document.getElementById('close-cart').addEventListener('click', () => closeModal('cart-modal'));
    document.getElementById('close-checkout').addEventListener('click', () => closeModal('checkout-modal'));
    document.getElementById('close-product').addEventListener('click', () => closeModal('product-modal'));
    document.getElementById('back-to-cart').addEventListener('click', () => {
        closeModal('checkout-modal');
        showCartModal();
    });
    
    // Закрытие модалов по клику вне области
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
    
    // Форма заказа
    document.getElementById('checkout-form').addEventListener('submit', function(e) {
        e.preventDefault();
        submitOrder(e);
    });
    
    // Навигация
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            scrollToSection(sectionId);
            
            // Обновляем активный пункт меню
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Мобильное меню
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    navToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
    });
    
    // Кнопка "Загрузить еще"
    document.getElementById('load-more-btn').addEventListener('click', async function() {
        const moreItems = await fetchItems('all', '', 12);
        if (moreItems.length > 0) {
            allItems = [...allItems, ...moreItems];
            renderProducts(allItems, 'catalog-grid');
        } else {
            this.style.display = 'none';
            showNotification('Все товары загружены');
        }
    });
});

// Плавная прокрутка при загрузке страницы
window.addEventListener('load', function() {
    if (window.location.hash) {
        setTimeout(() => {
            const element = document.querySelector(window.location.hash);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    }
});

// ===== UTILITY FUNCTIONS =====
function formatPrice(price) {
    return `$${price.toFixed(2)}`;
}

function getProductEmoji(category) {
    const emojis = {
        'outerwear': '🧥',
        'tops': '👕', 
        'bottoms': '👖',
        'sneakers': '👟',
        'accessories': '🎒',
        'jewelry': '💍',
        'bags': '👜',
        'default': '👕'
    };
    return emojis[category] || emojis.default;
}

function showOrderSuccess(orderId) {
    showNotification(`Заказ #${orderId} успешно оформлен! Мы свяжемся с вами в ближайшее время.`, 'success');
}

function showNotification(message, type = 'info') {
    // Удаляем предыдущие уведомления
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Показываем уведомление
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Скрываем через 4 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 4000);
}
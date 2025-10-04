// Расширенный каталог товаров для GlobeWearZ
// В будущем это можно заменить на реальный API Taobao

const extendedTaobaoItems = [
    // ХУДИ И СВИТШОТЫ
    {
        id: 'tb_hoodie_001',
        title: '🔥 Essentials Fear of God Hoodie Oversized',
        price: 42.99,
        image: 'https://via.placeholder.com/400x400?text=FOG+Hoodie+Black',
        description: 'Премиум худи в стиле Fear of God Essentials. Оверсайз крой, тяжелый хлопок 380г/м². Размеры S-XXL. Цвета: черный, серый, бежевый.',
        category: 'hoodies',
        seller: 'Supreme Store CN',
        tags: ['fog', 'essentials', 'oversized', 'premium'],
        inStock: true,
        colors: ['black', 'grey', 'beige'],
        sizes: ['S', 'M', 'L', 'XL', 'XXL']
    },
    {
        id: 'tb_hoodie_002',
        title: '⚡ Stussy World Tour Hoodie Vintage',
        price: 38.50,
        image: 'https://via.placeholder.com/400x400?text=Stussy+Hoodie',
        description: 'Винтажное худи Stussy с принтом World Tour. Мягкий флис внутри. Лимитированная коллекция.',
        category: 'hoodies',
        seller: 'Streetwear Hub',
        tags: ['stussy', 'vintage', 'world tour', 'fleece'],
        inStock: true,
        colors: ['black', 'white', 'navy'],
        sizes: ['S', 'M', 'L', 'XL']
    },
    {
        id: 'tb_hoodie_003',
        title: '🌟 Chrome Hearts Cross Hoodie',
        price: 55.99,
        image: 'https://via.placeholder.com/400x400?text=Chrome+Hearts+Hoodie',
        description: 'Эксклюзивное худи Chrome Hearts с вышитым крестом. Премиум качество, лимитированный тираж.',
        category: 'hoodies',
        seller: 'Luxury Streetwear',
        tags: ['chrome hearts', 'cross', 'embroidered', 'limited'],
        inStock: true,
        colors: ['black', 'grey'],
        sizes: ['M', 'L', 'XL']
    },

    // КРОССОВКИ
    {
        id: 'tb_sneakers_001',
        title: '👑 Nike Jordan 1 Retro High Chicago',
        price: 89.99,
        image: 'https://via.placeholder.com/400x400?text=Jordan+1+Chicago',
        description: 'Легендарные кроссовки Jordan 1 в классической расцветке Chicago. Кожа премиум класса. Размеры 36-46.',
        category: 'sneakers',
        seller: 'Air Force Store',
        tags: ['jordan', 'chicago', 'retro', 'leather'],
        inStock: true,
        colors: ['white/red/black'],
        sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
    },
    {
        id: 'tb_sneakers_002',
        title: '🚀 Nike Dunk Low Panda',
        price: 67.50,
        image: 'https://via.placeholder.com/400x400?text=Dunk+Panda',
        description: 'Популярные Nike Dunk Low в расцветке Panda. Белая кожа с черными вставками. Must-have сезона.',
        category: 'sneakers',
        seller: 'Sneaker Kingdom',
        tags: ['dunk', 'panda', 'white', 'black'],
        inStock: true,
        colors: ['white/black'],
        sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']
    },
    {
        id: 'tb_sneakers_003',
        title: '💎 Yeezy 350 V2 Zebra',
        price: 95.00,
        image: 'https://via.placeholder.com/400x400?text=Yeezy+Zebra',
        description: 'Культовые Yeezy 350 V2 в расцветке Zebra. Primeknit верх, технология Boost. Размеры в наличии.',
        category: 'sneakers',
        seller: 'Yeezy Central',
        tags: ['yeezy', 'zebra', 'boost', 'primeknit'],
        inStock: true,
        colors: ['white/black'],
        sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']
    },

    // ФУТБОЛКИ
    {
        id: 'tb_tshirt_001',
        title: '🌟 Off-White Arrows Tee',
        price: 28.99,
        image: 'https://via.placeholder.com/400x400?text=Off-White+Arrows',
        description: 'Iconic футболка Off-White с принтом стрел. 100% хлопок премиум качества. Оверсайз крой.',
        category: 'tshirts',
        seller: 'Designer Zone',
        tags: ['off-white', 'arrows', 'oversized', 'cotton'],
        inStock: true,
        colors: ['black', 'white'],
        sizes: ['S', 'M', 'L', 'XL', 'XXL']
    },
    {
        id: 'tb_tshirt_002',
        title: '⚡ Travis Scott Astroworld Tee',
        price: 32.50,
        image: 'https://via.placeholder.com/400x400?text=Astroworld+Tee',
        description: 'Футболка с мерча тура Astroworld Трэвиса Скотта. Винтажная обработка, мягкий хлопок.',
        category: 'tshirts',
        seller: 'Music Merch Store',
        tags: ['travis scott', 'astroworld', 'vintage', 'tour'],
        inStock: true,
        colors: ['black', 'brown'],
        sizes: ['S', 'M', 'L', 'XL']
    },
    {
        id: 'tb_tshirt_003',
        title: '💫 Kanye West Yeezus Tour Tee',
        price: 29.99,
        image: 'https://via.placeholder.com/400x400?text=Yeezus+Tour',
        description: 'Редкая футболка с тура Yeezus Канье Уэста. Gothik шрифт, дистресс эффект.',
        category: 'tshirts',
        seller: 'Vintage Merch',
        tags: ['kanye west', 'yeezus', 'gothic', 'distressed'],
        inStock: true,
        colors: ['black'],
        sizes: ['M', 'L', 'XL']
    },

    // АКСЕССУАРЫ
    {
        id: 'tb_acc_001',
        title: '💎 Chrome Hearts Cross Chain',
        price: 45.00,
        image: 'https://via.placeholder.com/400x400?text=Chrome+Hearts+Chain',
        description: 'Массивная цепь Chrome Hearts с подвеской-крестом. Серебристый металл, регулируемая длина.',
        category: 'accessories',
        seller: 'Luxury Accessories CN',
        tags: ['chrome hearts', 'chain', 'cross', 'silver'],
        inStock: true,
        colors: ['silver'],
        sizes: ['onesize']
    },
    {
        id: 'tb_acc_002',
        title: '🔥 Off-White Industrial Belt',
        price: 36.99,
        image: 'https://via.placeholder.com/400x400?text=Off-White+Belt',
        description: 'Знаменитый ремень Off-White с желтой лентой и металлической пряжкой. Длина 200см.',
        category: 'accessories',
        seller: 'Designer Zone',
        tags: ['off-white', 'belt', 'yellow', 'industrial'],
        inStock: true,
        colors: ['yellow', 'white'],
        sizes: ['onesize']
    },
    {
        id: 'tb_acc_003',
        title: '👑 Stone Island Compass Badge Beanie',
        price: 22.50,
        image: 'https://via.placeholder.com/400x400?text=Stone+Island+Beanie',
        description: 'Шапка Stone Island с фирменным компасом. Мягкая шерсть, универсальный размер.',
        category: 'accessories',
        seller: 'Italian Fashion',
        tags: ['stone island', 'beanie', 'compass', 'wool'],
        inStock: true,
        colors: ['black', 'navy', 'grey'],
        sizes: ['onesize']
    },

    // ДОПОЛНИТЕЛЬНЫЕ ТОВАРЫ
    {
        id: 'tb_jacket_001',
        title: '🌪️ Carhartt WIP Detroit Jacket',
        price: 78.99,
        image: 'https://via.placeholder.com/400x400?text=Carhartt+Detroit',
        description: 'Классическая рабочая куртка Carhartt Detroit в стиле workwear. Плотный канвас, подкладка.',
        category: 'jackets',
        seller: 'Workwear Pro',
        tags: ['carhartt', 'detroit', 'workwear', 'canvas'],
        inStock: true,
        colors: ['black', 'brown', 'navy'],
        sizes: ['S', 'M', 'L', 'XL']
    },
    {
        id: 'tb_pants_001',
        title: '🔥 Gallery Dept. Carpenter Jeans',
        price: 52.99,
        image: 'https://via.placeholder.com/400x400?text=Gallery+Dept+Jeans',
        description: 'Джинсы Gallery Dept в стиле carpenter с потертостями и заплатками. Винтажная обработка.',
        category: 'pants',
        seller: 'Vintage Denim',
        tags: ['gallery dept', 'carpenter', 'vintage', 'distressed'],
        inStock: true,
        colors: ['blue', 'black'],
        sizes: ['28', '30', '32', '34', '36']
    },
    {
        id: 'tb_bag_001',
        title: '💼 Supreme Shoulder Bag Red',
        price: 41.50,
        image: 'https://via.placeholder.com/400x400?text=Supreme+Bag',
        description: 'Сумка Supreme через плечо в классическом красном цвете. Водонепроницаемый материал.',
        category: 'bags',
        seller: 'Supreme Store CN',
        tags: ['supreme', 'shoulder bag', 'red', 'waterproof'],
        inStock: true,
        colors: ['red', 'black'],
        sizes: ['onesize']
    }
];

// Функция поиска товаров
function searchItems(query, category = null) {
    let filteredItems = extendedTaobaoItems;
    
    if (category && category !== 'all') {
        filteredItems = filteredItems.filter(item => item.category === category);
    }
    
    if (query) {
        const searchQuery = query.toLowerCase();
        filteredItems = filteredItems.filter(item => 
            item.title.toLowerCase().includes(searchQuery) ||
            item.description.toLowerCase().includes(searchQuery) ||
            item.tags.some(tag => tag.toLowerCase().includes(searchQuery))
        );
    }
    
    return filteredItems;
}

// Функция получения товара по ID
function getItemById(itemId) {
    return extendedTaobaoItems.find(item => item.id === itemId);
}

// Функция получения случайных товаров
function getRandomItems(count = 5) {
    const shuffled = [...extendedTaobaoItems].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Функция получения товаров по категории
function getItemsByCategory(category) {
    return extendedTaobaoItems.filter(item => item.category === category);
}

// Функция получения бестселлеров (топ товары)
function getBestsellers(count = 6) {
    // В реальном приложении здесь была бы статистика продаж
    const bestsellersIds = ['tb_sneakers_001', 'tb_hoodie_001', 'tb_tshirt_001', 'tb_acc_002', 'tb_sneakers_002', 'tb_hoodie_002'];
    return bestsellersIds.map(id => getItemById(id)).filter(item => item).slice(0, count);
}

// Экспорт функций
module.exports = {
    extendedTaobaoItems,
    searchItems,
    getItemById,
    getRandomItems,
    getItemsByCategory,
    getBestsellers
};
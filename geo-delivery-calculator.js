// ===== СИСТЕМА ГЕОГРАФИЧЕСКОГО РАСЧЕТА ДОСТАВКИ =====

// Базовые координаты складов в Китае (средние координаты основных торговых центров)
const CHINA_WAREHOUSES = {
    primary: { lat: 31.2304, lng: 121.4737, name: "Shanghai" }, // Шанхай
    secondary: { lat: 23.1291, lng: 113.2644, name: "Guangzhou" }, // Гуанчжоу
    tertiary: { lat: 39.9042, lng: 116.4074, name: "Beijing" } // Пекин
};

// Тарифы доставки по зонам (USD за 1кг)
const DELIVERY_ZONES = {
    zone1: { // Азия - близко к Китаю
        countries: ['RU', 'KZ', 'KG', 'UZ', 'TJ', 'MN', 'KP', 'KR', 'JP', 'VN', 'TH', 'MY', 'SG', 'PH', 'ID', 'LA', 'KH', 'MM'],
        baseRate: 8,
        expressRate: 15,
        premiumRate: 25,
        deliveryTime: {
            economy: "12-20 дней",
            express: "7-12 дней", 
            premium: "3-7 дней"
        }
    },
    zone2: { // Европа и Ближний Восток
        countries: ['BY', 'UA', 'MD', 'GE', 'AM', 'AZ', 'TR', 'DE', 'FR', 'IT', 'ES', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'EE', 'LV', 'LT', 'IE', 'GB', 'PT', 'MT', 'CY', 'LU', 'SI', 'HR', 'BA', 'RS', 'ME', 'MK', 'AL', 'IL', 'PS', 'JO', 'LB', 'SY', 'IQ', 'IR', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE', 'EG', 'LY', 'TN', 'DZ', 'MA', 'SD'],
        baseRate: 12,
        expressRate: 22,
        premiumRate: 35,
        deliveryTime: {
            economy: "15-25 дней",
            express: "8-15 дней",
            premium: "4-8 дней"
        }
    },
    zone3: { // Северная Америка
        countries: ['US', 'CA', 'MX', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA'],
        baseRate: 15,
        expressRate: 28,
        premiumRate: 45,
        deliveryTime: {
            economy: "18-30 дней",
            express: "10-18 дней",
            premium: "5-10 дней"
        }
    },
    zone4: { // Южная Америка и Африка
        countries: ['BR', 'AR', 'CL', 'PE', 'CO', 'VE', 'EC', 'BO', 'PY', 'UY', 'GY', 'SR', 'GF', 'ZA', 'NG', 'EG', 'KE', 'UG', 'TZ', 'RW', 'BI', 'CD', 'CG', 'CM', 'CF', 'TD', 'NE', 'BF', 'ML', 'SN', 'GN', 'SL', 'LR', 'CI', 'GH', 'TG', 'BJ', 'NG', 'GA', 'GQ', 'ST', 'AO', 'ZM', 'ZW', 'BW', 'LS', 'SZ', 'MZ', 'MW', 'MG', 'MU', 'SC', 'KM', 'ET', 'ER', 'DJ', 'SO', 'SS'],
        baseRate: 18,
        expressRate: 32,
        premiumRate: 50,
        deliveryTime: {
            economy: "20-35 дней",
            express: "12-22 дней",
            premium: "6-12 дней"
        }
    },
    zone5: { // Океания и отдаленные территории
        countries: ['AU', 'NZ', 'PG', 'FJ', 'SB', 'NC', 'VU', 'WS', 'TO', 'TV', 'NR', 'KI', 'PW', 'FM', 'MH'],
        baseRate: 20,
        expressRate: 35,
        premiumRate: 55,
        deliveryTime: {
            economy: "22-40 дней",
            express: "14-25 дней",
            premium: "7-14 дней"
        }
    }
};

// Специальные тарифы для популярных стран
const SPECIAL_RATES = {
    'RU': { // Россия - особые тарифы
        baseRate: 6,
        expressRate: 12,
        premiumRate: 20,
        deliveryTime: {
            economy: "10-18 дней",
            express: "5-10 дней",
            premium: "3-6 дней"
        }
    },
    'US': { // США - высокий спрос
        baseRate: 14,
        expressRate: 26,
        premiumRate: 42,
        deliveryTime: {
            economy: "16-28 дней",
            express: "9-16 дней",
            premium: "4-9 дней"
        }
    },
    'DE': { // Германия - европейский хаб
        baseRate: 10,
        expressRate: 19,
        premiumRate: 30,
        deliveryTime: {
            economy: "12-22 дней",
            express: "6-12 дней",
            premium: "3-6 дней"
        }
    }
};

// Коэффициенты для веса (нелинейная прогрессия)
const WEIGHT_MULTIPLIERS = {
    light: { min: 0, max: 1, multiplier: 1.0 },      // До 1кг
    medium: { min: 1, max: 5, multiplier: 0.9 },     // 1-5кг (скидка за объем)
    heavy: { min: 5, max: 15, multiplier: 0.8 },     // 5-15кг
    bulk: { min: 15, max: 50, multiplier: 0.7 },     // 15-50кг
    cargo: { min: 50, max: 999, multiplier: 0.6 }    // Свыше 50кг
};

// Дополнительные услуги
const ADDITIONAL_SERVICES = {
    insurance: {
        name: "Страховка посылки",
        icon: "🛡️",
        description: "Страхование на полную стоимость товара",
        calculateCost: (cartTotal) => Math.max(5, cartTotal * 0.02) // 2% от стоимости, минимум $5
    },
    fastProcessing: {
        name: "Ускоренная обработка",
        icon: "⚡",
        description: "Приоритетная обработка заказа на складе",
        cost: 15
    },
    tracking: {
        name: "Расширенное отслеживание",
        icon: "📍",
        description: "SMS и email уведомления о статусе посылки",
        cost: 8
    },
    packaging: {
        name: "Усиленная упаковка",
        icon: "📦",
        description: "Дополнительная защитная упаковка для хрупких товаров",
        cost: 12
    },
    consolidation: {
        name: "Консолидация посылок",
        icon: "📬", 
        description: "Объединение нескольких заказов в одну посылку",
        cost: 8
    }
};

// Функция определения зоны доставки по коду страны
function getDeliveryZone(countryCode) {
    // Проверяем специальные тарифы
    if (SPECIAL_RATES[countryCode]) {
        return { type: 'special', data: SPECIAL_RATES[countryCode] };
    }
    
    // Ищем в зонах
    for (const [zoneName, zoneData] of Object.entries(DELIVERY_ZONES)) {
        if (zoneData.countries.includes(countryCode)) {
            return { type: 'zone', data: zoneData, zone: zoneName };
        }
    }
    
    // По умолчанию - самая дорогая зона
    return { type: 'zone', data: DELIVERY_ZONES.zone5, zone: 'zone5' };
}

// Функция расчета коэффициента веса
function getWeightMultiplier(totalWeight) {
    for (const category of Object.values(WEIGHT_MULTIPLIERS)) {
        if (totalWeight >= category.min && totalWeight < category.max) {
            return category.multiplier;
        }
    }
    return WEIGHT_MULTIPLIERS.cargo.multiplier; // Для очень больших весов
}

// Основная функция расчета доставки
function calculateDeliveryByAddress(address, cartItems, cartTotal) {
    const result = {
        address: address,
        totalWeight: 0,
        methods: [],
        recommendedMethod: null,
        additionalServices: {},
        error: null
    };

    try {
        // Рассчитываем общий вес
        result.totalWeight = cartItems.reduce((sum, item) => {
            const itemWeight = item.weight || 0.5; // По умолчанию 0.5кг на товар
            return sum + (itemWeight * item.quantity);
        }, 0);

        // Определяем зону доставки по стране
        const countryCode = address.countryCode || 'RU'; // По умолчанию Россия
        const zoneInfo = getDeliveryZone(countryCode);
        const weightMultiplier = getWeightMultiplier(result.totalWeight);

        // Формируем методы доставки
        const rates = zoneInfo.data;
        
        result.methods = [
            {
                id: 'economy',
                name: 'Экономичная доставка',
                icon: '🚛',
                description: 'Самый доступный способ доставки',
                baseRate: rates.baseRate,
                cost: Math.round(rates.baseRate * result.totalWeight * weightMultiplier * 100) / 100,
                weight: result.totalWeight,
                deliveryTime: rates.deliveryTime.economy,
                zone: zoneInfo.zone || 'special'
            },
            {
                id: 'express', 
                name: 'Экспресс доставка',
                icon: '✈️',
                description: 'Быстрая доставка авиапочтой',
                baseRate: rates.expressRate,
                cost: Math.round(rates.expressRate * result.totalWeight * weightMultiplier * 100) / 100,
                weight: result.totalWeight,
                deliveryTime: rates.deliveryTime.express,
                zone: zoneInfo.zone || 'special'
            },
            {
                id: 'premium',
                name: 'Премиум доставка',
                icon: '🚀',
                description: 'Максимально быстрая доставка курьерской службой',
                baseRate: rates.premiumRate,
                cost: Math.round(rates.premiumRate * result.totalWeight * weightMultiplier * 100) / 100,
                weight: result.totalWeight,
                deliveryTime: rates.deliveryTime.premium,
                zone: zoneInfo.zone || 'special'
            }
        ];

        // Определяем рекомендуемый метод (средний по цене/скорости)
        result.recommendedMethod = result.methods[1]; // Express по умолчанию

        // Формируем дополнительные услуги
        result.additionalServices = {};
        for (const [serviceId, service] of Object.entries(ADDITIONAL_SERVICES)) {
            result.additionalServices[serviceId] = {
                ...service,
                cost: service.calculateCost ? service.calculateCost(cartTotal) : service.cost
            };
        }

        // Добавляем информацию о стране и регионе
        result.deliveryInfo = {
            country: address.country,
            countryCode: countryCode,
            zone: zoneInfo.zone || 'special',
            weightCategory: getWeightCategory(result.totalWeight),
            weightMultiplier: weightMultiplier
        };

    } catch (error) {
        result.error = `Ошибка расчета доставки: ${error.message}`;
    }

    return result;
}

// Вспомогательная функция для определения категории веса
function getWeightCategory(weight) {
    for (const [category, data] of Object.entries(WEIGHT_MULTIPLIERS)) {
        if (weight >= data.min && weight < data.max) {
            return category;
        }
    }
    return 'cargo';
}

// Функция для получения списка поддерживаемых стран
function getSupportedCountries() {
    const countries = [];
    
    // Добавляем страны из специальных тарифов
    for (const countryCode of Object.keys(SPECIAL_RATES)) {
        countries.push({ code: countryCode, zone: 'special' });
    }
    
    // Добавляем страны из зон
    for (const [zoneName, zoneData] of Object.entries(DELIVERY_ZONES)) {
        for (const countryCode of zoneData.countries) {
            if (!countries.find(c => c.code === countryCode)) {
                countries.push({ code: countryCode, zone: zoneName });
            }
        }
    }
    
    return countries.sort((a, b) => a.code.localeCompare(b.code));
}

module.exports = {
    calculateDeliveryByAddress,
    getDeliveryZone,
    getSupportedCountries,
    DELIVERY_ZONES,
    SPECIAL_RATES,
    ADDITIONAL_SERVICES
};
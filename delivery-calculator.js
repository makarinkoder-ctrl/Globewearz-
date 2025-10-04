// Система расчета доставки с Taobao
// Тарифы основаны на реальных ценах китайских логистических компаний

const DELIVERY_METHODS = {
    economy: {
        name: 'Экономная доставка',
        description: 'Почта России, СДЭК (15-25 дней)',
        pricePerKg: 8, // $8 за кг
        minPrice: 15, // минимальная стоимость $15
        maxWeight: 30, // максимум 30кг
        deliveryTime: '15-25 дней',
        icon: '📦'
    },
    standard: {
        name: 'Стандартная доставка', 
        description: 'EMS, DHL Economy (10-15 дней)',
        pricePerKg: 12, // $12 за кг
        minPrice: 20,
        maxWeight: 20,
        deliveryTime: '10-15 дней',
        icon: '🚚'
    },
    express: {
        name: 'Экспресс доставка',
        description: 'DHL, FedEx (5-8 дней)',
        pricePerKg: 20, // $20 за кг
        minPrice: 35,
        maxWeight: 15,
        deliveryTime: '5-8 дней',
        icon: '✈️'
    }
};

// Примерные веса товаров по категориям (в кг)
const ITEM_WEIGHTS = {
    hoodies: 0.8,
    sneakers: 1.2,
    tshirts: 0.3,
    accessories: 0.2,
    jackets: 1.0,
    pants: 0.6,
    bags: 0.5
};

// Дополнительные услуги
const ADDITIONAL_SERVICES = {
    insurance: {
        name: 'Страхование',
        description: 'Страхование посылки до $500',
        price: 5,
        percentage: 0, // или процент от стоимости
        icon: '🛡️'
    },
    fastProcessing: {
        name: 'Быстрая обработка',
        description: 'Приоритетная обработка заказа',
        price: 10,
        percentage: 0,
        icon: '⚡'
    },
    photoReport: {
        name: 'Фото-отчет',
        description: 'Фото товаров перед отправкой',
        price: 3,
        percentage: 0,
        icon: '📸'
    }
};

// Калькулятор стоимости доставки
function calculateDelivery(items, method = 'standard', additionalServices = []) {
    const deliveryMethod = DELIVERY_METHODS[method];
    if (!deliveryMethod) {
        throw new Error('Неизвестный метод доставки');
    }
    
    // Подсчитываем общий вес
    let totalWeight = 0;
    let totalValue = 0;
    
    items.forEach(item => {
        const itemWeight = ITEM_WEIGHTS[item.category] || 0.5; // дефолтный вес 0.5кг
        totalWeight += itemWeight * item.quantity;
        totalValue += item.finalPrice * item.quantity;
    });
    
    // Проверяем лимиты веса
    if (totalWeight > deliveryMethod.maxWeight) {
        return {
            error: `Превышен максимальный вес для ${deliveryMethod.name}: ${totalWeight.toFixed(1)}кг > ${deliveryMethod.maxWeight}кг`
        };
    }
    
    // Рассчитываем базовую стоимость доставки
    let deliveryCost = Math.max(
        totalWeight * deliveryMethod.pricePerKg,
        deliveryMethod.minPrice
    );
    
    // Добавляем дополнительные услуги
    let servicesTotal = 0;
    let selectedServices = [];
    
    additionalServices.forEach(serviceId => {
        const service = ADDITIONAL_SERVICES[serviceId];
        if (service) {
            const serviceCost = service.price + (totalValue * service.percentage / 100);
            servicesTotal += serviceCost;
            selectedServices.push({
                ...service,
                cost: serviceCost
            });
        }
    });
    
    const finalDeliveryCost = deliveryCost + servicesTotal;
    
    return {
        method: deliveryMethod,
        weight: totalWeight,
        baseCost: deliveryCost,
        servicesTotal,
        selectedServices,
        totalCost: finalDeliveryCost,
        deliveryTime: deliveryMethod.deliveryTime,
        breakdown: {
            weightCharge: totalWeight * deliveryMethod.pricePerKg,
            minimumCharge: deliveryMethod.minPrice,
            appliedCharge: deliveryCost
        }
    };
}

// Получить все доступные методы доставки для корзины
function getAvailableDeliveryMethods(items) {
    const totalWeight = items.reduce((weight, item) => {
        const itemWeight = ITEM_WEIGHTS[item.category] || 0.5;
        return weight + (itemWeight * item.quantity);
    }, 0);
    
    const availableMethods = [];
    
    Object.keys(DELIVERY_METHODS).forEach(methodId => {
        const method = DELIVERY_METHODS[methodId];
        if (totalWeight <= method.maxWeight) {
            const calculation = calculateDelivery(items, methodId);
            if (!calculation.error) {
                availableMethods.push({
                    id: methodId,
                    ...method,
                    cost: calculation.totalCost,
                    weight: totalWeight
                });
            }
        }
    });
    
    return availableMethods;
}

// Получить рекомендуемый метод доставки
function getRecommendedDeliveryMethod(items, budget = null) {
    const available = getAvailableDeliveryMethods(items);
    
    if (available.length === 0) {
        return null;
    }
    
    // Если указан бюджет, ищем самый быстрый в рамках бюджета
    if (budget) {
        const withinBudget = available.filter(method => method.cost <= budget);
        if (withinBudget.length > 0) {
            // Сортируем по времени доставки (экспресс лучше)
            return withinBudget.sort((a, b) => {
                const timeA = parseInt(a.deliveryTime.split('-')[0]);
                const timeB = parseInt(b.deliveryTime.split('-')[0]);
                return timeA - timeB;
            })[0];
        }
    }
    
    // По умолчанию рекомендуем стандартную доставку
    return available.find(method => method.id === 'standard') || available[0];
}

// Форматирование информации о доставке для клиента
function formatDeliveryInfo(deliveryCalculation) {
    if (deliveryCalculation.error) {
        return {
            error: deliveryCalculation.error,
            suggestion: 'Попробуйте разделить заказ на несколько посылок или выберите другой метод доставки'
        };
    }
    
    const { method, weight, totalCost, deliveryTime, selectedServices } = deliveryCalculation;
    
    let info = `${method.icon} **${method.name}**\n`;
    info += `📦 Вес: ${weight.toFixed(1)} кг\n`;
    info += `💰 Стоимость: $${totalCost.toFixed(2)}\n`;
    info += `⏱️ Срок: ${deliveryTime}\n`;
    info += `📝 ${method.description}`;
    
    if (selectedServices.length > 0) {
        info += '\n\n**Дополнительные услуги:**\n';
        selectedServices.forEach(service => {
            info += `${service.icon} ${service.name} - $${service.cost.toFixed(2)}\n`;
        });
    }
    
    return { info, formatted: true };
}

module.exports = {
    DELIVERY_METHODS,
    ITEM_WEIGHTS,
    ADDITIONAL_SERVICES,
    calculateDelivery,
    getAvailableDeliveryMethods,
    getRecommendedDeliveryMethod,
    formatDeliveryInfo
};
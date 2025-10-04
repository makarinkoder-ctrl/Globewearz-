const TelegramBot = require('node-telegram-bot-api');

// Конфигурация бота
const BOT_TOKEN = '8474179699:AAF0hwS1VTzlIyMjrF7Blqj_bRtpmVEKSdM';
const ADMIN_CHAT_ID = '5557326250';
const WEB_APP_URL = 'https://your-vercel-url.vercel.app'; // Замените на ваш Vercel URL

// Создаем бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 GlobeWearZ Simple Bot запущен!');
console.log('🚀 Бот готов к работе!');

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'друг';
    
    const welcomeMessage = `Привет, ${firstName}! 👋

🌍 Это GlobeWearZ - твой проводник в мир стильной одежды!

Здесь ты сможешь найти и заказать самый крутой шмот:
• 👕 Футболки и толстовки
• 👖 Джинсы и брюки  
• 👟 Кроссовки и обувь
• 🧢 Кепки и аксессуары

💫 Качественные вещи по доступным ценам с доставкой по всему миру!`;

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: 'Открыть Globewearz 🌍',
                    web_app: { url: WEB_APP_URL }
                }]
            ]
        }
    };

    bot.sendMessage(chatId, welcomeMessage, keyboard);
});

// Обработка любых других сообщений
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    
    // Игнорируем команды, которые уже обработаны
    if (msg.text && msg.text.startsWith('/')) {
        return;
    }
    
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: 'Открыть Globewearz 🌍',
                    web_app: { url: WEB_APP_URL }
                }]
            ]
        }
    };
    
    bot.sendMessage(chatId, '🌍 GlobeWearZ готов к покупкам!', keyboard);
});

// Обработка ошибок
bot.on('polling_error', (error) => {
    console.log('❌ Ошибка polling:', error);
});

// Обработка callback запросов
bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    
    // Отвечаем на callback чтобы убрать "часики"
    bot.answerCallbackQuery(callbackQuery.id);
});
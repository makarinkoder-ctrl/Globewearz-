# 📧 Настройка Email Уведомлений

## Как настроить email уведомления для GlobeWearZ Store

### 1. Получить пароль приложения Gmail

1. **Включите двухфакторную аутентификацию** в вашем Google аккаунте
2. Перейдите в **Google Account Settings** → **Security**
3. В разделе "Signing in to Google" найдите **App passwords**
4. Создайте новый пароль приложения для "Mail"
5. **Сохраните** этот пароль - он понадобится

### 2. Настройка переменных среды

Создайте файл `.env` в корне проекта:

```bash
# Email Configuration
EMAIL_ENABLED=true
EMAIL_USER=ваш-email@gmail.com
EMAIL_PASSWORD=ваш-пароль-приложения
ADMIN_EMAIL=куда-присылать-заказы@example.com
```

### 3. Быстрая настройка без .env файла

Отредактируйте `server.js`, найдите строки:

```javascript
// Email настройки
const EMAIL_CONFIG = {
    service: 'gmail',
    user: process.env.EMAIL_USER || '', // ваш email для отправки
    password: process.env.EMAIL_PASSWORD || '', // пароль приложения Gmail
    enabled: process.env.EMAIL_ENABLED === 'true' || false
};
```

И замените на:

```javascript
// Email настройки
const EMAIL_CONFIG = {
    service: 'gmail',
    user: 'ваш-email@gmail.com', // ваш email для отправки
    password: 'ваш-пароль-приложения', // пароль приложения Gmail
    enabled: true
};
```

Также измените:

```javascript
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'куда-присылать@example.com';
```

### 4. Перезапуск сервера

После настройки перезапустите сервер:

```bash
node server.js
```

Вы должны увидеть:

```
📧 Email настройки:
- Админ email: ваш-admin@email.com
- Email сервис: включен
- Отправитель: ваш-sender@gmail.com
✅ Email транспорт настроен успешно
```

## 🔧 Альтернативные настройки

### Использование других почтовых сервисов

#### Yandex Mail
```javascript
const EMAIL_CONFIG = {
    host: 'smtp.yandex.ru',
    port: 465,
    secure: true,
    auth: {
        user: 'ваш-email@yandex.ru',
        pass: 'ваш-пароль'
    },
    enabled: true
};
```

#### Mail.ru
```javascript
const EMAIL_CONFIG = {
    host: 'smtp.mail.ru',
    port: 465,
    secure: true,
    auth: {
        user: 'ваш-email@mail.ru', 
        pass: 'ваш-пароль'
    },
    enabled: true
};
```

### Проверка работы

1. **Сделайте тестовый заказ** через сайт
2. **Проверьте консоль** сервера на сообщения об отправке
3. **Проверьте почту** - должно прийти детальное уведомление

## ❌ Возможные проблемы

- **"Invalid login"** - проверьте email и пароль
- **"Authentication failed"** - убедитесь что включена 2FA и используется пароль приложения
- **"Connection timeout"** - проверьте интернет соединение
- **"No recipients"** - проверьте ADMIN_EMAIL

## 📋 Что содержит email уведомление

- **Номер заказа**
- **Данные клиента** (имя, email, телефон)
- **Полный адрес доставки** с разбивкой по полям
- **Список товаров** с ценами и количеством
- **Детали доставки** (метод, зона, вес, сроки)
- **Дополнительные услуги** (если выбраны)
- **Итоговая сумма** заказа
- **Время создания** заказа

Готово! Теперь вы будете получать детальные уведомления о каждом заказе! 🎉
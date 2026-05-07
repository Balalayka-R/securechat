# 🔒 SecureChat

> Анонимный мессенджер с End-to-End шифрованием уровня Telegram.  
> Без регистрации. Без номера телефона. Без логов. Сервер видит только зашифрованный мусор.

![License](https://img.shields.io/badge/license-MIT-blue)
![E2E](https://img.shields.io/badge/encryption-AES--256--GCM-green)
![Anon](https://img.shields.io/badge/anonymous-yes-purple)

---

## 🛡️ Как работает безопасность (технически)

### Сквозное шифрование (E2E)

```
Алиса                        Сервер                        Боб
  |                             |                             |
  |-- генерирует ECDH ключи     |   генерирует ECDH ключи  --|
  |-- публичный ключ ---------> | -------> публичный ключ  --|
  |                             |                             |
  |   ECDH(Alice.priv, Bob.pub) = SHARED SECRET = ECDH(Bob.priv, Alice.pub)
  |                             |                             |
  |-- AES-GCM.encrypt(msg) ---> | ----------(зашифровано) --> |
  |                             |  СЕРВЕР ВИДИТ ТОЛЬКО ЭТО   |
  |                             |  → "xK92mP+Tz3n..." ????  |
```

**Алгоритмы:**
- `ECDH P-256` — обмен ключами (тот же стандарт что в TLS/HTTPS)
- `AES-256-GCM` — симметричное шифрование (военный стандарт США, NSA Suite B)
- `SHA-256` — хэш для отпечатка ключа
- Всё реализовано через **Web Crypto API** — нативный браузерный крипто-модуль, без сторонних библиотек

### Где хранятся переписки?

| Место | Хранится? | Кто имеет доступ? |
|-------|-----------|-------------------|
| **Твой браузер (localStorage)** | ✅ Только ключи (зашифровано) | Только ты |
| **ОЗУ сервера** | ❌ Только пока сессия активна | Никто — после disconnect удаляется |
| **База данных** | ❌ Не используется | — |
| **Логи сервера** | ❌ Не пишутся | — |
| **Файлы** | ❌ Ничего не записывается | — |

**Вывод:** Переписка существует только в RAM твоего устройства во время сессии.  
Закрыл вкладку — история удалена навсегда. Сервер никогда не видел текст.

### Как обеспечивается анонимность?

1. **Нет регистрации** — не нужен email, телефон, имя
2. **Случайный ID** — 128-битный случайный hex, генерируется локально (`crypto.getRandomValues`)
3. **Псевдоним** — случайная комбинация слов (типа `SilentFox4821`), можно сменить
4. **Нет IP-логирования** — сервер не записывает адреса
5. **Нет cookies** — идентификация только через WebSocket-сессию
6. **Tor-совместимость** — работает через Tor Browser (WebSocket over Tor)

### Сравнение с Telegram

| Функция | Telegram | SecureChat |
|---------|----------|------------|
| E2E шифрование | Только "Секретные чаты" | ✅ Всегда, везде |
| Хранение на серверах | ✅ Облачные чаты хранятся | ❌ Ничего не хранится |
| Требует телефон | ✅ Обязательно | ❌ Не нужен |
| Анонимность | Частичная | ✅ Полная |
| Открытый код | Частично | ✅ Весь код открыт |

---

## 🚀 Быстрый запуск локально

### 1. Установи Node.js
Скачай LTS: https://nodejs.org/en/download

### 2. Запусти сервер
```bash
cd server
npm install
npm run dev
# Сервер запустится на :4000
```

### 3. Запусти фронтенд
```bash
# В корне проекта
npm install
npm run dev
# Открой http://localhost:3000
```

Открой **два окна браузера** на `http://localhost:3000` — это два разных пользователя.

---

## 🌍 Как разместить на GitHub Pages (бесплатно, навсегда)

### Шаг 1 — Создай репозиторий на GitHub

1. Зайди на https://github.com → **New repository**
2. Название: `securechat` ← **обязательно такое же, как в `vite.config.js` → `base`**
3. Visibility: **Public**
4. Нажми **Create repository**

### Шаг 2 — Загрузи код

```bash
git init
git add .
git commit -m "Initial commit — SecureChat E2E messenger"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/securechat.git
git push -u origin main
```

### Шаг 3 — Добавь секрет с адресом сервера

1. В репозитории: **Settings → Secrets and variables → Actions**
2. Нажми **New repository secret**
3. Name: `VITE_SERVER_URL`
4. Value: `https://твой-сервер.railway.app` (заполнишь после шага 4)

### Шаг 4 — Задеплой сервер на Railway (бесплатно)

1. Зайди на https://railway.app → Sign up с GitHub
2. **New Project → Deploy from GitHub repo** → выбери `securechat`
3. **Root Directory:** `server`
4. В разделе **Variables** добавь:
   ```
   ALLOWED_ORIGINS=https://ВАШ_ЛОГИН.github.io
   ```
5. Railway выдаст URL вида `https://securechat-server-xxx.railway.app`
6. Скопируй этот URL → вставь в секрет `VITE_SERVER_URL` на GitHub (шаг 3)

### Шаг 5 — Включи GitHub Pages

1. В репозитории: **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **gh-pages** / `/ (root)`
4. Нажми **Save**

### Шаг 6 — Автодеплой готов!

При каждом `git push main` GitHub Actions автоматически:
- Собирает проект (`npm run build`)
- Публикует в ветку `gh-pages`

Твой мессенджер будет доступен по адресу:  
**`https://ВАШ_ЛОГИН.github.io/securechat/`**

> Если изменил логин или имя репозитория — поменяй `base` в `vite.config.js` на `/ИМЯ_РЕПО/`

---

## 📁 Структура проекта

```
securechat/
├── src/
│   ├── lib/
│   │   ├── crypto.js        # E2E: ECDH + AES-GCM (Web Crypto API)
│   │   ├── identity.js      # Анонимные ID и псевдонимы
│   │   └── socket.js        # WebSocket подключение
│   ├── components/
│   │   ├── AuthScreen.jsx   # Вход без регистрации
│   │   ├── ChatScreen.jsx   # Главный экран чата
│   │   ├── ContactAvatar.jsx
│   │   └── MessageBubble.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── server/
│   ├── index.js             # Relay-сервер (не хранит сообщения)
│   └── package.json
├── .gitignore
├── .env.example
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 🔐 Технический стек

- **Frontend:** React 18 + Vite + TailwindCSS + Lucide Icons
- **Backend:** Node.js + Express + Socket.IO
- **Crypto:** Web Crypto API (встроен в браузер, нет зависимостей)
- **Transport:** WebSocket (Socket.IO)

## 📄 Лицензия

MIT — используй свободно, модифицируй, деплой свой инстанс.

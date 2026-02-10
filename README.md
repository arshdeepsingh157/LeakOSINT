# Telegram LeakOSINT Bot

A simple Node.js chatbot that connects a Telegram bot (via the `node-telegram-bot-api` package) to the LeakOSINT service. Users can DM your Telegram bot with a query (email, username, etc.), and the bot will return LeakOSINT matches formatted for Telegram.

## Prerequisites
- Node.js 18+ (Node 20/22/24 verified)
- npm 9+
- A Telegram bot token from [@BotFather](https://telegram.me/BotFather)
- A LeakOSINT API token (from the LeakOSINT panel or their Telegram assistant)

## Setup
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create `.env` in the project root**
   ```ini
   TELEGRAM_BOT_TOKEN=generate_token_from_botfather        # required
   LEAKOSINT_API_TOKEN=1092831934:38v1JSTR       # required
   LEAKOSINT_API_URL=https://leakosintapi.com/   # optional (default shown)
   LEAKOSINT_LANG=ru                             # optional (default "ru")
   LEAKOSINT_LIMIT=100                           # optional (default 100)
   ```
   - Keep this file **out of source control**.
   - Regenerate both tokens if you ever suspect they leaked.

## Running the bot
```bash
node bot.js
```
You should see:
```
Token prefix: 123456789:
🤖 Telegram LeakOSINT bot is running...
```
Leave this process running; it will poll Telegram for new messages.

## Using the bot
1. Open Telegram, search for the bot username you created in BotFather, and tap **Start**.
2. Send any text query (e.g., an email). The bot calls the LeakOSINT API and sends formatted HTML messages back.
3. Responses are chunked automatically if they exceed Telegram's 4096-character limit.

## Troubleshooting
- **`ETELEGRAM: 401 Unauthorized`**: The Telegram token is invalid or revoked. Revoke it in BotFather, paste the new value in `.env`, restart the bot.
- **`Missing ... in .env` errors**: Ensure every required variable is defined and there are no BOM characters or quotes in the `.env` file.
- **HTTP errors from LeakOSINT**: Check that your LeakOSINT token is valid and you respect their rate/limit policies.
- **No replies**: Add a `console.log("Incoming", msg.text);` inside the `bot.on("message")` handler to confirm Telegram is delivering updates.

## Security notes
- Never commit `.env` or tokens to version control.
- Rotate both Telegram and LeakOSINT tokens periodically.
- If you deploy, restrict server access and monitor logs for suspicious activity.

## License
MIT (see `LICENSE` if present) or adapt as needed.

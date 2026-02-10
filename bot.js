import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { randomBytes } from "crypto";

dotenv.config();

const telegramToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
const leakosintToken = process.env.LEAKOSINT_API_TOKEN?.trim();
const leakosintUrl = process.env.LEAKOSINT_API_URL?.trim() ?? "https://leakosintapi.com/";
const defaultLeakosintLang = process.env.LEAKOSINT_LANG?.trim() ?? "ru";
const leakosintLimit = Number(process.env.LEAKOSINT_LIMIT ?? "100");

if (!telegramToken) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN in .env");
}

if (!leakosintToken) {
  throw new Error("Missing LEAKOSINT_API_TOKEN in .env");
}

const bot = new TelegramBot(telegramToken, { polling: true });

console.log("Token prefix:", telegramToken.slice(0, 10));
console.log("🤖 Telegram LeakOSINT bot is running...");

const WATERMARK = "This tool is created by Arshdeep singh, for educational purposes only.";

let currentLanguage = defaultLeakosintLang;

function withWatermark(text) {
  return `${text}\n\n— ${WATERMARK}`;
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = (msg.text ?? "").trim();

  if (!userText) return;

  if (userText === "/start") {
    bot.sendMessage(
      chatId,
      withWatermark(
        "👋 Hi! Send me a query and I will search LeakOSINT for matching database entries."
      ),
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Generate API Token", callback_data: "generate_token" },
              { text: `Change Language (${currentLanguage.toUpperCase()})`, callback_data: "change_language" },
            ],
          ],
        },
      }
    );
    return;
  }

  bot.sendChatAction(chatId, "typing");

  try {
    const leakResponse = await queryLeakosint(userText);
    const messages = formatLeakosintResponse(leakResponse);

    for (const text of messages) {
      await bot.sendMessage(chatId, withWatermark(text), { parse_mode: "HTML" });
    }
  } catch (err) {
    console.error(err);
    bot.sendMessage(
      chatId,
      withWatermark(`⚠️ Unable to fetch LeakOSINT data: ${err.message ?? "Unknown error"}`)
    );
  }
});

bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat.id;
  if (!chatId) {
    return;
  }

  if (query.data === "generate_token") {
    const token = generateEphemeralToken();
    const ownerLabel = query.from?.username
      ? `@${query.from.username}`
      : `user ${query.from?.id}`;

    const reply = withWatermark(
      `🔑 Generated API token for ${ownerLabel}:\n<code>${token}</code>\nSave it now; it will not be shown again.`
    );

    try {
      await bot.answerCallbackQuery(query.id, { text: "Token generated" });
    } catch (err) {
      console.error("Failed to answer callback", err);
    }

    await bot.sendMessage(chatId, reply, { parse_mode: "HTML" });
    return;
  }

  if (query.data === "change_language") {
    currentLanguage = currentLanguage === "ru" ? "en" : "ru";
    await bot.answerCallbackQuery(query.id, {
      text: `Language set to ${currentLanguage.toUpperCase()}`,
    });

    await bot.sendMessage(
      chatId,
      withWatermark(`🌐 LeakOSINT language changed to ${currentLanguage.toUpperCase()}`)
    );
  }
});

async function queryLeakosint(query) {
  const payload = {   
    token: leakosintToken,
    request: query,
    limit: leakosintLimit,
    lang: currentLanguage,
  };

  const response = await fetch(leakosintUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data["Error code"]) {
    throw new Error(data["Error code"]);
  }

  return data;
}

function formatLeakosintResponse(data) {
  if (!data?.List || Object.keys(data.List).length === 0) {
    return ["No results found."];
  }

  const messages = [];

  for (const [databaseName, entry] of Object.entries(data.List)) {
    const lines = [`<b>${escapeHtml(databaseName)}</b>`];

    if (entry?.InfoLeak) {
      lines.push(escapeHtml(entry.InfoLeak));
    }

    if (Array.isArray(entry?.Data)) {
      for (const record of entry.Data) {
        for (const [column, value] of Object.entries(record)) {
          lines.push(`<b>${escapeHtml(column)}</b>: ${escapeHtml(String(value))}`);
        }
        lines.push("");
      }
    }

    const chunked = chunkForTelegram(lines.join("\n").trim());
    messages.push(...chunked);
  }

  return messages.slice(0, 10);
}

function chunkForTelegram(text, limit = 3500) {
  if (text.length <= limit) {
    return [text];
  }

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0 && chunks.length < 10) {
    const chunk = remaining.slice(0, limit);
    const safeBreak = chunk.lastIndexOf("\n");
    const slicePoint = safeBreak > limit - 500 ? safeBreak : chunk.length;
    chunks.push(`${chunk.slice(0, slicePoint)}\n\n…truncated…`);
    remaining = remaining.slice(slicePoint);
  }

  return chunks;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function generateEphemeralToken() {
  return randomBytes(24).toString("hex");
}

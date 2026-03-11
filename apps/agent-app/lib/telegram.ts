import type { AgentMessage } from "@/lib/chat-agent";

interface TelegramMemoryStore {
  conversations: Map<number, AgentMessage[]>;
}

declare global {
  var __telegramMemoryStore__: TelegramMemoryStore | undefined;
}

function getStore() {
  if (!globalThis.__telegramMemoryStore__) {
    globalThis.__telegramMemoryStore__ = {
      conversations: new Map<number, AgentMessage[]>()
    };
  }

  return globalThis.__telegramMemoryStore__;
}

export function getConversation(chatId: number) {
  return getStore().conversations.get(chatId) ?? [];
}

export function setConversation(chatId: number, messages: AgentMessage[]) {
  const trimmed = messages.slice(-20);
  getStore().conversations.set(chatId, trimmed);
}

export function clearConversation(chatId: number) {
  getStore().conversations.delete(chatId);
}

export async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN environment variable.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed (${response.status}): ${body}`);
  }
}

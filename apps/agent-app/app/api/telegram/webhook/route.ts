import { runOrchardAgent, type AgentMessage } from "@/lib/chat-agent";
import {
  clearConversation,
  getConversation,
  sendTelegramMessage,
  setConversation
} from "@/lib/telegram";

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: {
      id: number;
    };
  };
}

function toUserMessage(text: string): AgentMessage {
  return {
    role: "user",
    content: text
  };
}

function toAssistantMessage(text: string): AgentMessage {
  return {
    role: "assistant",
    content: text
  };
}

export async function POST(request: Request) {
  try {
    const update = (await request.json()) as TelegramUpdate;
    const text = update.message?.text?.trim();
    const chatId = update.message?.chat?.id;

    if (!text || typeof chatId !== "number") {
      return Response.json({ ok: true });
    }

    if (text === "/start") {
      clearConversation(chatId);
      await sendTelegramMessage(
        chatId,
        "Welcome to Orchard Street Agent. I can draft and post tweets (with confirmation), check your timeline, search tweets, and show your profile."
      );
      return Response.json({ ok: true });
    }

    if (text === "/reset") {
      clearConversation(chatId);
      await sendTelegramMessage(chatId, "Conversation history cleared.");
      return Response.json({ ok: true });
    }

    const history = getConversation(chatId);
    const nextMessages = [...history, toUserMessage(text)];

    const result = await runOrchardAgent(nextMessages);
    const assistantText = result.text || "I could not generate a response.";

    setConversation(chatId, [...nextMessages, toAssistantMessage(assistantText)]);
    await sendTelegramMessage(chatId, assistantText);

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Telegram webhook error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

import {
  appendConversationMessage,
  createConversation,
  listConversations,
  listConversationMessages
} from "@/lib/conversations-db";
import { DEFAULT_CLIENT_ID } from "@/lib/runtime-settings";

export async function GET() {
  try {
    const conversations = await listConversations(DEFAULT_CLIENT_ID);
    return Response.json({ conversations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown conversation error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      agentId?: string;
      title?: string;
      initialMessages?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!body.agentId) {
      return Response.json({ error: "agentId is required" }, { status: 400 });
    }

    const conversation = await createConversation({
      clientId: DEFAULT_CLIENT_ID,
      agentId: body.agentId,
      title: body.title?.trim() || "New conversation"
    });

    const initialMessages = body.initialMessages ?? [];

    for (const message of initialMessages) {
      if (!message.content?.trim()) {
        continue;
      }

      await appendConversationMessage({
        conversationId: conversation.id,
        role: message.role,
        content: message.content,
        source: message.role === "assistant" ? "assistant" : "user"
      });
    }

    const messages = await listConversationMessages(conversation.id);
    return Response.json({ conversation, messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown conversation error";
    return Response.json({ error: message }, { status: 500 });
  }
}

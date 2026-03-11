import { appendConversationMessage, createConversation, listConversations } from "@/lib/conversations-db";
import { DEFAULT_CLIENT_ID } from "@/lib/runtime-settings";

interface ImportConversation {
  agentId: string;
  title: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { conversations?: ImportConversation[] };
    const incoming = body.conversations ?? [];

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return Response.json({ imported: 0 });
    }

    const existing = await listConversations(DEFAULT_CLIENT_ID);
    const existingSignatures = new Set(
      existing.map((conversation) => `${conversation.agent_id}:${conversation.title}`)
    );

    let imported = 0;

    for (const conversation of incoming) {
      const signature = `${conversation.agentId}:${conversation.title}`;
      if (existingSignatures.has(signature)) {
        continue;
      }

      const created = await createConversation({
        clientId: DEFAULT_CLIENT_ID,
        agentId: conversation.agentId,
        title: conversation.title || "Imported conversation"
      });

      for (const message of conversation.messages ?? []) {
        if (!message.content?.trim()) {
          continue;
        }

        await appendConversationMessage({
          conversationId: created.id,
          role: message.role,
          content: message.content,
          source: message.role === "assistant" ? "assistant" : "user"
        });
      }

      imported += 1;
      existingSignatures.add(signature);
    }

    return Response.json({ imported });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown import error";
    return Response.json({ error: message }, { status: 500 });
  }
}

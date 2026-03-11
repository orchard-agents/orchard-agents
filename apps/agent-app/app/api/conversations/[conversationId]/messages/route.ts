import {
  appendConversationMessage,
  listConversationMessages,
  updateConversationActivity
} from "@/lib/conversations-db";

interface Params {
  params: Promise<{
    conversationId: string;
  }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { conversationId } = await params;
    const messages = await listConversationMessages(conversationId);
    return Response.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown message fetch error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { conversationId } = await params;
    const body = (await request.json()) as {
      role?: "user" | "assistant";
      content?: string;
      source?: "user" | "assistant" | "cron";
      title?: string;
    };

    if (!body.role || !body.content?.trim()) {
      return Response.json({ error: "role and content are required" }, { status: 400 });
    }

    const message = await appendConversationMessage({
      conversationId,
      role: body.role,
      content: body.content,
      source: body.source
    });

    if (body.title) {
      await updateConversationActivity(conversationId, body.title);
    }

    return Response.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown message append error";
    return Response.json({ error: message }, { status: 500 });
  }
}

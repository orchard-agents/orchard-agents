import { createCronJob, listCronJobs } from "@/lib/cron-db";
import { appendConversationMessage, createConversation } from "@/lib/conversations-db";
import { DEFAULT_CLIENT_ID } from "@/lib/runtime-settings";

export async function GET() {
  try {
    const jobs = await listCronJobs(DEFAULT_CLIENT_ID);
    return Response.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron list error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      agentId?: string;
      conversationId?: string;
      name?: string;
      prompt?: string;
      scheduleType?: "every_x_minutes" | "every_x_hours" | "daily_at" | "weekly_at";
      scheduleValue?: string;
      timezone?: string;
      enabled?: boolean;
    };

    if (!body.agentId || !body.name || !body.prompt || !body.scheduleType || !body.scheduleValue) {
      return Response.json(
        { error: "agentId, name, prompt, scheduleType and scheduleValue are required." },
        { status: 400 }
      );
    }

    let conversationId = body.conversationId;

    if (!conversationId) {
      const conversation = await createConversation({
        clientId: DEFAULT_CLIENT_ID,
        agentId: body.agentId,
        title: body.name
      });

      conversationId = conversation.id;

      await appendConversationMessage({
        conversationId,
        role: "assistant",
        source: "assistant",
        content: `Recurring task created: ${body.name}`
      });
    }

    const job = await createCronJob({
      clientId: DEFAULT_CLIENT_ID,
      agentId: body.agentId,
      conversationId,
      name: body.name,
      prompt: body.prompt,
      scheduleType: body.scheduleType,
      scheduleValue: body.scheduleValue,
      timezone: body.timezone,
      enabled: body.enabled
    });

    return Response.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron create error";
    return Response.json({ error: message }, { status: 500 });
  }
}

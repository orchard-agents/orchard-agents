import { runOrchardAgent, type AgentMessage } from "@/lib/chat-agent";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages?: AgentMessage[];
      systemPrompt?: string;
      agentId?: string;
    };
    const messages = body.messages ?? [];
    const systemPrompt = body.systemPrompt;
    const agentId = body.agentId;

    if (!Array.isArray(messages)) {
      return Response.json({ error: "Invalid payload: messages must be an array." }, { status: 400 });
    }

    const result = await runOrchardAgent(messages, systemPrompt, { agentId });

    return Response.json({
      text: result.text,
      toolCalls: result.toolCalls,
      toolResults: result.toolResults
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chat error";
    return Response.json({ error: message }, { status: 500 });
  }
}

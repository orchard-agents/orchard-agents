import {
  claimCronJob,
  completeCronRun,
  createCronRun,
  findDueCronJobs,
  type CronJobRecord
} from "@/lib/cron-db";
import { appendConversationMessage, listConversationMessages } from "@/lib/conversations-db";
import { runOrchardAgent, type AgentMessage } from "@/lib/chat-agent";

const MAX_RUNTIME_MS = 240_000;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const provided = request.headers.get("x-cron-secret");
  if (provided === secret) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return false;
  }

  const [, token] = authHeader.split(" ");
  return token === secret;
}

async function runJobWithTimeout(job: CronJobRecord) {
  const messages = await listConversationMessages(job.conversation_id);
  const history: AgentMessage[] = messages
    .slice(-20)
    .map((message) => ({ role: message.role, content: message.content }));

  const nextMessages: AgentMessage[] = [
    ...history,
    {
      role: "user",
      content: `Scheduled task to execute now (action mode): ${job.prompt}`
    }
  ];

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Cron execution exceeded ${MAX_RUNTIME_MS / 1000}s timeout.`));
    }, MAX_RUNTIME_MS);
  });

  return Promise.race([
    runOrchardAgent(nextMessages, undefined, { agentId: job.agent_id, isScheduledRun: true }),
    timeoutPromise
  ]);
}

async function runJobForceAction(job: CronJobRecord) {
  const messages = await listConversationMessages(job.conversation_id);
  const history: AgentMessage[] = messages
    .slice(-20)
    .map((message) => ({ role: message.role, content: message.content }));

  const integrationHint =
    job.agent_id === "discord-poster"
      ? "Use Discord tools and call post_message in this run. Draft content if needed, then post."
      : "Use Twitter tools and call post_tweet in this run. Draft tweet text if needed, then post.";

  const nextMessages: AgentMessage[] = [
    ...history,
    {
      role: "user",
      content: `FORCED ACTION RETRY: Execute this scheduled task now by calling at least one tool. Do not ask follow-up questions. ${integrationHint} Task: ${job.prompt}`
    }
  ];

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Cron execution exceeded ${MAX_RUNTIME_MS / 1000}s timeout.`));
    }, MAX_RUNTIME_MS);
  });

  return Promise.race([
    runOrchardAgent(nextMessages, undefined, { agentId: job.agent_id, isScheduledRun: true }),
    timeoutPromise
  ]);
}

function getToolNames(toolCalls: unknown[]) {
  return toolCalls
    .map((toolCall) => {
      if (!toolCall || typeof toolCall !== "object") {
        return null;
      }

      const maybeToolName = (toolCall as { toolName?: unknown }).toolName;
      if (typeof maybeToolName === "string" && maybeToolName.length > 0) {
        return maybeToolName;
      }

      const maybeName = (toolCall as { name?: unknown }).name;
      if (typeof maybeName === "string" && maybeName.length > 0) {
        return maybeName;
      }

      return null;
    })
    .filter((name): name is string => Boolean(name));
}

async function executeCronJob(job: CronJobRecord) {
  const claimed = await claimCronJob(job.id);

  if (!claimed) {
    return { skipped: true };
  }

  const run = await createCronRun(claimed.id);

  try {
    await appendConversationMessage({
      conversationId: claimed.conversation_id,
      role: "assistant",
      source: "cron",
      content: `Cron job started: ${claimed.name}`
    });

    let result = await runJobWithTimeout(claimed);
    let toolNames = getToolNames(result.toolCalls);

    if (toolNames.length === 0) {
      result = await runJobForceAction(claimed);
      toolNames = getToolNames(result.toolCalls);
    }

    if (toolNames.length === 0) {
      throw new Error(
        "Action mode requires at least one tool execution, but no tool was called. Update the recurring task prompt to request a concrete action."
      );
    }

    const actionSummary = `Cron action executed via tools: ${toolNames.join(", ")}`;

    await appendConversationMessage({
      conversationId: claimed.conversation_id,
      role: "assistant",
      source: "cron",
      content: `${actionSummary}\n\n${result.text}`
    });

    await completeCronRun({
      runId: run.id,
      job: claimed,
      status: "success",
      output: `${actionSummary}\n\n${result.text}`
    });

    return { skipped: false, status: "success" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron execution error";

    await appendConversationMessage({
      conversationId: claimed.conversation_id,
      role: "assistant",
      source: "cron",
      content: `Cron job failed: ${message}`
    });

    await completeCronRun({
      runId: run.id,
      job: claimed,
      status: "failed",
      error: message
    });

    return { skipped: false, status: "failed" as const, error: message };
  }
}

async function handleTick(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dueJobs = await findDueCronJobs(new Date(), 10);
    const results = [] as Array<{ id: string; status: string; error?: string; skipped?: boolean }>;

    for (const job of dueJobs) {
      const outcome = await executeCronJob(job);
      results.push({
        id: job.id,
        status: outcome.skipped ? "skipped" : (outcome.status ?? "unknown"),
        error: "error" in outcome ? outcome.error : undefined,
        skipped: outcome.skipped
      });
    }

    return Response.json({
      processed: results.length,
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron tick error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleTick(request);
}

export async function POST(request: Request) {
  return handleTick(request);
}

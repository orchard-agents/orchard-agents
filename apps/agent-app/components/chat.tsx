"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { UserButton } from "@clerk/nextjs";
import { ORCHARD_DISCORD_SYSTEM_PROMPT, ORCHARD_TWITTER_SYSTEM_PROMPT } from "@/lib/agent";

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
}

interface Conversation {
  id: string;
  agent_id: string;
  title: string;
  updated_at: string;
}

interface CronJob {
  id: string;
  name: string;
  agent_id: string;
  conversation_id: string;
  prompt: string;
  schedule_type: "every_x_minutes" | "every_x_hours" | "daily_at" | "weekly_at";
  schedule_value: string;
  timezone: string;
  enabled: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
}

interface CronRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  output: string | null;
  error: string | null;
}

const defaultAgents: AgentConfig[] = [
  {
    id: "twitter-poster",
    name: "Twitter Poster",
    systemPrompt: ORCHARD_TWITTER_SYSTEM_PROMPT
  },
  {
    id: "discord-poster",
    name: "Discord Poster",
    systemPrompt: ORCHARD_DISCORD_SYSTEM_PROMPT
  }
];

function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatSchedule(job: CronJob) {
  if (job.schedule_type === "every_x_minutes") {
    return `Every ${job.schedule_value} minute(s)`;
  }

  if (job.schedule_type === "every_x_hours") {
    return `Every ${job.schedule_value} hour(s)`;
  }

  if (job.schedule_type === "daily_at") {
    return `Daily at ${job.schedule_value}`;
  }

  const [day, time] = job.schedule_value.split("|");
  return `Weekly on ${day} at ${time}`;
}

function getRunActionBadge(run: CronRun) {
  const output = run.output ?? "";
  const error = run.error ?? "";

  if (output.includes("Cron action executed via tools:")) {
    return {
      label: "Action Executed",
      className: "bg-emerald-700/60 text-emerald-100"
    };
  }

  if (error.includes("Action mode requires at least one tool execution")) {
    return {
      label: "No Action",
      className: "bg-red-900/60 text-red-200"
    };
  }

  return {
    label: "Unknown",
    className: "bg-neutral-700 text-neutral-200"
  };
}

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ ...props }) => <p className="mb-3 leading-7 last:mb-0 break-words" {...props} />,
        a: ({ ...props }) => (
          <a
            {...props}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-emerald-400/70 underline-offset-2 break-all"
          />
        ),
        ul: ({ ...props }) => <ul className="mb-3 list-disc pl-5 last:mb-0" {...props} />,
        ol: ({ ...props }) => <ol className="mb-3 list-decimal pl-5 last:mb-0" {...props} />,
        li: ({ ...props }) => <li className="mb-1 last:mb-0 break-words" {...props} />,
        code: ({ className, children, ...props }) => {
          const isBlock = Boolean(className?.includes("language-"));

          if (!isBlock) {
            return (
              <code className="rounded bg-neutral-950/90 px-1 py-0.5 text-[0.9em] break-words" {...props}>
                {children}
              </code>
            );
          }

          return (
            <code
              className="block overflow-x-auto whitespace-pre rounded bg-neutral-950 p-3 text-xs leading-6"
              {...props}
            >
              {children}
            </code>
          );
        },
        pre: ({ ...props }) => <pre className="my-3 overflow-x-auto" {...props} />
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function Chat() {
  const [tab, setTab] = useState<"conversations" | "cron">("conversations");
  const [agents, setAgents] = useState<AgentConfig[]>(defaultAgents);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, AgentMessage[]>>({});
  const [selectedAgentId, setSelectedAgentId] = useState(defaultAgents[0].id);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [promptDraft, setPromptDraft] = useState(defaultAgents[0].systemPrompt);
  const [promptConfirmed, setPromptConfirmed] = useState(false);

  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState({
    name: "",
    prompt: "",
    scheduleType: "every_x_minutes" as "every_x_minutes" | "every_x_hours" | "daily_at" | "weekly_at",
    intervalMinutes: "15",
    intervalHours: "6",
    dailyTime: "09:00",
    weeklyDay: "MON",
    weeklyTime: "09:00",
    timezone: "America/New_York",
    enabled: true
  });

  const listRef = useRef<HTMLDivElement | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? defaultAgents[0],
    [agents, selectedAgentId]
  );

  const messages = selectedConversationId ? messagesByConversation[selectedConversationId] ?? [] : [];

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  const recurringConversationIds = useMemo(
    () => new Set(jobs.map((job) => job.conversation_id)),
    [jobs]
  );

  useEffect(() => {
    void loadConversations();
    void loadSettingsAgents();
    void loadJobs();
  }, []);

  useEffect(() => {
    if (tab === "cron") {
      void loadJobs();
    }
  }, [tab]);

  useEffect(() => {
    setPromptDraft(selectedAgent.systemPrompt);
    setPromptConfirmed(false);
  }, [selectedAgentId]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    if (!messagesByConversation[selectedConversationId]) {
      void loadMessages(selectedConversationId);
    }
  }, [messagesByConversation, selectedConversationId]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isLoading]);

  async function loadSettingsAgents() {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        settings?: { agents?: Array<{ agentId: string; name: string; integration: "twitter" | "discord" }> };
      };

      const fetchedAgents = data.settings?.agents ?? [];
      if (fetchedAgents.length === 0) {
        return;
      }

      const nextAgents = fetchedAgents.map((agent) => ({
        id: agent.agentId,
        name: agent.name,
        systemPrompt:
          agent.integration === "discord" ? ORCHARD_DISCORD_SYSTEM_PROMPT : ORCHARD_TWITTER_SYSTEM_PROMPT
      }));

      setAgents(nextAgents);
      if (!nextAgents.some((agent) => agent.id === selectedAgentId)) {
        setSelectedAgentId(nextAgents[0].id);
      }
    } catch {
      // keep defaults
    }
  }

  async function loadConversations() {
    try {
      const response = await fetch("/api/conversations");
      const data = (await response.json()) as { conversations?: Conversation[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load conversations");
      }

      const items = data.conversations ?? [];
      setConversations(items);

      if (items.length > 0) {
        setSelectedConversationId((current) => current ?? items[0].id);
        setSelectedAgentId((current) => items.find((item) => item.id === selectedConversationId)?.agent_id ?? current);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown conversation error";
      setNotice(`Failed to load conversations: ${message}`);
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = (await response.json()) as {
        messages?: Array<{ role: "user" | "assistant"; content: string }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load messages");
      }

      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: (data.messages ?? []).map((message) => ({
          role: message.role,
          content: message.content
        }))
      }));
    } catch {
      // ignore individual conversation message load failures
    }
  }

  async function createConversation(agentId: string, title: string) {
    const welcome: AgentMessage = {
      role: "assistant",
      content: `Welcome! You're chatting with ${agents.find((agent) => agent.id === agentId)?.name ?? "Agent"}. What would you like to do?`
    };

    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId,
        title,
        initialMessages: [welcome]
      })
    });

    const data = (await response.json()) as {
      conversation?: Conversation;
      messages?: AgentMessage[];
      error?: string;
    };

    if (!response.ok || !data.conversation) {
      throw new Error(data.error ?? "Failed to create conversation");
    }

    setConversations((current) => [data.conversation as Conversation, ...current]);
    setMessagesByConversation((current) => ({
      ...current,
      [data.conversation!.id]: data.messages ?? [welcome]
    }));

    return data.conversation as Conversation;
  }

  async function appendMessage(
    conversationId: string,
    payload: { role: "user" | "assistant"; content: string; source?: "user" | "assistant" | "cron"; title?: string }
  ) {
    await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) {
      return;
    }

    setIsLoading(true);
    setInput("");
    setNotice("");

    try {
      let conversation = selectedConversation;
      if (!conversation) {
        conversation = await createConversation(selectedAgent.id, text.slice(0, 44));
        setSelectedConversationId(conversation.id);
      }

      const userMessage: AgentMessage = { role: "user", content: text };
      const history = [...(messagesByConversation[conversation.id] ?? []), userMessage];

      setMessagesByConversation((current) => ({
        ...current,
        [conversation!.id]: history
      }));

      await appendMessage(conversation.id, {
        role: "user",
        content: text,
        source: "user",
        title: conversation.title === "New conversation" ? text.slice(0, 44) : undefined
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          messages: history,
          systemPrompt: selectedAgent.systemPrompt
        })
      });

      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to get assistant response");
      }

      const assistantMessage: AgentMessage = {
        role: "assistant",
        content: data.text ?? "I was unable to generate a response."
      };

      setMessagesByConversation((current) => ({
        ...current,
        [conversation!.id]: [...(current[conversation!.id] ?? history), assistantMessage]
      }));

      await appendMessage(conversation.id, {
        role: "assistant",
        content: assistantMessage.content,
        source: "assistant"
      });

      await loadConversations();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown send error";
      setNotice(`Send failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadJobs() {
    try {
      const response = await fetch("/api/cron/jobs");
      const data = (await response.json()) as { jobs?: CronJob[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load jobs");
      }

      setJobs(data.jobs ?? []);
      if (!selectedJobId && (data.jobs?.length ?? 0) > 0) {
        setSelectedJobId(data.jobs![0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown cron load error";
      setNotice(`Failed to load cron jobs: ${message}`);
    }
  }

  async function createJob() {
    if (!jobForm.name.trim() || !jobForm.prompt.trim()) {
      setNotice("Job name and prompt are required.");
      return;
    }

    const scheduleValue =
      jobForm.scheduleType === "every_x_minutes"
        ? jobForm.intervalMinutes
        : jobForm.scheduleType === "every_x_hours"
          ? jobForm.intervalHours
          : jobForm.scheduleType === "daily_at"
            ? jobForm.dailyTime
            : `${jobForm.weeklyDay}|${jobForm.weeklyTime}`;

    try {
      const response = await fetch("/api/cron/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          name: jobForm.name,
          prompt: jobForm.prompt,
          scheduleType: jobForm.scheduleType,
          scheduleValue,
          timezone: jobForm.timezone,
          enabled: jobForm.enabled
        })
      });

      const data = (await response.json()) as { job?: CronJob; error?: string };
      if (!response.ok || !data.job) {
        throw new Error(data.error ?? "Failed to create cron job");
      }

      setNotice("Recurring task created.");
      setJobForm((current) => ({
        ...current,
        name: "",
        prompt: ""
      }));
      await loadJobs();
      setSelectedJobId(data.job.id);
      await loadConversations();
      setSelectedConversationId(data.job.conversation_id);
      setSelectedAgentId(data.job.agent_id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown cron create error";
      setNotice(`Failed to create recurring task: ${message}`);
    }
  }

  async function toggleJob(job: CronJob) {
    try {
      const response = await fetch(`/api/cron/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !job.enabled })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to toggle cron job");
      }

      await loadJobs();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown cron toggle error";
      setNotice(`Failed to update cron job: ${message}`);
    }
  }

  async function deleteJob(jobId: string) {
    try {
      const response = await fetch(`/api/cron/jobs/${jobId}`, {
        method: "DELETE"
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete recurring task");
      }

      setRuns([]);
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
      }

      setNotice("Recurring task deleted.");
      await loadJobs();
      await loadConversations();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown cron delete error";
      setNotice(`Failed to delete recurring task: ${message}`);
    }
  }

  async function loadRuns(jobId: string) {
    try {
      const response = await fetch(`/api/cron/jobs/${jobId}/runs`);
      const data = (await response.json()) as { runs?: CronRun[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load runs");
      }

      setRuns(data.runs ?? []);
      setSelectedJobId(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runs error";
      setNotice(`Failed to load runs: ${message}`);
    }
  }

  const canSend = Boolean(input.trim()) && !isLoading;
  const isPromptDirty = promptDraft !== selectedAgent.systemPrompt;

  function confirmPromptChanges() {
    setAgents((current) =>
      current.map((agent) =>
        agent.id === selectedAgent.id ? { ...agent, systemPrompt: promptDraft } : agent
      )
    );
    setPromptConfirmed(true);
    setNotice("Agent prompt changes confirmed.");
  }

  return (
    <main className="h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex h-full max-w-[1500px] flex-col gap-3 p-3">
        <header className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold">🌳 Orchard Mailbox</p>
            <div className="ml-3 flex gap-2">
              <button
                type="button"
                onClick={() => setTab("conversations")}
                className={`rounded-lg px-3 py-1 text-sm ${
                  tab === "conversations" ? "bg-emerald-500 text-emerald-950" : "border border-neutral-700"
                }`}
              >
                Conversations
              </button>
              <button
                type="button"
                onClick={() => setTab("cron")}
                className={`rounded-lg px-3 py-1 text-sm ${
                  tab === "cron" ? "bg-emerald-500 text-emerald-950" : "border border-neutral-700"
                }`}
              >
                Recurring Tasks
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings" className="rounded-lg border border-neutral-700 px-3 py-1 text-sm">
              Settings
            </Link>
            <UserButton />
          </div>
        </header>

        {notice ? <p className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-neutral-300">{notice}</p> : null}

        {tab === "conversations" ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
            <aside className="flex min-h-0 flex-col rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Agents</p>
              <div className="mb-4 space-y-2">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedAgent.id === agent.id
                        ? "border-emerald-500/60 bg-emerald-600/20"
                        : "border-neutral-700"
                    }`}
                  >
                    {agent.name}
                  </button>
                ))}
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Conversations</p>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      setSelectedConversationId(conversation.id);
                      setSelectedAgentId(conversation.agent_id);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedConversationId === conversation.id
                        ? "border-emerald-500/60 bg-emerald-600/20"
                        : "border-neutral-700"
                    }`}
                  >
                    <p className="truncate font-medium">
                      {recurringConversationIds.has(conversation.id) ? "🔁 " : ""}
                      {conversation.title}
                    </p>
                    <p className="truncate text-xs text-neutral-400">{conversation.agent_id}</p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="flex min-h-0 flex-col rounded-xl border border-neutral-800 bg-neutral-900/70 p-3">
              <header className="mb-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-semibold">
                {selectedAgent.name} {selectedConversation ? `• ${selectedConversation.title}` : ""}
              </header>

              <div ref={listRef} className="mb-3 min-h-0 flex-1 overflow-y-auto rounded-lg bg-neutral-900/40 p-3">
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`max-w-[92%] overflow-hidden rounded-xl px-4 py-3 break-words ${
                        message.role === "user"
                          ? "ml-auto bg-emerald-600/80 text-white"
                          : "mr-auto bg-neutral-800 text-neutral-100"
                      }`}
                    >
                      <p className="mb-1 text-xs uppercase tracking-wide opacity-70">
                        {message.role === "user" ? "You" : selectedAgent.name}
                      </p>
                      {message.role === "user" ? (
                        <p className="whitespace-pre-wrap break-words leading-7">{message.content}</p>
                      ) : (
                        <AssistantMarkdown content={message.content} />
                      )}
                    </div>
                  ))}

                  {isLoading ? (
                    <div className="mr-auto inline-flex rounded-xl bg-neutral-800 px-4 py-3 text-sm text-neutral-300">
                      Thinking...
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none ring-emerald-400 transition focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleSend();
                  }}
                  disabled={!canSend}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
              <p className="mb-1 text-sm font-semibold">Agent Prompt</p>
              <p className="mb-3 text-xs text-neutral-400">Edit then click confirm to apply changes.</p>
              <textarea
                value={promptDraft}
                onChange={(event) => {
                  setPromptDraft(event.target.value);
                  setPromptConfirmed(false);
                }}
                className="min-h-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-xs leading-5 outline-none ring-emerald-400 focus:ring-2"
              />
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={confirmPromptChanges}
                  disabled={!isPromptDirty}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirm prompt changes
                </button>
                {promptConfirmed ? (
                  <p className="text-xs text-emerald-300">Changes confirmed.</p>
                ) : (
                  <p className="text-xs text-neutral-400">{isPromptDirty ? "Unsaved changes" : "No changes"}</p>
                )}
              </div>
            </aside>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[420px_minmax(0,1fr)]">
            <section className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
              <p className="mb-3 text-sm font-semibold">Create Recurring Task</p>
              <div className="mb-3 rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-3 py-2 text-xs text-emerald-100">
                Mode: <span className="font-semibold">Action</span> (default). Recurring tasks are executed as real tool actions,
                not advisory replies.
              </div>
              <div className="space-y-3">
                <input
                  value={jobForm.name}
                  onChange={(event) => setJobForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Job name"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />

                <textarea
                  value={jobForm.prompt}
                  onChange={(event) => setJobForm((current) => ({ ...current, prompt: event.target.value }))}
                  placeholder="Prompt to run each schedule"
                  className="h-28 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />

                <select
                  value={selectedAgentId}
                  onChange={(event) => setSelectedAgentId(event.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>

                <select
                  value={jobForm.scheduleType}
                  onChange={(event) =>
                    setJobForm((current) => ({
                      ...current,
                      scheduleType: event.target.value as
                        | "every_x_minutes"
                        | "every_x_hours"
                        | "daily_at"
                        | "weekly_at"
                    }))
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                >
                  <option value="every_x_minutes">Every X minutes</option>
                  <option value="every_x_hours">Every X hours</option>
                  <option value="daily_at">Daily at time</option>
                  <option value="weekly_at">Weekly on day/time</option>
                </select>

                {jobForm.scheduleType === "every_x_minutes" ? (
                  <select
                    value={jobForm.intervalMinutes}
                    onChange={(event) =>
                      setJobForm((current) => ({ ...current, intervalMinutes: event.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                  >
                    <option value="5">Every 5 minutes</option>
                    <option value="10">Every 10 minutes</option>
                    <option value="15">Every 15 minutes</option>
                    <option value="20">Every 20 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="45">Every 45 minutes</option>
                    <option value="60">Every 60 minutes</option>
                  </select>
                ) : null}

                {jobForm.scheduleType === "every_x_hours" ? (
                  <select
                    value={jobForm.intervalHours}
                    onChange={(event) =>
                      setJobForm((current) => ({ ...current, intervalHours: event.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                  >
                    <option value="1">Every 1 hour</option>
                    <option value="2">Every 2 hours</option>
                    <option value="3">Every 3 hours</option>
                    <option value="4">Every 4 hours</option>
                    <option value="6">Every 6 hours</option>
                    <option value="8">Every 8 hours</option>
                    <option value="12">Every 12 hours</option>
                    <option value="24">Every 24 hours</option>
                  </select>
                ) : null}

                {jobForm.scheduleType === "daily_at" ? (
                  <input
                    type="time"
                    value={jobForm.dailyTime}
                    onChange={(event) => setJobForm((current) => ({ ...current, dailyTime: event.target.value }))}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                  />
                ) : null}

                {jobForm.scheduleType === "weekly_at" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={jobForm.weeklyDay}
                      onChange={(event) =>
                        setJobForm((current) => ({ ...current, weeklyDay: event.target.value }))
                      }
                      className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                    >
                      <option value="MON">Monday</option>
                      <option value="TUE">Tuesday</option>
                      <option value="WED">Wednesday</option>
                      <option value="THU">Thursday</option>
                      <option value="FRI">Friday</option>
                      <option value="SAT">Saturday</option>
                      <option value="SUN">Sunday</option>
                    </select>
                    <input
                      type="time"
                      value={jobForm.weeklyTime}
                      onChange={(event) =>
                        setJobForm((current) => ({ ...current, weeklyTime: event.target.value }))
                      }
                      className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                    />
                  </div>
                ) : null}

                <input
                  value={jobForm.timezone}
                  onChange={(event) => setJobForm((current) => ({ ...current, timezone: event.target.value }))}
                  placeholder="Timezone (America/New_York)"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />

                <div className="flex items-center gap-2 text-sm">
                  <input
                    id="cron-enabled"
                    type="checkbox"
                    checked={jobForm.enabled}
                    onChange={(event) => setJobForm((current) => ({ ...current, enabled: event.target.checked }))}
                  />
                  <label htmlFor="cron-enabled">Enabled</label>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void createJob();
                  }}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950"
                >
                  Create job
                </button>
              </div>
            </section>

            <section className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
              <div className="min-h-0 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
                <p className="mb-2 text-sm font-semibold">Recurring Tasks</p>
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className={`rounded-lg border p-3 ${
                        selectedJobId === job.id ? "border-emerald-500/60 bg-emerald-600/20" : "border-neutral-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          void loadRuns(job.id);
                        }}
                        className="w-full text-left"
                      >
                        <p className="truncate text-sm font-medium">{job.name}</p>
                        <p className="text-[11px] text-emerald-300">Mode: Action</p>
                        <p className="truncate text-xs text-neutral-400">{formatSchedule(job)}</p>
                        <p className="truncate text-xs text-neutral-400">
                          Next: {job.next_run_at ? new Date(job.next_run_at).toLocaleString() : "none"}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void toggleJob(job);
                        }}
                        className="mt-2 rounded border border-neutral-700 px-2 py-1 text-xs"
                      >
                        {job.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void deleteJob(job.id);
                        }}
                        className="ml-2 mt-2 rounded border border-red-700/60 px-2 py-1 text-xs text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
                <p className="mb-2 text-sm font-semibold">Run Details {selectedJob ? `• ${selectedJob.name}` : ""}</p>
                <p className="mb-3 text-xs text-neutral-400">
                  Action badge appears after the first run is recorded.
                </p>
                <div className="space-y-3">
                  {runs.map((run) => (
                    <div key={run.id} className="rounded-lg border border-neutral-700 p-3 text-xs">
                      <div className="mb-2 flex items-center gap-2">
                        <p>Status: {run.status}</p>
                        <span className={`rounded px-2 py-0.5 text-[11px] ${getRunActionBadge(run).className}`}>
                          {getRunActionBadge(run).label}
                        </span>
                      </div>
                      <p>Started: {new Date(run.started_at).toLocaleString()}</p>
                      {run.finished_at ? <p>Finished: {new Date(run.finished_at).toLocaleString()}</p> : null}
                      {run.error ? <p className="mt-2 text-red-300">Error: {run.error}</p> : null}
                      {run.output ? <p className="mt-2 whitespace-pre-wrap break-words">Output: {run.output}</p> : null}
                    </div>
                  ))}
                  {selectedJob && runs.length === 0 ? (
                    <p className="text-xs text-neutral-400">No runs yet.</p>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

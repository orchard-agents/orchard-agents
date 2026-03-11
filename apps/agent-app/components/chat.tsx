"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ORCHARD_DISCORD_SYSTEM_PROMPT,
  ORCHARD_INSTAGRAM_SYSTEM_PROMPT,
  ORCHARD_LINKEDIN_SYSTEM_PROMPT,
  ORCHARD_TWITTER_SYSTEM_PROMPT
} from "@/lib/agent";
import type { AgentConfig, AgentMessage, Conversation, CronJob, CronRun, JobFormState } from "./chat/types";
import { Header } from "./layout/header";
import { Sidebar } from "./layout/sidebar";
import { MessageList } from "./chat/message-list";
import { ChatInput } from "./chat/chat-input";
import { PromptEditor } from "./agents/prompt-editor";
import { JobForm } from "./cron/job-form";
import { JobList } from "./cron/job-list";
import { RunDetails } from "./cron/run-details";

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
  },
  {
    id: "ig-poster",
    name: "Instagram Poster",
    systemPrompt: ORCHARD_INSTAGRAM_SYSTEM_PROMPT
  },
  {
    id: "linkedin-poster",
    name: "LinkedIn Poster",
    systemPrompt: ORCHARD_LINKEDIN_SYSTEM_PROMPT
  }
];

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
  const [jobForm, setJobForm] = useState<JobFormState>({
    name: "",
    prompt: "",
    scheduleType: "every_x_minutes",
    intervalMinutes: "15",
    intervalHours: "6",
    dailyTime: "09:00",
    weeklyDay: "MON",
    weeklyTime: "09:00",
    timezone: "America/New_York",
    enabled: true
  });

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

  async function loadSettingsAgents() {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        settings?: {
          agents?: Array<{
            agentId: string;
            name: string;
            integration: "twitter" | "discord" | "instagram" | "linkedin";
          }>;
        };
      };

      const fetchedAgents = data.settings?.agents ?? [];
      if (fetchedAgents.length === 0) {
        return;
      }

      const nextAgents = fetchedAgents.map((agent) => ({
        id: agent.agentId,
        name: agent.name,
        systemPrompt: (() => {
          switch (agent.integration) {
            case "discord":
              return ORCHARD_DISCORD_SYSTEM_PROMPT;
            case "instagram":
              return ORCHARD_INSTAGRAM_SYSTEM_PROMPT;
            case "linkedin":
              return ORCHARD_LINKEDIN_SYSTEM_PROMPT;
            default:
              return ORCHARD_TWITTER_SYSTEM_PROMPT;
          }
        })()
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
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

  function handlePromptChange(value: string) {
    setPromptDraft(value);
    setPromptConfirmed(false);
  }

  function handleSelectConversation(conversationId: string, agentId: string) {
    setSelectedConversationId(conversationId);
    setSelectedAgentId(agentId);
  }

  function handleJobFormChange(update: Partial<JobFormState>) {
    setJobForm((current) => ({ ...current, ...update }));
  }

  return (
    <main className="h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex h-full max-w-[1500px] flex-col gap-3 p-3">
        <Header tab={tab} onTabChange={setTab} onLogout={logout} />

        {notice ? <p className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-neutral-300">{notice}</p> : null}

        {tab === "conversations" ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
            <Sidebar
              agents={agents}
              conversations={conversations}
              selectedAgentId={selectedAgent.id}
              selectedConversationId={selectedConversationId}
              recurringConversationIds={recurringConversationIds}
              onSelectAgent={setSelectedAgentId}
              onSelectConversation={handleSelectConversation}
            />

            <section className="flex min-h-0 flex-col rounded-xl border border-neutral-800 bg-neutral-900/70 p-3">
              <header className="mb-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-semibold">
                {selectedAgent.name} {selectedConversation ? `• ${selectedConversation.title}` : ""}
              </header>

              <MessageList messages={messages} agentName={selectedAgent.name} isLoading={isLoading} />
              <ChatInput input={input} canSend={canSend} onInputChange={setInput} onSend={handleSend} />
            </section>

            <PromptEditor
              promptDraft={promptDraft}
              isPromptDirty={isPromptDirty}
              promptConfirmed={promptConfirmed}
              onPromptChange={handlePromptChange}
              onConfirm={confirmPromptChanges}
            />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[420px_minmax(0,1fr)]">
            <JobForm
              agents={agents}
              selectedAgentId={selectedAgentId}
              jobForm={jobForm}
              onAgentChange={setSelectedAgentId}
              onFormChange={handleJobFormChange}
              onCreateJob={createJob}
            />

            <section className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
              <JobList
                jobs={jobs}
                selectedJobId={selectedJobId}
                onSelectJob={(jobId) => { void loadRuns(jobId); }}
                onToggleJob={toggleJob}
                onDeleteJob={deleteJob}
              />
              <RunDetails selectedJob={selectedJob} runs={runs} />
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

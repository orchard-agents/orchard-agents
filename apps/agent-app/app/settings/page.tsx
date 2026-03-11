"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface GlobalSettings {
  anthropicApiKey: string;
}

interface AgentSettings {
  agentId: string;
  name: string;
  integration: "twitter" | "discord";
  useGlobalAnthropic: boolean;
  anthropicApiKeyOverride: string;
  twitterMcpUrl: string;
  twitterApiKey: string;
  twitterApiSecret: string;
  twitterAccessToken: string;
  twitterAccessSecret: string;
  discordMcpUrl: string;
  discordBotToken: string;
  discordGuildName: string;
  discordDefaultChannelName: string;
}

interface SettingsBundle {
  global: GlobalSettings;
  agents: AgentSettings[];
}

interface SettingsStatus {
  global: {
    anthropicApiKey: boolean;
  };
  agents: Array<{
    agentId: string;
    integration: "twitter" | "discord";
    useGlobalAnthropic: boolean;
    anthropicApiKeyOverride: boolean;
    twitterMcpUrl: boolean;
    twitterApiKey: boolean;
    twitterApiSecret: boolean;
    twitterAccessToken: boolean;
    twitterAccessSecret: boolean;
    discordMcpUrl: boolean;
    discordBotToken: boolean;
    discordGuildName: boolean;
    discordDefaultChannelName: boolean;
  }>;
}

const emptyBundle: SettingsBundle = {
  global: { anthropicApiKey: "" },
  agents: []
};

type Tab = "global" | "agents";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("global");
  const [settings, setSettings] = useState<SettingsBundle>(emptyBundle);
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [show, setShow] = useState<Record<string, boolean>>({
    global_anthropic: false,
    agent_anthropic: false,
    twitterApiKey: false,
    twitterApiSecret: false,
    twitterAccessToken: false,
    twitterAccessSecret: false,
    twitterMcpUrl: true,
    discordMcpUrl: true,
    discordBotToken: false,
    discordGuildName: true,
    discordDefaultChannelName: true
  });

  const selectedAgent = useMemo(
    () => settings.agents.find((agent) => agent.agentId === selectedAgentId) ?? settings.agents[0] ?? null,
    [selectedAgentId, settings.agents]
  );

  const selectedStatus = useMemo(
    () => status?.agents.find((item) => item.agentId === selectedAgent?.agentId),
    [selectedAgent?.agentId, status?.agents]
  );

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetch("/api/settings");
        const data = (await response.json()) as {
          settings: SettingsBundle;
          status: SettingsStatus;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load settings");
        }

        setSettings(data.settings);
        setStatus(data.status);

        if (data.settings.agents.length > 0) {
          setSelectedAgentId(data.settings.agents[0].agentId);
        }
      } catch (error) {
        const text = error instanceof Error ? error.message : "Unknown error";
        setMessage(`Failed to load settings: ${text}`);
      } finally {
        setIsLoading(false);
      }
    }

    void loadSettings();
  }, []);

  function updateSelectedAgent(partial: Partial<AgentSettings>) {
    if (!selectedAgent) {
      return;
    }

    setSettings((current) => ({
      ...current,
      agents: current.agents.map((agent) =>
        agent.agentId === selectedAgent.agentId
          ? {
              ...agent,
              ...partial
            }
          : agent
      )
    }));
  }

  async function saveGlobal() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "global", global: settings.global })
      });

      const data = (await response.json()) as {
        ok: boolean;
        settings?: SettingsBundle;
        status?: SettingsStatus;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.settings || !data.status) {
        throw new Error(data.error ?? "Failed to save global settings");
      }

      setSettings(data.settings);
      setStatus(data.status);
      setMessage("Global settings saved.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown error";
      setMessage(`Failed to save global settings: ${text}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAgent() {
    if (!selectedAgent) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "agent", agent: selectedAgent })
      });

      const data = (await response.json()) as {
        ok: boolean;
        settings?: SettingsBundle;
        status?: SettingsStatus;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.settings || !data.status) {
        throw new Error(data.error ?? "Failed to save agent settings");
      }

      setSettings(data.settings);
      setStatus(data.status);
      setMessage(`Saved credentials for ${selectedAgent.name}.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unknown error";
      setMessage(`Failed to save agent settings: ${text}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-neutral-100">
      <div className="mx-auto w-full max-w-5xl rounded-xl border border-neutral-800 bg-neutral-900/80 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Settings</h1>
          <Link href="/" className="rounded-lg border border-neutral-700 px-3 py-1 text-sm">
            Back to mailbox
          </Link>
        </div>

        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("global")}
            className={`rounded-lg px-3 py-2 text-sm ${
              tab === "global" ? "bg-emerald-500 text-emerald-950" : "border border-neutral-700"
            }`}
          >
            Global
          </button>
          <button
            type="button"
            onClick={() => setTab("agents")}
            className={`rounded-lg px-3 py-2 text-sm ${
              tab === "agents" ? "bg-emerald-500 text-emerald-950" : "border border-neutral-700"
            }`}
          >
            Agents
          </button>
        </div>

        {tab === "global" ? (
          <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <p className="mb-2 text-sm font-medium">Workspace Credentials</p>
            <p className="mb-4 text-xs text-neutral-400">
              Shared across all agents unless an agent override is configured.
            </p>

            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm">Anthropic API Key</label>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    status?.global.anthropicApiKey
                      ? "bg-emerald-700/60 text-emerald-100"
                      : "bg-red-900/50 text-red-200"
                  }`}
                >
                  {status?.global.anthropicApiKey ? "Set" : "Missing"}
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type={show.global_anthropic ? "text" : "password"}
                  value={settings.global.anthropicApiKey}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      global: { ...current.global, anthropicApiKey: event.target.value }
                    }))
                  }
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => setShow((current) => ({ ...current, global_anthropic: !current.global_anthropic }))}
                  className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"
                >
                  {show.global_anthropic ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void saveGlobal();
              }}
              disabled={isLoading || isSaving}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save global settings"}
            </button>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Agents</p>
              <div className="space-y-2">
                {settings.agents.map((agent) => (
                  <button
                    key={agent.agentId}
                    type="button"
                    onClick={() => setSelectedAgentId(agent.agentId)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedAgent?.agentId === agent.agentId
                        ? "border-emerald-500/60 bg-emerald-600/20"
                        : "border-neutral-700"
                    }`}
                  >
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-xs text-neutral-400">{agent.integration}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedAgent ? (
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                <p className="mb-1 text-sm font-medium">{selectedAgent.name}</p>
                <p className="mb-4 text-xs text-neutral-400">
                  Agent-scoped credentials. These do not affect other agents.
                </p>

                <div className="mb-3 flex items-center gap-2">
                  <input
                    id="use-global-anthropic"
                    type="checkbox"
                    checked={selectedAgent.useGlobalAnthropic}
                    onChange={(event) =>
                      updateSelectedAgent({ useGlobalAnthropic: event.target.checked })
                    }
                  />
                  <label htmlFor="use-global-anthropic" className="text-sm">
                    Use global Anthropic API key
                  </label>
                </div>

                {!selectedAgent.useGlobalAnthropic ? (
                  <div className="mb-4">
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-sm">Agent Anthropic override</label>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          selectedStatus?.anthropicApiKeyOverride
                            ? "bg-emerald-700/60 text-emerald-100"
                            : "bg-red-900/50 text-red-200"
                        }`}
                      >
                        {selectedStatus?.anthropicApiKeyOverride ? "Set" : "Missing"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type={show.agent_anthropic ? "text" : "password"}
                        value={selectedAgent.anthropicApiKeyOverride}
                        onChange={(event) =>
                          updateSelectedAgent({ anthropicApiKeyOverride: event.target.value })
                        }
                        className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring-2"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShow((current) => ({ ...current, agent_anthropic: !current.agent_anthropic }))
                        }
                        className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"
                      >
                        {show.agent_anthropic ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {selectedAgent.integration === "twitter" ? (
                  <div className="space-y-4">
                    {[
                      {
                        key: "twitterMcpUrl",
                        label: "Twitter MCP URL",
                        statusKey: "twitterMcpUrl",
                        alwaysShow: true
                      },
                      {
                        key: "twitterApiKey",
                        label: "Twitter API Key",
                        statusKey: "twitterApiKey"
                      },
                      {
                        key: "twitterApiSecret",
                        label: "Twitter API Secret",
                        statusKey: "twitterApiSecret"
                      },
                      {
                        key: "twitterAccessToken",
                        label: "Twitter Access Token",
                        statusKey: "twitterAccessToken"
                      },
                      {
                        key: "twitterAccessSecret",
                        label: "Twitter Access Secret",
                        statusKey: "twitterAccessSecret"
                      }
                    ].map((field) => {
                      const fieldKey = field.key as keyof AgentSettings;
                      const isVisible = field.alwaysShow || show[field.key];

                      return (
                        <div key={field.key}>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-sm">{field.label}</label>
                            <span
                              className={`rounded px-2 py-0.5 text-xs ${
                                selectedStatus?.[field.statusKey as keyof typeof selectedStatus]
                                  ? "bg-emerald-700/60 text-emerald-100"
                                  : "bg-red-900/50 text-red-200"
                              }`}
                            >
                              {selectedStatus?.[field.statusKey as keyof typeof selectedStatus]
                                ? "Set"
                                : "Missing"}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type={isVisible ? "text" : "password"}
                              value={(selectedAgent[fieldKey] as string) ?? ""}
                              onChange={(event) =>
                                updateSelectedAgent({
                                  [fieldKey]: event.target.value
                                } as Partial<AgentSettings>)
                              }
                              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring-2"
                            />
                            {!field.alwaysShow ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setShow((current) => ({ ...current, [field.key]: !current[field.key] }))
                                }
                                className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"
                              >
                                {isVisible ? "Hide" : "Show"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      {
                        key: "discordMcpUrl",
                        label: "Discord MCP URL",
                        statusKey: "discordMcpUrl",
                        alwaysShow: true
                      },
                      {
                        key: "discordBotToken",
                        label: "Discord Bot Token",
                        statusKey: "discordBotToken"
                      },
                      {
                        key: "discordGuildName",
                        label: "Default Guild Name",
                        statusKey: "discordGuildName",
                        alwaysShow: true
                      },
                      {
                        key: "discordDefaultChannelName",
                        label: "Default Channel Name",
                        statusKey: "discordDefaultChannelName",
                        alwaysShow: true
                      }
                    ].map((field) => {
                      const fieldKey = field.key as keyof AgentSettings;
                      const isVisible = field.alwaysShow || show[field.key];

                      return (
                        <div key={field.key}>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-sm">{field.label}</label>
                            <span
                              className={`rounded px-2 py-0.5 text-xs ${
                                selectedStatus?.[field.statusKey as keyof typeof selectedStatus]
                                  ? "bg-emerald-700/60 text-emerald-100"
                                  : "bg-red-900/50 text-red-200"
                              }`}
                            >
                              {selectedStatus?.[field.statusKey as keyof typeof selectedStatus]
                                ? "Set"
                                : "Missing"}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type={isVisible ? "text" : "password"}
                              value={(selectedAgent[fieldKey] as string) ?? ""}
                              onChange={(event) =>
                                updateSelectedAgent({
                                  [fieldKey]: event.target.value
                                } as Partial<AgentSettings>)
                              }
                              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none ring-emerald-400 focus:ring-2"
                            />
                            {!field.alwaysShow ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setShow((current) => ({ ...current, [field.key]: !current[field.key] }))
                                }
                                className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"
                              >
                                {isVisible ? "Hide" : "Show"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    void saveAgent();
                  }}
                  disabled={isLoading || isSaving}
                  className="mt-5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : `Save ${selectedAgent.name} settings`}
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-neutral-700 p-5 text-sm text-neutral-400">
                No agent settings available.
              </div>
            )}
          </section>
        )}

        {message ? <p className="mt-4 text-sm text-neutral-300">{message}</p> : null}
      </div>
    </main>
  );
}

import type { AgentConfig, Conversation } from "../chat/types";

interface SidebarProps {
  agents: AgentConfig[];
  conversations: Conversation[];
  selectedAgentId: string;
  selectedConversationId: string | null;
  recurringConversationIds: Set<string>;
  onSelectAgent: (agentId: string) => void;
  onSelectConversation: (conversationId: string, agentId: string) => void;
}

export function Sidebar({
  agents,
  conversations,
  selectedAgentId,
  selectedConversationId,
  recurringConversationIds,
  onSelectAgent,
  onSelectConversation
}: SidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Agents</p>
      <div className="mb-4 space-y-2">
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            onClick={() => onSelectAgent(agent.id)}
            className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
              selectedAgentId === agent.id
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
            onClick={() => onSelectConversation(conversation.id, conversation.agent_id)}
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
  );
}

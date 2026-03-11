import type { AgentMessage } from "./types";
import { AssistantMarkdown } from "./assistant-markdown";

interface MessageBubbleProps {
  message: AgentMessage;
  agentName: string;
}

export function MessageBubble({ message, agentName }: MessageBubbleProps) {
  return (
    <div
      className={`max-w-[92%] overflow-hidden rounded-xl px-4 py-3 break-words ${
        message.role === "user"
          ? "ml-auto bg-emerald-600/80 text-white"
          : "mr-auto bg-neutral-800 text-neutral-100"
      }`}
    >
      <p className="mb-1 text-xs uppercase tracking-wide opacity-70">
        {message.role === "user" ? "You" : agentName}
      </p>
      {message.role === "user" ? (
        <p className="whitespace-pre-wrap break-words leading-7">{message.content}</p>
      ) : (
        <AssistantMarkdown content={message.content} />
      )}
    </div>
  );
}

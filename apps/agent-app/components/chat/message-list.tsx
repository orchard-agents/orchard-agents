import { useEffect, useRef } from "react";
import type { AgentMessage } from "./types";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  messages: AgentMessage[];
  agentName: string;
  isLoading: boolean;
}

export function MessageList({ messages, agentName, isLoading }: MessageListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isLoading]);

  return (
    <div ref={listRef} className="mb-3 min-h-0 flex-1 overflow-y-auto rounded-lg bg-neutral-900/40 p-3">
      <div className="space-y-3">
        {messages.map((message, index) => (
          <MessageBubble key={`${message.role}-${index}`} message={message} agentName={agentName} />
        ))}

        {isLoading ? (
          <div className="mr-auto inline-flex rounded-xl bg-neutral-800 px-4 py-3 text-sm text-neutral-300">
            Thinking...
          </div>
        ) : null}
      </div>
    </div>
  );
}

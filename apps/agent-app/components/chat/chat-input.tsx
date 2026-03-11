interface ChatInputProps {
  input: string;
  canSend: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({ input, canSend, onInputChange, onSend }: ChatInputProps) {
  return (
    <div className="flex gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-2">
      <input
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        placeholder="Type a message..."
        className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none ring-emerald-400 transition focus:ring-2"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Send
      </button>
    </div>
  );
}

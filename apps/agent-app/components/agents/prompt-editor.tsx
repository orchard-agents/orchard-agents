interface PromptEditorProps {
  promptDraft: string;
  isPromptDirty: boolean;
  promptConfirmed: boolean;
  onPromptChange: (value: string) => void;
  onConfirm: () => void;
}

export function PromptEditor({
  promptDraft,
  isPromptDirty,
  promptConfirmed,
  onPromptChange,
  onConfirm
}: PromptEditorProps) {
  return (
    <aside className="flex min-h-0 flex-col rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
      <p className="mb-1 text-sm font-semibold">Agent Prompt</p>
      <p className="mb-3 text-xs text-neutral-400">Edit then click confirm to apply changes.</p>
      <textarea
        value={promptDraft}
        onChange={(event) => onPromptChange(event.target.value)}
        className="min-h-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-xs leading-5 outline-none ring-emerald-400 focus:ring-2"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onConfirm}
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
  );
}

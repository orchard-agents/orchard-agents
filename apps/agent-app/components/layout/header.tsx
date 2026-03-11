import Link from "next/link";

interface HeaderProps {
  tab: "conversations" | "cron";
  onTabChange: (tab: "conversations" | "cron") => void;
  onLogout: () => void;
}

export function Header({ tab, onTabChange, onLogout }: HeaderProps) {
  return (
    <header className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2">
      <div className="flex items-center gap-2">
        <p className="text-base font-semibold">🌳 Orchard Mailbox</p>
        <div className="ml-3 flex gap-2">
          <button
            type="button"
            onClick={() => onTabChange("conversations")}
            className={`rounded-lg px-3 py-1 text-sm ${
              tab === "conversations" ? "bg-emerald-500 text-emerald-950" : "border border-neutral-700"
            }`}
          >
            Conversations
          </button>
          <button
            type="button"
            onClick={() => onTabChange("cron")}
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
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-neutral-700 px-3 py-1 text-sm"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

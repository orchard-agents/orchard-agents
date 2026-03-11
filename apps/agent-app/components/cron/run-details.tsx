import type { CronJob, CronRun } from "../chat/types";
import { getRunActionBadge } from "../chat/utils";

interface RunDetailsProps {
  selectedJob: CronJob | null;
  runs: CronRun[];
}

export function RunDetails({ selectedJob, runs }: RunDetailsProps) {
  return (
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
  );
}

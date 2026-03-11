export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
}

export interface Conversation {
  id: string;
  agent_id: string;
  title: string;
  updated_at: string;
}

export interface CronJob {
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

export interface CronRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  output: string | null;
  error: string | null;
}

export interface JobFormState {
  name: string;
  prompt: string;
  scheduleType: "every_x_minutes" | "every_x_hours" | "daily_at" | "weekly_at";
  intervalMinutes: string;
  intervalHours: string;
  dailyTime: string;
  weeklyDay: string;
  weeklyTime: string;
  timezone: string;
  enabled: boolean;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClientConfig {
  id: string;
  name: string;
  skills: string[];
  systemPrompt: string;
}

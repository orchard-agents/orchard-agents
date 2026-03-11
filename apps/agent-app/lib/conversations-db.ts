import { DEFAULT_CLIENT_ID } from "@/lib/runtime-settings";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export interface ConversationRecord {
  id: string;
  client_id: string;
  agent_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessageRecord {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  source: "user" | "assistant" | "cron";
  created_at: string;
}

export async function listConversations(clientId = DEFAULT_CLIENT_ID) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id,client_id,agent_id,title,created_at,updated_at")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list conversations: ${error.message}`);
  }

  return (data ?? []) as ConversationRecord[];
}

export async function createConversation(params: {
  clientId?: string;
  agentId: string;
  title: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      client_id: params.clientId ?? DEFAULT_CLIENT_ID,
      agent_id: params.agentId,
      title: params.title,
      updated_at: new Date().toISOString()
    })
    .select("id,client_id,agent_id,title,created_at,updated_at")
    .single<ConversationRecord>();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function updateConversationActivity(conversationId: string, title?: string) {
  const supabase = getSupabaseAdminClient();

  const updatePayload: { updated_at: string; title?: string } = {
    updated_at: new Date().toISOString()
  };

  if (title) {
    updatePayload.title = title;
  }

  const { error } = await supabase.from("conversations").update(updatePayload).eq("id", conversationId);

  if (error) {
    throw new Error(`Failed to update conversation activity: ${error.message}`);
  }
}

export async function listConversationMessages(conversationId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id,conversation_id,role,content,source,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list messages: ${error.message}`);
  }

  return (data ?? []) as ConversationMessageRecord[];
}

export async function appendConversationMessage(params: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  source?: "user" | "assistant" | "cron";
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: params.conversationId,
      role: params.role,
      content: params.content,
      source: params.source ?? (params.role === "assistant" ? "assistant" : "user")
    })
    .select("id,conversation_id,role,content,source,created_at")
    .single<ConversationMessageRecord>();

  if (error || !data) {
    throw new Error(`Failed to append message: ${error?.message ?? "Unknown error"}`);
  }

  await updateConversationActivity(params.conversationId);
  return data;
}

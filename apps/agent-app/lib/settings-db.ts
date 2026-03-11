import { createClient } from "@supabase/supabase-js";
import { decryptSettings, encryptSettings } from "@/lib/settings-crypto";

const TABLE_NAME = "agent_credentials";

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  });
}

export function isSettingsDatabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

interface CredentialsRow {
  client_id: string;
  agent_id: string;
  encrypted_payload: string;
}

export async function readSettingsFromDatabase<T>(clientId: string, agentId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("client_id,agent_id,encrypted_payload")
    .eq("client_id", clientId)
    .eq("agent_id", agentId)
    .single<CredentialsRow>();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw new Error(`Failed reading credentials from database: ${error.message}`);
  }

  const decrypted = decryptSettings(data.encrypted_payload);
  return JSON.parse(decrypted) as T;
}

export async function readAllSettingsFromDatabase(clientId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [] as CredentialsRow[];
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("client_id,agent_id,encrypted_payload")
    .eq("client_id", clientId);

  if (error) {
    throw new Error(`Failed reading all credentials from database: ${error.message}`);
  }

  return (data ?? []) as CredentialsRow[];
}

export async function writeSettingsToDatabase<T>(clientId: string, agentId: string, settings: T) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  const encryptedPayload = encryptSettings(JSON.stringify(settings));

  const { error } = await supabase.from(TABLE_NAME).upsert(
    {
      client_id: clientId,
      agent_id: agentId,
      encrypted_payload: encryptedPayload,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "client_id,agent_id"
    }
  );

  if (error) {
    throw new Error(`Failed writing credentials to database: ${error.message}`);
  }
}

export function decryptRowPayload<T>(row: CredentialsRow) {
  const decrypted = decryptSettings(row.encrypted_payload);
  return JSON.parse(decrypted) as T;
}

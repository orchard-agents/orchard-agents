import { getDiscordRuntimeConfig } from "@/lib/runtime-config";

interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
}

interface DiscordGuild {
  id: string;
  name: string;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author: {
    username: string;
    global_name: string | null;
  };
}

const DISCORD_API_BASE = "https://discord.com/api/v10";

function normalizeName(name: string) {
  return name.trim().replace(/^#/, "").toLowerCase();
}

async function discordRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { discordBotToken } = getDiscordRuntimeConfig();

  if (!discordBotToken) {
    throw new Error("Discord MCP is not configured. Missing DISCORD_BOT_TOKEN.");
  }

  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${discordBotToken}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord API error (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

async function resolveGuild(guildName?: string) {
  const config = getDiscordRuntimeConfig();
  const targetName = normalizeName(guildName || config.discordGuildName);
  const guilds = await discordRequest<DiscordGuild[]>("/users/@me/guilds?limit=200");
  const found = guilds.find((guild) => normalizeName(guild.name) === targetName);

  if (!found) {
    throw new Error(`Guild not found for name '${guildName || config.discordGuildName}'.`);
  }

  return found;
}

async function resolveChannel(guildId: string, channelName?: string) {
  const config = getDiscordRuntimeConfig();
  const targetName = normalizeName(channelName || config.discordDefaultChannelName);
  const channels = await discordRequest<DiscordChannel[]>(`/guilds/${guildId}/channels`);
  const found = channels.find(
    (channel) => (channel.type === 0 || channel.type === 5) && normalizeName(channel.name) === targetName
  );

  if (!found) {
    throw new Error(
      `Channel not found for name '${channelName || config.discordDefaultChannelName}' in selected guild.`
    );
  }

  return found;
}

export async function postMessage(text: string, channelName?: string, guildName?: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Message text cannot be empty.");
  }

  const guild = await resolveGuild(guildName);
  const channel = await resolveChannel(guild.id, channelName);
  const created = await discordRequest<DiscordMessage>(`/channels/${channel.id}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: trimmed
    })
  });

  return {
    id: created.id,
    guild: guild.name,
    channel: channel.name,
    url: `https://discord.com/channels/${guild.id}/${channel.id}/${created.id}`
  };
}

export async function getChannelMessages(count = 10, channelName?: string, guildName?: string) {
  const limit = Math.min(Math.max(Math.floor(count), 1), 50);
  const guild = await resolveGuild(guildName);
  const channel = await resolveChannel(guild.id, channelName);
  const messages = await discordRequest<DiscordMessage[]>(`/channels/${channel.id}/messages?limit=${limit}`);

  return messages.map((message) => ({
    id: message.id,
    author: message.author.global_name || message.author.username,
    text: message.content,
    createdAt: message.timestamp,
    channel: channel.name,
    guild: guild.name
  }));
}

export async function searchChannelMessages(
  query: string,
  count = 10,
  channelName?: string,
  guildName?: string
) {
  const trimmed = query.trim();

  if (!trimmed) {
    throw new Error("Search query cannot be empty.");
  }

  const sampleCount = Math.min(Math.max(Math.floor(count) * 4, 20), 100);
  const messages = await getChannelMessages(sampleCount, channelName, guildName);
  const queryLower = trimmed.toLowerCase();

  return messages
    .filter((message) => message.text.toLowerCase().includes(queryLower))
    .slice(0, Math.min(Math.max(Math.floor(count), 1), 25));
}

export async function getBotProfile(guildName?: string) {
  const user = await discordRequest<DiscordUser>("/users/@me");
  const guild = await resolveGuild(guildName);

  return {
    id: user.id,
    name: user.global_name || user.username,
    username: user.username,
    guild: guild.name,
    defaultChannel: getDiscordRuntimeConfig().discordDefaultChannelName
  };
}

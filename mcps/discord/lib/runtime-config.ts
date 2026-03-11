export interface DiscordRuntimeConfig {
  discordBotToken: string;
  discordGuildName: string;
  discordDefaultChannelName: string;
}

interface RuntimeStore {
  config: Partial<DiscordRuntimeConfig>;
}

declare global {
  var __discordRuntimeStore__: RuntimeStore | undefined;
}

function getStore() {
  if (!globalThis.__discordRuntimeStore__) {
    globalThis.__discordRuntimeStore__ = { config: {} };
  }

  return globalThis.__discordRuntimeStore__;
}

export function getDiscordRuntimeConfig(): DiscordRuntimeConfig {
  const overrides = getStore().config;

  return {
    discordBotToken: overrides.discordBotToken ?? process.env.DISCORD_BOT_TOKEN ?? "",
    discordGuildName: overrides.discordGuildName ?? process.env.DISCORD_GUILD_NAME ?? "orchard agents",
    discordDefaultChannelName:
      overrides.discordDefaultChannelName ?? process.env.DISCORD_DEFAULT_CHANNEL_NAME ?? "general"
  };
}

export function updateDiscordRuntimeConfig(partial: Partial<DiscordRuntimeConfig>) {
  const store = getStore();
  store.config = {
    ...store.config,
    ...partial
  };

  return getDiscordRuntimeConfig();
}

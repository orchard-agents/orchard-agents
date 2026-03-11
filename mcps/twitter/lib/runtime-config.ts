export interface TwitterRuntimeConfig {
  twitterApiKey: string;
  twitterApiSecret: string;
  twitterAccessToken: string;
  twitterAccessSecret: string;
}

interface RuntimeStore {
  config: Partial<TwitterRuntimeConfig>;
}

declare global {
  var __twitterRuntimeStore__: RuntimeStore | undefined;
}

function getStore() {
  if (!globalThis.__twitterRuntimeStore__) {
    globalThis.__twitterRuntimeStore__ = { config: {} };
  }

  return globalThis.__twitterRuntimeStore__;
}

export function getTwitterRuntimeConfig(): TwitterRuntimeConfig {
  const overrides = getStore().config;

  return {
    twitterApiKey: overrides.twitterApiKey ?? process.env.TWITTER_API_KEY ?? "",
    twitterApiSecret: overrides.twitterApiSecret ?? process.env.TWITTER_API_SECRET ?? "",
    twitterAccessToken: overrides.twitterAccessToken ?? process.env.TWITTER_ACCESS_TOKEN ?? "",
    twitterAccessSecret: overrides.twitterAccessSecret ?? process.env.TWITTER_ACCESS_SECRET ?? ""
  };
}

export function updateTwitterRuntimeConfig(partial: Partial<TwitterRuntimeConfig>) {
  const store = getStore();
  store.config = {
    ...store.config,
    ...partial
  };

  return getTwitterRuntimeConfig();
}

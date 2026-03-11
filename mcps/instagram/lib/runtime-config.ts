export interface InstagramRuntimeConfig {
  facebookAccessToken: string;
  instagramBusinessAccountId: string;
}

interface RuntimeStore {
  config: Partial<InstagramRuntimeConfig>;
}

declare global {
  var __instagramRuntimeStore__: RuntimeStore | undefined;
}

function getStore() {
  if (!globalThis.__instagramRuntimeStore__) {
    globalThis.__instagramRuntimeStore__ = { config: {} };
  }

  return globalThis.__instagramRuntimeStore__;
}

export function getInstagramRuntimeConfig(): InstagramRuntimeConfig {
  const overrides = getStore().config;

  return {
    facebookAccessToken: overrides.facebookAccessToken ?? process.env.FACEBOOK_ACCESS_TOKEN ?? "",
    instagramBusinessAccountId:
      overrides.instagramBusinessAccountId ?? process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? ""
  };
}

export function updateInstagramRuntimeConfig(partial: Partial<InstagramRuntimeConfig>) {
  const store = getStore();
  store.config = {
    ...store.config,
    ...partial
  };

  return getInstagramRuntimeConfig();
}

export interface LinkedInRuntimeConfig {
  linkedinAccessToken: string;
  linkedinPersonUrn: string;
}

interface RuntimeStore {
  config: Partial<LinkedInRuntimeConfig>;
}

declare global {
  var __linkedinRuntimeStore__: RuntimeStore | undefined;
}

function getStore() {
  if (!globalThis.__linkedinRuntimeStore__) {
    globalThis.__linkedinRuntimeStore__ = { config: {} };
  }

  return globalThis.__linkedinRuntimeStore__;
}

export function getLinkedInRuntimeConfig(): LinkedInRuntimeConfig {
  const overrides = getStore().config;

  return {
    linkedinAccessToken: overrides.linkedinAccessToken ?? process.env.LINKEDIN_ACCESS_TOKEN ?? "",
    linkedinPersonUrn: overrides.linkedinPersonUrn ?? process.env.LINKEDIN_PERSON_URN ?? ""
  };
}

export function updateLinkedInRuntimeConfig(partial: Partial<LinkedInRuntimeConfig>) {
  const store = getStore();
  store.config = {
    ...store.config,
    ...partial
  };

  return getLinkedInRuntimeConfig();
}

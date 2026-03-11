import { getLinkedInRuntimeConfig } from "@/lib/runtime-config";

const LINKEDIN_API_BASE = "https://api.linkedin.com";
const LINKEDIN_VERSION = "202401";

interface PostResult {
  id: string;
  url: string;
}

interface Profile {
  personUrn: string;
  name: string;
  vanityName: string;
}

interface LinkedInPost {
  id: string;
  text: string;
  createdAt: number;
  visibility: string;
}

function getConfig() {
  const config = getLinkedInRuntimeConfig();
  const required = {
    LINKEDIN_ACCESS_TOKEN: config.linkedinAccessToken,
    LINKEDIN_PERSON_URN: config.linkedinPersonUrn
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `LinkedIn MCP is not configured. Missing: ${missing.join(", ")}.`
    );
  }

  return config;
}

async function linkedinFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const config = getConfig();

  const response = await fetch(`${LINKEDIN_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.linkedinAccessToken}`,
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      ...options?.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data?.message ?? `HTTP ${response.status}`;
    throw new Error(`LinkedIn API error: ${errorMessage}`);
  }

  return data as T;
}

export async function createTextPost(text: string): Promise<PostResult> {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("Post text cannot be empty.");
  }

  if (trimmedText.length > 3000) {
    throw new Error("Post text must be 3000 characters or fewer.");
  }

  const config = getConfig();

  const data = await linkedinFetch<{ id: string }>("/rest/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      author: config.linkedinPersonUrn,
      commentary: trimmedText,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: "PUBLISHED"
    })
  });

  const postId = data.id;

  return {
    id: postId,
    url: `https://www.linkedin.com/feed/update/${postId}/`
  };
}

export async function shareArticle(
  articleUrl: string,
  commentary: string,
  title?: string,
  description?: string
): Promise<PostResult> {
  const config = getConfig();

  const content: Record<string, unknown> = {
    article: {
      source: articleUrl,
      ...(title && { title }),
      ...(description && { description })
    }
  };

  const data = await linkedinFetch<{ id: string }>("/rest/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      author: config.linkedinPersonUrn,
      commentary: commentary.trim(),
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      content,
      lifecycleState: "PUBLISHED"
    })
  });

  const postId = data.id;

  return {
    id: postId,
    url: `https://www.linkedin.com/feed/update/${postId}/`
  };
}

export async function getMyProfile(): Promise<Profile> {
  const data = await linkedinFetch<{
    sub: string;
    name: string;
    vanityName?: string;
  }>("/v2/userinfo");

  return {
    personUrn: `urn:li:person:${data.sub}`,
    name: data.name,
    vanityName: data.vanityName ?? ""
  };
}

export async function getRecentPosts(count = 10): Promise<LinkedInPost[]> {
  const config = getConfig();
  const limit = Math.min(Math.max(Math.floor(count), 1), 25);
  const authorParam = encodeURIComponent(config.linkedinPersonUrn);

  const data = await linkedinFetch<{
    elements: Array<{
      id: string;
      commentary?: string;
      createdAt?: number;
      visibility?: string;
    }>;
  }>(`/rest/posts?author=${authorParam}&q=author&count=${limit}&sortBy=LAST_MODIFIED`);

  return data.elements.map((post) => ({
    id: post.id,
    text: post.commentary ?? "",
    createdAt: post.createdAt ?? 0,
    visibility: post.visibility ?? "PUBLIC"
  }));
}

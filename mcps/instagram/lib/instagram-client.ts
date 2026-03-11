import { getInstagramRuntimeConfig } from "@/lib/runtime-config";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

interface PublishResult {
  id: string;
  url: string;
}

interface MediaItem {
  id: string;
  caption: string | null;
  mediaType: string;
  mediaUrl: string | null;
  timestamp: string;
  permalink: string | null;
}

interface Profile {
  id: string;
  name: string;
  username: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
}

interface MediaInsights {
  id: string;
  metrics: Record<string, number>;
}

function getConfig() {
  const config = getInstagramRuntimeConfig();
  const required = {
    FACEBOOK_ACCESS_TOKEN: config.facebookAccessToken,
    INSTAGRAM_BUSINESS_ACCOUNT_ID: config.instagramBusinessAccountId
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Instagram MCP is not configured. Missing: ${missing.join(", ")}.`
    );
  }

  return config;
}

async function graphFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const config = getConfig();
  const url = new URL(`${GRAPH_API_BASE}${path}`);

  if (!options?.method || options.method === "GET") {
    url.searchParams.set("access_token", config.facebookAccessToken);
  }

  const response = await fetch(url.toString(), options);
  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Instagram Graph API error: ${errorMessage}`);
  }

  return data as T;
}

async function graphPost<T>(path: string, body: Record<string, string>): Promise<T> {
  const config = getConfig();
  const params = new URLSearchParams({ ...body, access_token: config.facebookAccessToken });

  return graphFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });
}

export async function publishPhoto(
  imageUrl: string,
  caption: string
): Promise<PublishResult> {
  const config = getConfig();
  const igId = config.instagramBusinessAccountId;

  const container = await graphPost<{ id: string }>(`/${igId}/media`, {
    image_url: imageUrl,
    caption
  });

  const published = await graphPost<{ id: string }>(`/${igId}/media_publish`, {
    creation_id: container.id
  });

  return {
    id: published.id,
    url: `https://www.instagram.com/p/${published.id}/`
  };
}

export async function publishCarousel(
  imageUrls: string[],
  caption: string
): Promise<PublishResult> {
  if (imageUrls.length < 2 || imageUrls.length > 10) {
    throw new Error("Carousel requires between 2 and 10 images.");
  }

  const config = getConfig();
  const igId = config.instagramBusinessAccountId;

  const containerIds: string[] = [];
  for (const url of imageUrls) {
    const child = await graphPost<{ id: string }>(`/${igId}/media`, {
      image_url: url,
      is_carousel_item: "true"
    });
    containerIds.push(child.id);
  }

  const carousel = await graphPost<{ id: string }>(`/${igId}/media`, {
    media_type: "CAROUSEL",
    children: containerIds.join(","),
    caption
  });

  const published = await graphPost<{ id: string }>(`/${igId}/media_publish`, {
    creation_id: carousel.id
  });

  return {
    id: published.id,
    url: `https://www.instagram.com/p/${published.id}/`
  };
}

export async function getMyProfile(): Promise<Profile> {
  const config = getConfig();
  const igId = config.instagramBusinessAccountId;

  const data = await graphFetch<{
    id: string;
    name: string;
    username: string;
    biography: string;
    followers_count: number;
    follows_count: number;
    media_count: number;
  }>(`/${igId}?fields=id,name,username,biography,followers_count,follows_count,media_count`);

  return {
    id: data.id,
    name: data.name,
    username: data.username,
    biography: data.biography,
    followersCount: data.followers_count,
    followsCount: data.follows_count,
    mediaCount: data.media_count
  };
}

export async function getRecentMedia(count = 10): Promise<MediaItem[]> {
  const config = getConfig();
  const igId = config.instagramBusinessAccountId;
  const limit = Math.min(Math.max(Math.floor(count), 1), 25);

  const data = await graphFetch<{
    data: Array<{
      id: string;
      caption?: string;
      media_type: string;
      media_url?: string;
      timestamp: string;
      permalink?: string;
    }>;
  }>(`/${igId}/media?fields=id,caption,media_type,media_url,timestamp,permalink&limit=${limit}`);

  return data.data.map((item) => ({
    id: item.id,
    caption: item.caption ?? null,
    mediaType: item.media_type,
    mediaUrl: item.media_url ?? null,
    timestamp: item.timestamp,
    permalink: item.permalink ?? null
  }));
}

export async function getMediaInsights(mediaId: string): Promise<MediaInsights> {
  const data = await graphFetch<{
    data: Array<{ name: string; values: Array<{ value: number }> }>;
  }>(`/${mediaId}/insights?metric=impressions,reach,likes,comments,shares,saved`);

  const metrics: Record<string, number> = {};
  for (const metric of data.data) {
    metrics[metric.name] = metric.values[0]?.value ?? 0;
  }

  return { id: mediaId, metrics };
}

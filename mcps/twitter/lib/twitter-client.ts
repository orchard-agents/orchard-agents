import { TwitterApi } from "twitter-api-v2";
import { getTwitterRuntimeConfig } from "@/lib/runtime-config";

interface TimelineTweet {
  id: string;
  text: string;
  createdAt: string | null;
  metrics: {
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
  };
}

interface SearchTweet {
  id: string;
  author: string;
  text: string;
  createdAt: string | null;
}

interface Profile {
  name: string;
  handle: string;
  bio: string;
  followers: number;
  following: number;
}

function getTwitterClient() {
  const config = getTwitterRuntimeConfig();
  const required = {
    TWITTER_API_KEY: config.twitterApiKey,
    TWITTER_API_SECRET: config.twitterApiSecret,
    TWITTER_ACCESS_TOKEN: config.twitterAccessToken,
    TWITTER_ACCESS_SECRET: config.twitterAccessSecret
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Twitter MCP is not configured. Missing environment variables: ${missing.join(", ")}.`
    );
  }

  return new TwitterApi({
    appKey: config.twitterApiKey,
    appSecret: config.twitterApiSecret,
    accessToken: config.twitterAccessToken,
    accessSecret: config.twitterAccessSecret
  }).readWrite;
}

export async function postTweet(text: string) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("Tweet text cannot be empty.");
  }

  if (trimmedText.length > 280) {
    throw new Error("Tweet text must be 280 characters or fewer.");
  }

  const client = getTwitterClient();
  const created = await client.v2.tweet(trimmedText);
  const tweetId = created.data.id;

  return {
    id: tweetId,
    url: `https://twitter.com/i/web/status/${tweetId}`
  };
}

export async function getMyTimeline(count = 10): Promise<TimelineTweet[]> {
  const client = getTwitterClient();
  const me = await client.v2.me({ "user.fields": ["username"] });
  const requestedCount = Math.min(Math.max(Math.floor(count), 1), 25);
  const maxResults = Math.max(5, requestedCount);
  const timeline = await client.v2.userTimeline(me.data.id, {
    max_results: maxResults,
    "tweet.fields": ["created_at", "public_metrics"]
  });

  return timeline.tweets.slice(0, requestedCount).map((tweet) => ({
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.created_at ?? null,
    metrics: {
      likes: tweet.public_metrics?.like_count ?? 0,
      replies: tweet.public_metrics?.reply_count ?? 0,
      reposts: tweet.public_metrics?.retweet_count ?? 0,
      quotes: tweet.public_metrics?.quote_count ?? 0
    }
  }));
}

export async function searchTweets(query: string, count = 10): Promise<SearchTweet[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    throw new Error("Search query cannot be empty.");
  }

  const client = getTwitterClient();
  const requestedCount = Math.min(Math.max(Math.floor(count), 1), 25);
  const maxResults = Math.max(10, requestedCount);

  const search = await client.v2.search(trimmedQuery, {
    max_results: maxResults,
    expansions: ["author_id"],
    "tweet.fields": ["created_at", "author_id"],
    "user.fields": ["name", "username"]
  });

  const users = new Map(
    (search.includes?.users ?? []).map((user) => [
      user.id,
      `${user.name} (@${user.username})`
    ])
  );

  return search.tweets.slice(0, requestedCount).map((tweet) => ({
    id: tweet.id,
    author: users.get(tweet.author_id ?? "") ?? "Unknown",
    text: tweet.text,
    createdAt: tweet.created_at ?? null
  }));
}

export async function getMyProfile(): Promise<Profile> {
  const client = getTwitterClient();
  const me = await client.v2.me({
    "user.fields": ["description", "public_metrics", "username", "name"]
  });

  return {
    name: me.data.name,
    handle: `@${me.data.username}`,
    bio: me.data.description ?? "",
    followers: me.data.public_metrics?.followers_count ?? 0,
    following: me.data.public_metrics?.following_count ?? 0
  };
}

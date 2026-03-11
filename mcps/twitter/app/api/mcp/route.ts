import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  getMyProfile,
  getMyTimeline,
  postTweet,
  searchTweets
} from "@/lib/twitter-client";

function toTextResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

function toErrorResult(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown MCP tool error";

  return {
    content: [
      {
        type: "text" as const,
        text: `Error: ${message}`
      }
    ],
    isError: true
  };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "post_tweet",
      {
        title: "Post Tweet",
        description: "Post a tweet on behalf of the authenticated user.",
        inputSchema: {
          text: z.string().max(280)
        }
      },
      async ({ text }) => {
        try {
          const result = await postTweet(text);
          return toTextResult(result);
        } catch (error) {
          return toErrorResult(error);
        }
      }
    );

    server.registerTool(
      "get_my_timeline",
      {
        title: "Get My Timeline",
        description: "Get recent tweets from the authenticated user's timeline.",
        inputSchema: {
          count: z.number().int().min(1).max(25).default(10)
        }
      },
      async ({ count = 10 }) => {
        try {
          const tweets = await getMyTimeline(count);
          return toTextResult(tweets);
        } catch (error) {
          return toErrorResult(error);
        }
      }
    );

    server.registerTool(
      "search_tweets",
      {
        title: "Search Tweets",
        description: "Search recent public tweets by query.",
        inputSchema: {
          query: z.string().min(1),
          count: z.number().int().min(1).max(25).default(10)
        }
      },
      async ({ query, count = 10 }) => {
        try {
          const tweets = await searchTweets(query, count);
          return toTextResult(tweets);
        } catch (error) {
          return toErrorResult(error);
        }
      }
    );

    server.registerTool(
      "get_my_profile",
      {
        title: "Get My Profile",
        description: "Get profile information for the authenticated user.",
        inputSchema: {}
      },
      async () => {
        try {
          const profile = await getMyProfile();
          return toTextResult(profile);
        } catch (error) {
          return toErrorResult(error);
        }
      }
    );
  },
  {},
  {
    basePath: "/api"
  }
);

export { handler as GET, handler as POST, handler as DELETE };

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  getBotProfile,
  getChannelMessages,
  postMessage,
  searchChannelMessages
} from "@/lib/discord-client";

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
      "post_message",
      {
        title: "Post Message",
        description: "Post a message to a Discord channel.",
        inputSchema: {
          text: z.string().min(1),
          channelName: z.string().optional(),
          guildName: z.string().optional()
        }
      },
      async ({ text, channelName, guildName }) => {
        try {
          const result = await postMessage(text, channelName, guildName);
          return toTextResult(result);
        } catch (error) {
          return toErrorResult(error);
        }
      }
    );

    server.registerTool(
      "get_channel_messages",
      {
        title: "Get Channel Messages",
        description: "Get recent messages from a Discord channel.",
        inputSchema: {
          count: z.number().int().min(1).max(50).default(10),
          channelName: z.string().optional(),
          guildName: z.string().optional()
        }
      },
      async ({ count = 10, channelName, guildName }) => {
        try {
          const messages = await getChannelMessages(count, channelName, guildName);
          return toTextResult(messages);
        } catch (error) {
          return toErrorResult(error);
        }
      }
    );

    server.registerTool(
      "search_channel_messages",
      {
        title: "Search Channel Messages",
        description: "Search recent messages in a Discord channel by query.",
        inputSchema: {
          query: z.string().min(1),
          count: z.number().int().min(1).max(25).default(10),
          channelName: z.string().optional(),
          guildName: z.string().optional()
        }
      },
      async ({ query, count = 10, channelName, guildName }) => {
        try {
          const messages = await searchChannelMessages(query, count, channelName, guildName);
          return toTextResult(messages);
        } catch (error) {
          return toErrorResult(error);
        }
      }
    );

    server.registerTool(
      "get_bot_profile",
      {
        title: "Get Bot Profile",
        description: "Get Discord bot profile and default guild context.",
        inputSchema: {
          guildName: z.string().optional()
        }
      },
      async ({ guildName }) => {
        try {
          const profile = await getBotProfile(guildName);
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

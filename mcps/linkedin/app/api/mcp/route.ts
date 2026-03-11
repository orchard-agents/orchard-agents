import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  createTextPost,
  getMyProfile,
  getRecentPosts,
  shareArticle
} from "@/lib/linkedin-client";

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
      "create_text_post",
      {
        title: "Create Text Post",
        description: "Create a text-only post on LinkedIn.",
        inputSchema: {
          text: z.string().max(3000)
        }
      },
      async ({ text }) => {
        try {
          const result = await createTextPost(text);
          return toTextResult(result);
        } catch (error) {
          return toErrorResult(error);
        }
      }
    );

    server.registerTool(
      "share_article",
      {
        title: "Share Article",
        description: "Share an article link on LinkedIn with optional commentary.",
        inputSchema: {
          article_url: z.string().url(),
          commentary: z.string().max(3000).default(""),
          title: z.string().max(200).optional(),
          description: z.string().max(500).optional()
        }
      },
      async ({ article_url, commentary = "", title, description }) => {
        try {
          const result = await shareArticle(article_url, commentary, title, description);
          return toTextResult(result);
        } catch (error) {
          return toErrorResult(error);
        }
      }
    );

    server.registerTool(
      "get_my_profile",
      {
        title: "Get My Profile",
        description: "Get profile information for the authenticated LinkedIn user.",
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

    server.registerTool(
      "get_recent_posts",
      {
        title: "Get Recent Posts",
        description: "Get recent posts from the authenticated LinkedIn user.",
        inputSchema: {
          count: z.number().int().min(1).max(25).default(10)
        }
      },
      async ({ count = 10 }) => {
        try {
          const posts = await getRecentPosts(count);
          return toTextResult(posts);
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

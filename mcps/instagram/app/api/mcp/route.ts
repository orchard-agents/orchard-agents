import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  getMyProfile,
  getRecentMedia,
  getMediaInsights,
  publishPhoto,
  publishCarousel
} from "@/lib/instagram-client";

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
      "publish_photo",
      {
        title: "Publish Photo",
        description:
          "Publish a single photo to Instagram. The image_url must be a publicly accessible URL.",
        inputSchema: {
          image_url: z.string().url(),
          caption: z.string().max(2200).default("")
        }
      },
      async ({ image_url, caption = "" }) => {
        try {
          const result = await publishPhoto(image_url, caption);
          return toTextResult(result);
        } catch (error) {
          return toErrorResult(error);
        }
      }
    );

    server.registerTool(
      "publish_carousel",
      {
        title: "Publish Carousel",
        description:
          "Publish a carousel post (2-10 images) to Instagram. All image URLs must be publicly accessible.",
        inputSchema: {
          image_urls: z.array(z.string().url()).min(2).max(10),
          caption: z.string().max(2200).default("")
        }
      },
      async ({ image_urls, caption = "" }) => {
        try {
          const result = await publishCarousel(image_urls, caption);
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
        description: "Get profile information for the connected Instagram business account.",
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
      "get_recent_media",
      {
        title: "Get Recent Media",
        description: "Get recent media posts from the connected Instagram business account.",
        inputSchema: {
          count: z.number().int().min(1).max(25).default(10)
        }
      },
      async ({ count = 10 }) => {
        try {
          const media = await getRecentMedia(count);
          return toTextResult(media);
        } catch (error) {
          return toErrorResult(error);
        }
      }
    );

    server.registerTool(
      "get_media_insights",
      {
        title: "Get Media Insights",
        description: "Get engagement insights (impressions, reach, likes, etc.) for a specific media post.",
        inputSchema: {
          media_id: z.string().min(1)
        }
      },
      async ({ media_id }) => {
        try {
          const insights = await getMediaInsights(media_id);
          return toTextResult(insights);
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

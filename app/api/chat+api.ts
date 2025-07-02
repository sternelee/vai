import { aiService, type AIConfig } from "@/services/AIService";
import { convertToModelMessages, streamText, UIMessage } from "ai";

// https://github.com/EvanBacon/expo-ai

// Get provider instance using AIService factory functions
const getProviderInstance = (config: AIConfig) => {
  // @ts-ignore - Access static providerFactories from AIService class
  const factory = aiService.constructor.providerFactories[config.provider];
  if (!factory) {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }
  return factory(config);
};

export async function POST(req: Request) {
  try {
    const { messages, config }: { messages: UIMessage[]; config: AIConfig } =
      await req.json();

    if (!config || !config.provider || !config.model) {
      return new Response(
        JSON.stringify({ error: "AI configuration not provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const provider = getProviderInstance(config);
    const model = provider(config.model);

    const result = streamText({
      model,
      messages: convertToModelMessages(messages), // Convert UIMessages to ModelMessages
      temperature: 0.7,
    });

    // Use new UI message stream response for AI SDK 5 with SSE protocol
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}


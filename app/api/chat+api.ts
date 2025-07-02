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
  console.log("API route called"); // Debug log
  
  try {
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2)); // Debug log
    
    const { messages, config }: { messages: UIMessage[]; config: AIConfig } = body;

    console.log("Parsed messages:", messages); // Debug log
    console.log("Parsed config:", config); // Debug log

    if (!config || !config.provider || !config.model) {
      console.error("Invalid config:", config); // Debug log
      return new Response(
        JSON.stringify({ error: "AI configuration not provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("Invalid messages:", messages); // Debug log
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("Creating provider instance..."); // Debug log
    const provider = getProviderInstance(config);
    const model = provider(config.model);
    console.log("Provider instance created successfully"); // Debug log

    console.log("Converting messages..."); // Debug log
    const convertedMessages = convertToModelMessages(messages);
    console.log("Converted messages:", convertedMessages); // Debug log

    console.log("Starting stream..."); // Debug log
    const result = streamText({
      model,
      messages: convertedMessages,
      temperature: 0.7,
    });

    console.log("Stream created, returning response..."); // Debug log
    // Use new UI message stream response for AI SDK 5 with SSE protocol
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    console.error("Error stack:", (error as Error).stack); // Debug log
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        stack: process.env.NODE_ENV === "development" ? (error as Error).stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

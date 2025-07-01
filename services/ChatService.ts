import type { ChatSessionInfo, Message } from "../types/chat";
import { aiService } from "./AIService";
import DatabaseService from "./DatabaseService";

export class ChatService {
  private currentSessionId: string | null = null;

  // Create a new chat session
  async createSession(pageTitle: string, pageUrl?: string): Promise<string> {
    try {
      const sessionId = await DatabaseService.createChatSession(
        pageTitle,
        pageUrl,
      );
      this.currentSessionId = sessionId;
      return sessionId;
    } catch (error) {
      console.error("Failed to create chat session:", error);
      throw error;
    }
  }

  // Get or create session for current page
  async getOrCreateSession(
    pageTitle: string,
    pageUrl?: string,
  ): Promise<string> {
    if (!this.currentSessionId) {
      return this.createSession(pageTitle, pageUrl);
    }
    return this.currentSessionId;
  }

  // Send message and get streaming response
  async sendMessage(
    content: string,
    sessionId: string,
    context?: string,
    conversationHistory: Message[] = [],
  ): Promise<{
    userMessage: Message;
    responseStream: ReadableStream<string>;
    assistantMessageId: string;
  }> {
    try {
      // Create user message
      const userMessage: Message = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: "user",
        content,
        createdAt: new Date(),
      };

      // Save user message to database
      await DatabaseService.saveChatMessage(userMessage, sessionId);

      // Prepare conversation history for AI
      const historyForAI = conversationHistory.map((msg) => ({
        role: msg.role as any,
        content:
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
      }));

      // Get AI response stream
      const responseStream = await aiService.streamResponse(
        content,
        context,
        historyForAI,
      );

      const assistantMessageId = `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        userMessage,
        responseStream,
        assistantMessageId,
      };
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }

  // Save assistant message after streaming is complete
  async saveAssistantMessage(
    sessionId: string,
    messageId: string,
    content: string,
    toolInvocations?: any[],
  ): Promise<void> {
    try {
      const assistantMessage: Message = {
        id: messageId,
        role: "assistant",
        content,
        toolInvocations,
        createdAt: new Date(),
      };

      await DatabaseService.saveChatMessage(assistantMessage, sessionId);
    } catch (error) {
      console.error("Failed to save assistant message:", error);
      throw error;
    }
  }

  // Get messages for a session
  async getMessages(sessionId: string, limit?: number): Promise<Message[]> {
    try {
      return await DatabaseService.getChatMessages(sessionId, limit);
    } catch (error) {
      console.error("Failed to get messages:", error);
      return [];
    }
  }

  // Get all chat sessions
  async getSessions(limit?: number): Promise<ChatSessionInfo[]> {
    try {
      return await DatabaseService.getChatSessions(limit);
    } catch (error) {
      console.error("Failed to get sessions:", error);
      return [];
    }
  }

  // Clear chat history for a session
  async clearHistory(sessionId: string): Promise<void> {
    try {
      await DatabaseService.clearChatHistory(sessionId);
    } catch (error) {
      console.error("Failed to clear chat history:", error);
      throw error;
    }
  }

  // Delete a chat session
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await DatabaseService.deleteChatSession(sessionId);
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      throw error;
    }
  }

  // Update session title
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    try {
      await DatabaseService.updateChatSessionTitle(sessionId, title);
    } catch (error) {
      console.error("Failed to update session title:", error);
      throw error;
    }
  }

  // Generate title from first message
  async generateSessionTitle(sessionId: string): Promise<string> {
    try {
      const messages = await this.getMessages(sessionId, 1);
      if (messages.length === 0) return "New Chat";

      const firstMessage = messages[0];
      const content =
        typeof firstMessage.content === "string"
          ? firstMessage.content
          : JSON.stringify(firstMessage.content);

      // Generate a short title using AI
      if (aiService.isConfigured()) {
        try {
          const title = await aiService.generateText(
            `Create a short title (3-5 words) for this chat based on the first message: "${content.substring(0, 200)}"`,
          );
          return title.substring(0, 50).trim();
        } catch (error) {
          console.warn("Failed to generate AI title:", error);
        }
      }

      // Fallback: use first few words of the message
      const words = content.split(" ").slice(0, 4).join(" ");
      return words.length > 30 ? words.substring(0, 30) + "..." : words;
    } catch (error) {
      console.error("Failed to generate session title:", error);
      return "New Chat";
    }
  }

  // Get current session ID
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  // Set current session ID
  setCurrentSessionId(sessionId: string | null): void {
    this.currentSessionId = sessionId;
  }

  // Check if AI is configured
  isAIConfigured(): boolean {
    return aiService.isConfigured();
  }

  // Get AI configuration status
  getAIStatus() {
    return aiService.getProviderStatus();
  }

  // Get chat statistics
  async getStats() {
    try {
      const dbStats = await DatabaseService.getChatStats();
      const mcpStats = aiService.getMCPStatistics();
      const hasMCP = await aiService.hasMCPTools();

      return {
        ...dbStats,
        mcpToolsAvailable: hasMCP,
        mcpStats,
      };
    } catch (error) {
      console.error("Failed to get chat stats:", error);
      return {
        totalSessions: 0,
        totalMessages: 0,
        activeSessions: 0,
        mcpToolsAvailable: false,
        mcpStats: null,
      };
    }
  }
}

export const chatService = new ChatService();



// Compatible with @ai-sdk/react Message structure
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | (TextPart | ImagePart)[];
  toolInvocations?: ToolInvocation[];
  experimental_attachments?: Attachment[];
  createdAt?: Date;
}

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ImagePart {
  type: 'image';
  image: string | Uint8Array | Buffer | ArrayBuffer | URL;
  mimeType?: string;
}

export interface ToolInvocation {
  state: 'partial-call' | 'call' | 'result';
  toolCallId: string;
  toolName: string;
  args?: any;
  result?: any;
}

export interface Attachment {
  name?: string;
  contentType?: string;
  url?: string;
  size?: number;
}

// Chat session management
export interface ChatSessionInfo {
  id: string;
  title: string;
  pageUrl?: string;
  pageTitle?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  messageCount?: number;
  lastMessage?: string;
}

// Message content types for rendering
export interface MessageContent {
  type: 'text' | 'code' | 'markdown';
  content: string;
  language?: string; // for code blocks
}

// Streaming message state
export interface StreamingMessage {
  id: string;
  content: string;
  isComplete: boolean;
} 
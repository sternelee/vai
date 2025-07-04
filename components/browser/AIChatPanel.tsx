import { useColorScheme } from "@/hooks/useColorScheme";
import { aiService } from "@/services/AIService";
import { useChat } from "@ai-sdk/react";
import { Ionicons } from "@expo/vector-icons";
import { DefaultChatTransport, UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Markdown from "react-native-markdown-display";

interface AIChatPanelProps {
  visible: boolean;
  onClose: () => void;
  currentPageTitle: string;
  currentPageUrl: string;
  currentPageContent: string;
  selectedText?: string;
  aiConfigured: boolean;
  onConfigureAI: () => void;
}

export default function AIChatPanel({
  visible,
  onClose,
  currentPageTitle,
  currentPageUrl,
  currentPageContent,
  selectedText,
  aiConfigured,
  onConfigureAI,
}: AIChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const colorScheme = useColorScheme();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const isDark = colorScheme === "dark";

  // Use useChat hook directly in the component
  const {
    messages,
    error,
    setMessages,
    sendMessage,
    regenerate,
    status,
    stop,
  } = useChat<UIMessage>({
    transport: new DefaultChatTransport({
      // @ts-ignore
      fetch: aiService.streamFetch,
      body: {
        // Add page context to the request
        pageContext: {
          title: currentPageTitle,
          url: currentPageUrl,
          content: currentPageContent,
        },
      },
    }),
    onError: (error) => {
      console.error("Chat error:", error);
      Alert.alert("Chat Error", error.message);
    },
    onFinish: (message) => {
      console.log("Chat finished:", message);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Set initial message when selected text is provided
  useEffect(() => {
    if (selectedText && visible) {
      setInputText(`Can you explain this text: "${selectedText}"`);
    } else if (visible && !selectedText && currentPageContent) {
      setInputText(
        `Please analyze this page: ${currentPageTitle || currentPageUrl}`,
      );
    }
  }, [
    selectedText,
    visible,
    currentPageContent,
    currentPageTitle,
    currentPageUrl,
  ]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    if (!aiConfigured) {
      Alert.alert(
        "AI Not Configured",
        "Please configure your AI API key in settings to use this feature.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Configure", onPress: onConfigureAI },
        ],
      );
      return;
    }

    try {
      // Use sendMessage function from useChat
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: inputText.trim() }],
      });
      setInputText("");
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const handleStop = () => {
    stop();
  };

  const quickActions = [
    {
      id: "summarize",
      icon: "document-text-outline",
      title: "Summarize",
      message: "Can you summarize the main points of this page?",
    },
    {
      id: "explain",
      icon: "help-circle-outline",
      title: "Explain",
      message: "Can you explain what this page is about in simple terms?",
    },
    {
      id: "translate",
      icon: "language-outline",
      title: "Translate",
      message: "Can you translate the key content of this page to English?",
    },
    {
      id: "questions",
      icon: "chatbubble-ellipses-outline",
      title: "Questions",
      message:
        "What are some interesting questions I could ask about this content?",
    },
  ];

  const handleQuickAction = (action: (typeof quickActions)[0]) => {
    setInputText(action.message);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const formatTimestamp = (timestamp?: Date) => {
    if (!timestamp) return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMarkdownContent = (content: string) => {
    const markdownStyles = {
      body: {
        color: isDark ? "#FFFFFF" : "#000000",
        fontSize: 16,
        lineHeight: 22,
      },
      code_inline: {
        backgroundColor: isDark ? "#3A3A3C" : "#F2F2F7",
        color: isDark ? "#FF6B6B" : "#FF3B30",
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: 14,
      },
      code_block: {
        backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
        color: isDark ? "#FFFFFF" : "#000000",
        padding: 12,
        borderRadius: 8,
        fontSize: 14,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      },
      fence: {
        backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
        color: isDark ? "#FFFFFF" : "#000000",
        padding: 12,
        borderRadius: 8,
        fontSize: 14,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      },
      link: {
        color: "#007AFF",
        textDecorationLine: "underline" as const,
      },
      blockquote: {
        backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
        borderLeftWidth: 4,
        borderLeftColor: "#007AFF",
        paddingLeft: 12,
        paddingVertical: 8,
        marginVertical: 8,
      },
      heading1: {
        color: isDark ? "#FFFFFF" : "#000000",
        fontSize: 24,
        fontWeight: "bold",
        marginVertical: 8,
      },
      heading2: {
        color: isDark ? "#FFFFFF" : "#000000",
        fontSize: 20,
        fontWeight: "bold",
        marginVertical: 6,
      },
      heading3: {
        color: isDark ? "#FFFFFF" : "#000000",
        fontSize: 18,
        fontWeight: "bold",
        marginVertical: 4,
      },
      list_item: {
        color: isDark ? "#FFFFFF" : "#000000",
        marginVertical: 2,
      },
      ordered_list_icon: {
        color: isDark ? "#8E8E93" : "#6B6B6B",
      },
      bullet_list_icon: {
        color: isDark ? "#8E8E93" : "#6B6B6B",
      },
    };

    return (
      <Markdown style={markdownStyles} mergeStyle={true}>
        {content}
      </Markdown>
    );
  };

  const getMessageContent = (message: UIMessage): string => {
    // Extract text from parts - UIMessage uses parts structure
    if (!message.parts || message.parts.length === 0) {
      return "";
    }

    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  };

  const renderMessage = ({ item }: { item: UIMessage }) => {
    const content = getMessageContent(item);

    return (
      <View
        style={[
          styles.messageContainer,
          item.role === "user" ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor:
                item.role === "user"
                  ? "#007AFF"
                  : isDark
                    ? "#2C2C2E"
                    : "#F2F2F7",
            },
          ]}
        >
          {item.role === "user" ? (
            <Text style={[styles.messageText, { color: "#FFFFFF" }]}>
              {content}
            </Text>
          ) : (
            <View style={styles.markdownContainer}>
              {renderMarkdownContent(content)}
            </View>
          )}
        </View>
        <Text
          style={[styles.timestamp, { color: isDark ? "#8E8E93" : "#6B6B6B" }]}
        >
          {formatTimestamp()}
        </Text>
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text
        style={[
          styles.quickActionsTitle,
          { color: isDark ? "#FFFFFF" : "#000000" },
        ]}
      >
        Quick Actions
      </Text>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.quickActionButton,
              { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" },
            ]}
            onPress={() => handleQuickAction(action)}
          >
            <Ionicons
              name={action.icon as any}
              size={24}
              color={isDark ? "#007AFF" : "#007AFF"}
            />
            <Text
              style={[
                styles.quickActionText,
                { color: isDark ? "#FFFFFF" : "#000000" },
              ]}
            >
              {action.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={[styles.errorText, { color: isDark ? "#FF453A" : "#FF3B30" }]}>
        {error?.message || "An error occurred"}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: "#007AFF" }]}
        onPress={() => regenerate()}
      >
        <Text style={[styles.retryButtonText, { color: "#FFFFFF" }]}>
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        style={[
          styles.container,
          { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
        ]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA" },
          ]}
        >
          <View style={styles.handleBar} />
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Ionicons name="sparkles" size={24} color="#007AFF" />
              <Text
                style={[
                  styles.headerTitle,
                  { color: isDark ? "#FFFFFF" : "#000000" },
                ]}
              >
                AI Assistant
              </Text>
              {/* Status indicator */}
              {status === "streaming" && (
                <ActivityIndicator size="small" color="#007AFF" />
              )}
            </View>
            <View style={styles.headerRight}>
              {/* Stop button during streaming */}
              {isLoading && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleStop}
                >
                  <Ionicons
                    name="stop"
                    size={20}
                    color={isDark ? "#FFFFFF" : "#000000"}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleClearHistory}
                disabled={messages.length === 0}
              >
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={
                    messages.length === 0
                      ? "#8E8E93"
                      : isDark
                        ? "#FFFFFF"
                        : "#000000"
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? "#FFFFFF" : "#000000"}
                />
              </TouchableOpacity>
            </View>
          </View>
          <Text
            style={[
              styles.pageContext,
              { color: isDark ? "#8E8E93" : "#6B6B6B" },
            ]}
          >
            {currentPageTitle}
          </Text>
        </View>

        {/* Messages or Quick Actions */}
        <View style={styles.content}>
          {error ? (
            renderErrorState()
          ) : messages.length === 0 ? (
            renderQuickActions()
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Input Area */}
        <View
          style={[
            styles.inputContainer,
            { borderTopColor: isDark ? "#2C2C2E" : "#E5E5EA" },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                { color: isDark ? "#FFFFFF" : "#000000" },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about this page..."
              placeholderTextColor={isDark ? "#8E8E93" : "#6B6B6B"}
              multiline
              maxLength={1000}
              editable={!isLoading && status !== "error"}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  opacity: inputText.trim() && !isLoading ? 1 : 0.5,
                  backgroundColor: "#007AFF",
                },
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: "flex-end",
  },
  container: {
    height: "80%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D1D6",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  pageContext: {
    fontSize: 14,
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: "flex-end",
  },
  assistantMessage: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  markdownContainer: {
    minWidth: 0,
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    marginHorizontal: 8,
  },
  quickActionsContainer: {
    flex: 1,
    justifyContent: "center",
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  quickActionButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 80,
    borderRadius: 16,
    padding: 12,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: "center",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});

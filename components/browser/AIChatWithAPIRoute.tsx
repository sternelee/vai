import { useColorScheme } from "@/hooks/useColorScheme";
import { generateAPIUrl } from "@/utils";
import { useChat } from "@ai-sdk/react";
import { Ionicons } from "@expo/vector-icons";
import { fetch as expoFetch } from "expo/fetch";
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
import { aiService } from "../../services/AIService";

interface AIChatWithAPIRouteProps {
  visible: boolean;
  onClose: () => void;
  currentPageTitle: string;
  currentPageUrl: string;
  currentPageContent: string;
  selectedText?: string;
  aiConfigured: boolean;
  onConfigureAI: () => void;
}

export default function AIChatWithAPIRoute({
  visible,
  onClose,
  currentPageTitle,
  currentPageUrl,
  currentPageContent,
  selectedText,
  aiConfigured,
  onConfigureAI,
}: AIChatWithAPIRouteProps) {
  const [inputText, setInputText] = useState("");
  const colorScheme = useColorScheme();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const isDark = colorScheme === "dark";

  // Get AI config for API route
  const config = aiService.getConfig();

  // Use compatible configuration with AI SDK 5 API Route
  const {
    messages,
    handleInputChange,
    handleSubmit,
    input,
    isLoading,
    error
  } = useChat({
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    api: generateAPIUrl('/api/chat'),
    body: {
      config: config, // Pass AI config to API route
    },
    onError: (error) => {
      console.error('Chat error:', error);
      Alert.alert('Chat Error', error.message);
    },
  });

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

  const handleSendMessage = () => {
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

    // Create context from current page
    const contextMessage = `
Context - Current page: ${currentPageTitle}
URL: ${currentPageUrl}
Content preview: ${currentPageContent.substring(0, 2000)}

User question: ${inputText}
    `;

    // Simulate input change and submit (compatible approach)
    const syntheticEvent = {
      target: { value: contextMessage },
      nativeEvent: { text: contextMessage },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    handleInputChange(syntheticEvent);

    setTimeout(() => {
      const submitEvent = {
        preventDefault: () => {},
      } as unknown as React.FormEvent<HTMLFormElement>;
      handleSubmit(submitEvent);
      setInputText("");
    }, 100);
  };

  const renderMessage = ({ item }: { item: any }) => (
    <View style={[styles.messageContainer, isDark && styles.messageContainerDark]}>
      <View style={styles.messageHeader}>
        <Text style={[
          styles.messageRole,
          isDark && styles.messageRoleDark,
          item.role === 'user' && styles.userRole,
          item.role === 'assistant' && styles.assistantRole
        ]}>
          {item.role === 'user' ? '👤 You' : '🤖 Assistant'}
        </Text>
      </View>
      <View style={[styles.messageContent, isDark && styles.messageContentDark]}>
        {/* Handle both AI SDK 5 parts structure and legacy content */}
        {item.parts ? (
          // AI SDK 5 parts structure
          item.parts.map((part: any, index: number) => {
            switch (part.type) {
              case 'text':
                return (
                  <Markdown
                    key={index}
                    style={{
                      body: {
                        color: isDark ? '#ffffff' : '#000000',
                        fontSize: 16,
                      },
                      code_inline: {
                        backgroundColor: isDark ? '#333333' : '#f0f0f0',
                        color: isDark ? '#ffffff' : '#000000',
                        paddingHorizontal: 4,
                        paddingVertical: 2,
                        borderRadius: 4,
                      },
                      code_block: {
                        backgroundColor: isDark ? '#2a2a2a' : '#f8f8f8',
                        padding: 10,
                        borderRadius: 8,
                        marginVertical: 5,
                      },
                    }}
                  >
                    {part.text}
                  </Markdown>
                );
              case 'tool-call':
                return (
                  <View key={index} style={{ marginVertical: 4 }}>
                    <Text style={[styles.toolCallText, isDark && styles.messageTextDark]}>
                      🔧 Tool: {part.toolName}
                    </Text>
                    <Text style={[styles.messageText, isDark && styles.messageTextDark]}>
                      {JSON.stringify(part.args, null, 2)}
                    </Text>
                  </View>
                );
              default:
                if (part.type && part.type.startsWith('tool-')) {
                  return (
                    <View key={index} style={{ marginVertical: 4 }}>
                      <Text style={[styles.toolCallText, isDark && styles.messageTextDark]}>
                        🔧 {part.type}
                      </Text>
                      <Text style={[styles.messageText, isDark && styles.messageTextDark]}>
                        {JSON.stringify(part, null, 2)}
                      </Text>
                    </View>
                  );
                }
                return (
                  <Text key={index} style={[styles.messageText, isDark && styles.messageTextDark]}>
                    {JSON.stringify(part, null, 2)}
                  </Text>
                );
            }
          })
        ) : item.toolInvocations ? (
          // Legacy tool invocations
          <Text style={[styles.messageText, isDark && styles.messageTextDark]}>
            {JSON.stringify(item.toolInvocations, null, 2)}
          </Text>
        ) : (
          // Standard content
          <Markdown
            style={{
              body: {
                color: isDark ? '#ffffff' : '#000000',
                fontSize: 16,
              },
              code_inline: {
                backgroundColor: isDark ? '#333333' : '#f0f0f0',
                color: isDark ? '#ffffff' : '#000000',
                paddingHorizontal: 4,
                paddingVertical: 2,
                borderRadius: 4,
              },
              code_block: {
                backgroundColor: isDark ? '#2a2a2a' : '#f8f8f8',
                padding: 10,
                borderRadius: 8,
                marginVertical: 5,
              },
            }}
          >
            {item.content || 'No content'}
          </Markdown>
        )}
      </View>
    </View>
  );

  if (error) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, isDark && styles.containerDark]}>
          <View style={[styles.header, isDark && styles.headerDark]}>
            <Text style={[styles.title, isDark && styles.titleDark]}>
              AI Chat Error
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={isDark ? "#ffffff" : "#000000"} />
            </TouchableOpacity>
          </View>
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
              {error.message}
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[styles.container, isDark && styles.containerDark]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Text style={[styles.title, isDark && styles.titleDark]}>
            AI Chat (SDK 5 Compatible)
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? "#ffffff" : "#000000"} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, isDark && styles.textInputDark]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor={isDark ? "#888888" : "#666666"}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="send" size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  containerDark: {
    backgroundColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingTop: 50,
  },
  headerDark: {
    borderBottomColor: "#333333",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  titleDark: {
    color: "#ffffff",
  },
  closeButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    overflow: "hidden",
  },
  messageContainerDark: {
    backgroundColor: "#2a2a2a",
  },
  messageHeader: {
    padding: 12,
    backgroundColor: "#e9ecef",
  },
  messageContent: {
    padding: 12,
  },
  messageContentDark: {
    backgroundColor: "#2a2a2a",
  },
  messageRole: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
  },
  messageRoleDark: {
    color: "#ffffff",
  },
  userRole: {
    color: "#007AFF",
  },
  assistantRole: {
    color: "#34C759",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#000000",
  },
  messageTextDark: {
    color: "#ffffff",
  },
  toolCallText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF9500",
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#ffffff",
  },
  inputContainerDark: {
    borderTopColor: "#333333",
    backgroundColor: "#1a1a1a",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  textInputDark: {
    borderColor: "#333333",
    color: "#ffffff",
    backgroundColor: "#2a2a2a",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#cccccc",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#DC3545",
    textAlign: "center",
    lineHeight: 24,
  },
  errorTextDark: {
    color: "#FF6B6B",
  },
});
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Modal from 'react-native-modal';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface AIChatPanelProps {
  isVisible: boolean;
  onClose: () => void;
  currentPageTitle: string;
  currentPageUrl: string;
  currentPageContent: string;
  selectedText?: string;
  onSendMessage: (message: string, context: string) => Promise<ReadableStream<string>>;
  messages: ChatMessage[];
  onClearHistory: () => void;
  aiConfigured: boolean;
  onConfigureAI: () => void;
}

export default function AIChatPanel({
  isVisible,
  onClose,
  currentPageTitle,
  currentPageUrl,
  currentPageContent,
  selectedText,
  onSendMessage,
  messages,
  onClearHistory,
  aiConfigured,
  onConfigureAI,
}: AIChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const isDark = colorScheme === 'dark';

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
    if (selectedText && isVisible) {
      setInputText(`Can you explain this text: "${selectedText}"`);
    }
  }, [selectedText, isVisible]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    if (!aiConfigured) {
      Alert.alert(
        'AI Not Configured',
        'Please configure your AI API key in settings to use this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Configure', onPress: onConfigureAI },
        ]
      );
      return;
    }

    const messageText = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      // Create context from current page
      const context = `
        Current page: ${currentPageTitle}
        URL: ${currentPageUrl}
        Content preview: ${currentPageContent.substring(0, 2000)}
      `;

      // Get response stream
      const responseStream = await onSendMessage(messageText, context);
      const streamingId = Date.now().toString();
      setStreamingMessageId(streamingId);

      // Read the stream
      const reader = responseStream.getReader();
      let accumulatedResponse = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          accumulatedResponse += value;
          
          // Update the streaming message
          // This would need to be handled by the parent component
          // to update the messages array with the streaming content
        }
      } finally {
        reader.releaseLock();
        setStreamingMessageId(null);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      id: 'summarize',
      icon: 'document-text-outline',
      title: 'Summarize',
      message: 'Can you summarize the main points of this page?',
    },
    {
      id: 'explain',
      icon: 'help-circle-outline',
      title: 'Explain',
      message: 'Can you explain what this page is about in simple terms?',
    },
    {
      id: 'translate',
      icon: 'language-outline',
      title: 'Translate',
      message: 'Can you translate the key content of this page to English?',
    },
    {
      id: 'questions',
      icon: 'chatbubble-ellipses-outline',
      title: 'Questions',
      message: 'What are some interesting questions I could ask about this content?',
    },
  ];

  const handleQuickAction = (action: typeof quickActions[0]) => {
    setInputText(action.message);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.role === 'user' ? styles.userMessage : styles.assistantMessage,
    ]}>
      <View style={[
        styles.messageBubble,
        {
          backgroundColor: item.role === 'user' 
            ? '#007AFF' 
            : (isDark ? '#2C2C2E' : '#F2F2F7'),
        },
      ]}>
        <Text style={[
          styles.messageText,
          {
            color: item.role === 'user' 
              ? '#FFFFFF' 
              : (isDark ? '#FFFFFF' : '#000000'),
          },
        ]}>
          {item.content}
        </Text>
        {item.isStreaming && (
          <View style={styles.streamingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
      </View>
      <Text style={[styles.timestamp, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
        {formatTimestamp(item.timestamp)}
      </Text>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={[styles.quickActionsTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
        Quick Actions
      </Text>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickActionButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
            onPress={() => handleQuickAction(action)}
          >
            <Ionicons
              name={action.icon as any}
              size={24}
              color={isDark ? '#007AFF' : '#007AFF'}
            />
            <Text style={[styles.quickActionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              {action.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
      backdropOpacity={0.5}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
          <View style={styles.handleBar} />
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Ionicons name="sparkles" size={24} color="#007AFF" />
              <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                AI Assistant
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onClearHistory}
                disabled={messages.length === 0}
              >
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={messages.length === 0 ? '#8E8E93' : (isDark ? '#FFFFFF' : '#000000')}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.pageContext, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
            {currentPageTitle}
          </Text>
        </View>

        {/* Messages or Quick Actions */}
        <View style={styles.content}>
          {messages.length === 0 ? renderQuickActions() : (
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
        <View style={[styles.inputContainer, { borderTopColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
          <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about this page..."
              placeholderTextColor={isDark ? '#8E8E93' : '#6B6B6B'}
              multiline
              maxLength={1000}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  opacity: inputText.trim() && !isLoading ? 1 : 0.5,
                  backgroundColor: '#007AFF',
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
    justifyContent: 'flex-end',
  },
  container: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 4,
    marginLeft: 12,
  },
  pageContext: {
    fontSize: 14,
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  quickActionsContainer: {
    padding: 20,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  streamingIndicator: {
    marginTop: 8,
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    marginHorizontal: 16,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
}); 
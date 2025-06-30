import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface SearchSuggestion {
  query: string;
  type: 'search' | 'url' | 'history' | 'bookmark';
  confidence: number;
  icon?: string;
}

interface AddressBarProps {
  currentUrl: string;
  isLoading: boolean;
  progress: number;
  onNavigate: (url: string) => void;
  onShowSuggestions: (query: string) => void;
  suggestions: SearchSuggestion[];
  onRefresh: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onToggleAI: () => void;
  aiEnabled: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  onShowHistory?: () => void;
  onShowBookmarks?: () => void;
  onShowTabManager?: () => void;
  tabCount?: number;
  isIncognito?: boolean;
  onShowDownloads?: () => void;
  downloadCount?: number;
  onUserScriptsPress: () => void;
  onQuickAIChat?: () => void;
  aiConfigured?: boolean;
  onShowResourceSniffer?: () => void;
  onHome?: () => void;
  onAddToHome?: () => void;
  showAddToHome?: boolean;
}

export default function AddressBar({
  currentUrl,
  isLoading,
  progress,
  onNavigate,
  onShowSuggestions,
  suggestions,
  onRefresh,
  onGoBack,
  onGoForward,
  canGoBack,
  canGoForward,
  onToggleAI,
  aiEnabled,
  isBookmarked = false,
  onToggleBookmark,
  onShowHistory,
  onShowBookmarks,
  onShowTabManager,
  tabCount = 1,
  isIncognito = false,
  onShowDownloads,
  downloadCount,
  onUserScriptsPress,
  onQuickAIChat,
  aiConfigured = false,
  onShowResourceSniffer,
  onHome,
  onAddToHome,
  showAddToHome,
}: AddressBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const colorScheme = useColorScheme();
  const inputRef = useRef<TextInput>(null);

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (!isFocused) {
      setInputValue(currentUrl);
    }
  }, [currentUrl, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
    // Select all text when focused for easy editing
    setTimeout(() => {
      inputRef.current?.setSelection(0, inputValue.length);
    }, 100);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setShowSuggestions(false);
    setInputValue(currentUrl);
  };

  const handleTextChange = (text: string) => {
    setInputValue(text);
    if (text.length > 0) {
      onShowSuggestions(text);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onNavigate(inputValue.trim());
      setShowSuggestions(false);
      Keyboard.dismiss();
      inputRef.current?.blur();
    }
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    setInputValue(suggestion.query);
    onNavigate(suggestion.query);
    setShowSuggestions(false);
    Keyboard.dismiss();
    inputRef.current?.blur();
  };

  const getSecurityIcon = (url: string) => {
    if (isIncognito) {
      return <Ionicons name="eye-off" size={16} color="#8E44AD" />;
    }
    if (url.startsWith('https://')) {
      return <Ionicons name="lock-closed" size={16} color="#4CAF50" />;
    } else if (url.startsWith('http://')) {
      return <Ionicons name="information-circle" size={16} color="#FF9800" />;
    }
    return null;
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'url':
        return 'globe-outline';
      case 'history':
        return 'time-outline';
      case 'bookmark':
        return 'bookmark-outline';
      case 'search':
      default:
        return 'search-outline';
    }
  };

  const formatDisplayUrl = (url: string) => {
    if (isIncognito) {
      return 'Incognito Mode';
    }
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
      onPress={() => handleSuggestionPress(item)}
    >
      <Ionicons
        name={getSuggestionIcon(item.type) as any}
        size={20}
        color={isDark ? '#8E8E93' : '#6B6B6B'}
        style={styles.suggestionIcon}
      />
      <View style={styles.suggestionContent}>
        <Text style={[styles.suggestionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          {item.query}
        </Text>
        <Text style={[styles.suggestionType, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
          {item.type}
        </Text>
      </View>
      <Ionicons
        name="arrow-up-outline"
        size={16}
        color={isDark ? '#8E8E93' : '#6B6B6B'}
        style={{ transform: [{ rotate: '45deg' }] }}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Main Address Bar */}
      <View style={[
        styles.addressBarContainer, 
        { 
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          ...(isIncognito && {
            backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0',
            borderBottomColor: '#8E44AD',
            borderBottomWidth: 2,
          })
        }
      ]}>
        {/* Navigation Controls */}
        <View style={styles.navigationControls}>
          <TouchableOpacity
            style={[styles.navButton, { opacity: canGoBack ? 1 : 0.3 }]}
            onPress={onGoBack}
            disabled={!canGoBack}
          >
            <Ionicons name="chevron-back" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.navButton, { opacity: canGoForward ? 1 : 0.3 }]}
            onPress={onGoForward}
            disabled={!canGoForward}
          >
            <Ionicons name="chevron-forward" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        </View>

        {/* Address Input Container */}
        <View style={[
          styles.inputContainer, 
          { 
            backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
            ...(isIncognito && {
              backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8',
              borderColor: '#8E44AD',
              borderWidth: 1,
            })
          }
        ]}>
          {/* Security Icon */}
          <View style={styles.securityIcon}>
            {!isFocused && getSecurityIcon(currentUrl)}
          </View>

          {/* Text Input */}
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput, 
              { 
                color: isDark ? '#FFFFFF' : '#000000',
                ...(isIncognito && { fontStyle: 'italic' })
              }
            ]}
            value={isFocused ? inputValue : formatDisplayUrl(currentUrl)}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSubmit}
            placeholder={isIncognito ? "Incognito browsing..." : "Search or enter address"}
            placeholderTextColor={
              isIncognito 
                ? '#8E44AD' 
                : (isDark ? '#8E8E93' : '#6B6B6B')
            }
            returnKeyType="go"
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="web-search"
            selectTextOnFocus
          />

          {/* Bookmark Button */}
          {onToggleBookmark && !isIncognito && (
            <TouchableOpacity style={styles.actionButton} onPress={onToggleBookmark}>
              <Ionicons
                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                size={20}
                color={isBookmarked ? "#007AFF" : (isDark ? '#8E8E93' : '#6B6B6B')}
              />
            </TouchableOpacity>
          )}

          {/* Quick AI Chat Button */}
          {onQuickAIChat && aiConfigured && !isIncognito && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.quickAIChatButton]} 
              onPress={onQuickAIChat}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={18}
                color="#007AFF"
              />
            </TouchableOpacity>
          )}

          {/* Loading/Refresh Button */}
          <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
            {isLoading ? (
              <ActivityIndicator 
                size="small" 
                color={isIncognito ? '#8E44AD' : (isDark ? '#FFFFFF' : '#000000')} 
              />
            ) : (
              <Ionicons 
                name="refresh" 
                size={20} 
                color={isIncognito ? '#8E44AD' : (isDark ? '#8E8E93' : '#6B6B6B')} 
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Tab Manager Button */}
          {onShowTabManager && (
            <TouchableOpacity
              style={[
                styles.tabManagerButton,
                { 
                  backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                  ...(isIncognito && {
                    backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8',
                    borderColor: '#8E44AD',
                    borderWidth: 1,
                  })
                }
              ]}
              onPress={onShowTabManager}
            >
              <Text style={[
                styles.tabCount,
                { 
                  color: isIncognito 
                    ? '#8E44AD' 
                    : (isDark ? '#FFFFFF' : '#000000')
                }
              ]}>
                {tabCount}
              </Text>
            </TouchableOpacity>
          )}

          {/* History Button */}
          {onShowHistory && !isIncognito && (
            <TouchableOpacity
              style={[styles.actionButton, isDark && styles.actionButtonDark]}
              onPress={onShowHistory}
            >
              <Text style={styles.actionButtonText}>📚</Text>
            </TouchableOpacity>
          )}

          {/* Bookmarks Button */}
          {onShowBookmarks && (
            <TouchableOpacity
              style={[styles.actionButton, isDark && styles.actionButtonDark]}
              onPress={onShowBookmarks}
            >
              <Text style={styles.actionButtonText}>⭐</Text>
            </TouchableOpacity>
          )}

          {/* Downloads Button */}
          {onShowDownloads && (
            <TouchableOpacity
              style={[styles.actionButton, isDark && styles.actionButtonDark]}
              onPress={onShowDownloads}
            >
              <View style={styles.downloadButtonContainer}>
                <Text style={styles.actionButtonText}>📥</Text>
                {(downloadCount || 0) > 0 && (
                  <View style={styles.downloadBadge}>
                    <Text style={styles.downloadBadgeText}>{downloadCount || 0}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* AI Toggle Button */}
          <TouchableOpacity
            style={[
              styles.aiButton,
              { 
                backgroundColor: aiEnabled ? '#007AFF' : 'transparent',
                ...(isIncognito && aiEnabled && {
                  backgroundColor: '#8E44AD',
                })
              }
            ]}
            onPress={onToggleAI}
          >
            <Ionicons
              name="sparkles"
              size={20}
              color={
                aiEnabled 
                  ? '#FFFFFF' 
                  : isIncognito 
                    ? '#8E44AD'
                    : (isDark ? '#8E8E93' : '#6B6B6B')
              }
            />
          </TouchableOpacity>

          {/* New User Scripts Button */}
          <TouchableOpacity
            style={[styles.actionButton, isDark && styles.actionButtonDark]}
            onPress={onUserScriptsPress}
          >
            <Text style={styles.actionButtonText}>🐒</Text>
          </TouchableOpacity>

          {/* Resource Sniffer Button */}
          {onShowResourceSniffer && (
            <TouchableOpacity
              style={[styles.actionButton, isDark && styles.actionButtonDark]}
              onPress={onShowResourceSniffer}
            >
              <Text style={styles.actionButtonText}>🕵️</Text>
            </TouchableOpacity>
          )}

          {/* Home Button */}
          {onHome && (
            <TouchableOpacity onPress={onHome} style={styles.actionButton}>
              <Ionicons name="home-outline" size={22} color={isDark ? '#007AFF' : '#007AFF'} />
            </TouchableOpacity>
          )}

          {/* Add to Home Button */}
          {showAddToHome && onAddToHome && (
            <TouchableOpacity onPress={onAddToHome} style={styles.actionButton}>
              <Ionicons name="add-circle-outline" size={22} color={isDark ? '#34C759' : '#34C759'} />
            </TouchableOpacity>
          )}

          {/* Quick AI Chat */}
          {aiConfigured && (
            <TouchableOpacity onPress={onQuickAIChat} style={styles.actionButton}>
              <Ionicons name="sparkles" size={22} color={isDark ? '#007AFF' : '#007AFF'} />
            </TouchableOpacity>
          )}

          {/* Resource Sniffer */}
          <TouchableOpacity onPress={onShowResourceSniffer} style={styles.actionButton}>
            <Ionicons name="search-outline" size={22} color={isDark ? '#8E8E93' : '#6B6B6B'} />
          </TouchableOpacity>

          {/* Bookmark */}
          <TouchableOpacity onPress={onToggleBookmark} style={styles.actionButton}>
            <Ionicons 
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'} 
              size={22} 
              color={isBookmarked ? '#FF9500' : (isDark ? '#8E8E93' : '#6B6B6B')} 
            />
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={22} color={isDark ? '#8E8E93' : '#6B6B6B'} />
          </TouchableOpacity>

          {/* More Options */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color={isDark ? '#8E8E93' : '#6B6B6B'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      {isLoading && progress > 0 && (
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${progress * 100}%`,
                backgroundColor: isIncognito ? '#8E44AD' : '#007AFF',
              },
            ]}
          />
        </View>
      )}

      {/* Suggestions List */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item, index) => `${item.query}_${index}`}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.suggestionsList}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  addressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  navigationControls: {
    flexDirection: 'row',
    marginRight: 8,
  },
  navButton: {
    padding: 4,
    marginRight: 4,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  securityIcon: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    paddingVertical: 4,
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  tabManagerButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  tabCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  roundActionButton: {
    padding: 8,
    marginLeft: 4,
  },
  downloadButton: {
    padding: 8,
    marginLeft: 4,
    position: 'relative',
  },
  downloadBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  aiButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  progressContainer: {
    height: 2,
    backgroundColor: '#E5E5EA',
  },
  progressBar: {
    height: '100%',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 300,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 16,
    fontWeight: '400',
  },
  suggestionType: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  actionButtonDark: {
    // Add appropriate styles for dark mode
  },
  actionButtonText: {
    // Add appropriate styles for text
  },
  downloadButtonContainer: {
    // Add appropriate styles for download button container
  },
  quickAIChatButton: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    paddingHorizontal: 2,
  },
}); 
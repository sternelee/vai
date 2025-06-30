import { ArcTheme, getThemeColors } from "@/constants/ArcTheme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

interface SearchSuggestion {
  query: string;
  type: "search" | "url" | "history" | "bookmark";
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
  onShowToolsMenu?: () => void;
  showAddToHome?: boolean;
}

export default function AddressBar({
  currentUrl,
  isLoading,
  progress,
  onNavigate,
  onShowSuggestions,
  suggestions = [],
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
  onShowToolsMenu,
  showAddToHome,
}: AddressBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const themeColors = getThemeColors(isDark);

  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    setInputValue(currentUrl);
    setShowSuggestions(suggestions.length > 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setShowSuggestions(false);
    setInputValue("");
  };

  const handleTextChange = (text: string) => {
    setInputValue(text);
    onShowSuggestions(text);

    if (text.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onNavigate(inputValue.trim());
      inputRef.current?.blur();
    }
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    onNavigate(suggestion.query);
    inputRef.current?.blur();
  };

  const getSecurityIcon = (url: string = "") => {
    if (!url || url === 'about:blank' || url.startsWith('vai://')) return null;

    if (url.startsWith('https://')) {
      return (
        <Ionicons
          name="lock-closed"
          size={14}
          color={ArcTheme.colors.success}
        />
      );
    } else if (url.startsWith('http://')) {
      return (
        <Ionicons
          name="information-circle"
          size={14}
          color={ArcTheme.colors.warning}
        />
      );
    }
    return null;
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'search': return 'search';
      case 'url': return 'globe';
      case 'history': return 'time';
      case 'bookmark': return 'bookmark';
      default: return 'search';
    }
  };

  const formatDisplayUrl = (url: string) => {
    if (!url || url === 'about:blank') return '';
    if (url.startsWith('vai://')) return 'VaiBrowser 主页';

    try {
      const urlObj = new URL(url);
      return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    } catch {
      return url;
    }
  };

  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        {
          backgroundColor: themeColors.card,
          borderBottomColor: themeColors.divider,
        }
      ]}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.suggestionIcon}>
        <Ionicons
          name={getSuggestionIcon(item.type) as any}
          size={18}
          color={themeColors.text.secondary}
        />
      </View>
      <View style={styles.suggestionContent}>
        <Text
          style={[
            styles.suggestionText,
            { color: themeColors.text.primary },
          ]}
          numberOfLines={1}
        >
          {item.query}
        </Text>
        <Text
          style={[
            styles.suggestionType,
            { color: themeColors.text.tertiary },
          ]}
        >
          {item.type}
        </Text>
      </View>
      <Ionicons
        name="arrow-up-outline"
        size={14}
        color={themeColors.text.tertiary}
        style={{ transform: [{ rotate: "45deg" }] }}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Arc-style main address bar */}
      <View
        style={[
          styles.addressBarContainer,
          {
            backgroundColor: themeColors.surface,
            borderBottomColor: themeColors.border,
            ...(isIncognito && {
              backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0',
              borderBottomColor: ArcTheme.colors.accent,
              borderBottomWidth: 2,
            }),
          },
        ]}
      >
        {/* Arc-style navigation controls */}
        <View style={styles.navigationControls}>
          <TouchableOpacity
            style={[
              styles.navButton,
              {
                backgroundColor: canGoBack ? themeColors.interactive.hover : 'transparent',
                opacity: canGoBack ? 1 : 0.4,
              }
            ]}
            onPress={onGoBack}
            disabled={!canGoBack}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={themeColors.text.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              {
                backgroundColor: canGoForward ? themeColors.interactive.hover : 'transparent',
                opacity: canGoForward ? 1 : 0.4,
              }
            ]}
            onPress={onGoForward}
            disabled={!canGoForward}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={themeColors.text.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Arc-style address input container */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: themeColors.background,
              borderColor: isFocused ? ArcTheme.colors.primary : themeColors.border,
              ...(isIncognito && {
                backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8',
                borderColor: isFocused ? ArcTheme.colors.accent : ArcTheme.colors.accent + '40',
              }),
            },
          ]}
        >
          {/* Security icon */}
          <View style={styles.securityIcon}>
            {!isFocused && getSecurityIcon(currentUrl)}
          </View>

          {/* Arc-style text input */}
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              {
                color: themeColors.text.primary,
                ...(isIncognito && { fontStyle: "italic" }),
              },
            ]}
            value={isFocused ? inputValue : formatDisplayUrl(currentUrl)}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSubmit}
            placeholder={
              isIncognito ? "私密浏览..." : "搜索或输入网址"
            }
            placeholderTextColor={
              isIncognito ? ArcTheme.colors.accent : themeColors.text.tertiary
            }
            returnKeyType="go"
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="web-search"
            selectTextOnFocus
          />

          {/* In-input actions */}
          <View style={styles.inputActions}>
            {/* Bookmark toggle */}
            {onToggleBookmark && !isIncognito && (
              <TouchableOpacity
                style={styles.inputActionButton}
                onPress={onToggleBookmark}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isBookmarked ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={
                    isBookmarked ? ArcTheme.colors.warning : themeColors.text.secondary
                  }
                />
              </TouchableOpacity>
            )}

            {/* Quick AI Chat */}
            {onQuickAIChat && aiConfigured && !isIncognito && (
              <TouchableOpacity
                style={[
                  styles.inputActionButton,
                  styles.quickAIButton,
                  {
                    backgroundColor: ArcTheme.colors.primary + '15',
                    borderColor: ArcTheme.colors.primary + '25',
                  }
                ]}
                onPress={onQuickAIChat}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chatbubble-ellipses"
                  size={16}
                  color={ArcTheme.colors.primary}
                />
              </TouchableOpacity>
            )}

            {/* Refresh/Loading */}
            <TouchableOpacity
              style={styles.inputActionButton}
              onPress={onRefresh}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={isIncognito ? ArcTheme.colors.accent : ArcTheme.colors.primary}
                />
              ) : (
                <Ionicons
                  name="refresh"
                  size={18}
                  color={isIncognito ? ArcTheme.colors.accent : themeColors.text.secondary}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Arc-style action buttons */}
        <View style={styles.actionButtons}>
          {/* Tools menu button */}
          {onShowToolsMenu && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: themeColors.interactive.hover,
                }
              ]}
              onPress={onShowToolsMenu}
              activeOpacity={0.7}
            >
              <Ionicons
                name="menu"
                size={20}
                color={themeColors.text.primary}
              />
            </TouchableOpacity>
          )}

          {/* Tab manager button */}
          {onShowTabManager && (
            <TouchableOpacity
              style={[
                styles.tabManagerButton,
                {
                  backgroundColor: themeColors.interactive.hover,
                  borderColor: themeColors.border,
                  ...(isIncognito && {
                    backgroundColor: ArcTheme.colors.accent + '20',
                    borderColor: ArcTheme.colors.accent,
                    borderWidth: 1,
                  }),
                },
              ]}
              onPress={onShowTabManager}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabCount,
                  {
                    color: isIncognito
                      ? ArcTheme.colors.accent
                      : themeColors.text.primary,
                  },
                ]}
              >
                {tabCount}
              </Text>
            </TouchableOpacity>
          )}

          {/* AI toggle button */}
          <TouchableOpacity
            style={[
              styles.aiButton,
              {
                backgroundColor: aiEnabled
                  ? (isIncognito ? ArcTheme.colors.accent : ArcTheme.colors.primary)
                  : 'transparent',
                borderColor: aiEnabled
                  ? 'transparent'
                  : themeColors.border,
                borderWidth: aiEnabled ? 0 : 1,
              },
            ]}
            onPress={onToggleAI}
            activeOpacity={0.7}
          >
            <Ionicons
              name="sparkles"
              size={18}
              color={
                aiEnabled
                  ? "#FFFFFF"
                  : themeColors.text.secondary
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Arc-style progress bar */}
      {isLoading && progress > 0 && (
        <View
          style={[
            styles.progressContainer,
            {
              backgroundColor: themeColors.divider,
            }
          ]}
        >
          <View
            style={[
              styles.progressBar,
              {
                width: `${progress * 100}%`,
                backgroundColor: isIncognito ? ArcTheme.colors.accent : ArcTheme.colors.primary,
              },
            ]}
          />
        </View>
      )}

      {/* Arc-style suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View
          style={[
            styles.suggestionsContainer,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
              ...ArcTheme.shadows.lg,
            },
          ]}
        >
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
    position: "relative",
    zIndex: 1000,
  },
  addressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ArcTheme.spacing.base,
    paddingVertical: ArcTheme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navigationControls: {
    flexDirection: "row",
    marginRight: ArcTheme.spacing.sm,
    gap: ArcTheme.spacing.xs / 2,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: ArcTheme.borderRadius.base,
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: ArcTheme.borderRadius.base,
    borderWidth: 1,
    paddingHorizontal: ArcTheme.spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? ArcTheme.spacing.sm : ArcTheme.spacing.xs,
    marginHorizontal: ArcTheme.spacing.xs,
  },
  securityIcon: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    fontSize: ArcTheme.typography.fontSize.base,
    fontWeight: ArcTheme.typography.fontWeight.normal,
    marginLeft: ArcTheme.spacing.xs,
    paddingVertical: ArcTheme.spacing.xs / 2,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ArcTheme.spacing.xs,
  },
  inputActionButton: {
    padding: ArcTheme.spacing.xs,
    borderRadius: ArcTheme.borderRadius.sm,
  },
  quickAIButton: {
    borderWidth: 1,
    paddingHorizontal: ArcTheme.spacing.xs,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: ArcTheme.spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: ArcTheme.borderRadius.base,
    justifyContent: "center",
    alignItems: "center",
  },
  tabManagerButton: {
    width: 36,
    height: 36,
    borderRadius: ArcTheme.borderRadius.base,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  tabCount: {
    fontSize: ArcTheme.typography.fontSize.sm,
    fontWeight: ArcTheme.typography.fontWeight.semibold,
  },
  aiButton: {
    width: 36,
    height: 36,
    borderRadius: ArcTheme.borderRadius.base,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    height: 2,
  },
  progressBar: {
    height: "100%",
    borderRadius: 1,
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    maxHeight: 300,
    borderRadius: ArcTheme.borderRadius.lg,
    borderWidth: 1,
    marginHorizontal: ArcTheme.spacing.base,
    marginTop: ArcTheme.spacing.xs / 2,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ArcTheme.spacing.base,
    paddingVertical: ArcTheme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionIcon: {
    width: 32,
    alignItems: "center",
    marginRight: ArcTheme.spacing.sm,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    fontSize: ArcTheme.typography.fontSize.base,
    fontWeight: ArcTheme.typography.fontWeight.normal,
  },
  suggestionType: {
    fontSize: ArcTheme.typography.fontSize.xs,
    marginTop: 2,
    textTransform: "capitalize",
  },
});


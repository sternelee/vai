import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, Share, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import { WebView } from 'react-native-webview';

// Components
import AddressBar from '@/components/browser/AddressBar';
import AIChatPanel from '@/components/browser/AIChatPanel';
import BookmarkManager from '@/components/browser/BookmarkManager';
import BrowserWebView from '@/components/browser/BrowserWebView';
import DownloadManager from '@/components/browser/DownloadManager';
import HistoryManager from '@/components/browser/HistoryManager';
import HomePage from '@/components/browser/HomePage';
import ResourceSniffer from '@/components/browser/ResourceSniffer';
import TabBar from '@/components/browser/TabBar';
import TabManager from '@/components/browser/TabManager';
import ToolsMenu from '@/components/browser/ToolsMenu';
import UserScriptManager from '@/components/browser/UserScriptManager';

// Services
import { aiService } from '@/services/AIService';
import databaseService from '@/services/DatabaseService';
import { downloadService } from '@/services/DownloadService';
import { homePageService } from '@/services/HomePageService';
import { mcpService } from '@/services/MCPService';
import { performanceService } from '@/services/PerformanceService';
import { resourceSnifferService } from '@/services/ResourceSnifferService';
import { userScriptService } from '@/services/UserScriptService';

// Hooks
import { useColorScheme } from '@/hooks/useColorScheme';

// Types
interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  progress: number;
  canGoBack: boolean;
  canGoForward: boolean;
  isIncognito: boolean;
  isActive: boolean;
  lastVisited?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface SearchSuggestion {
  query: string;
  type: 'search' | 'url' | 'history' | 'bookmark';
  confidence: number;
}

interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  status: 'pending' | 'downloading' | 'completed' | 'paused' | 'error' | 'cancelled';
  progress: number;
  totalSize?: number;
  downloadedSize: number;
  fileSize: number;
  startTime: string;
  createdAt: string;
}

interface ResourceItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'script' | 'style' | 'other';
  name: string;
  size?: string;
  extension?: string;
  thumbnail?: string;
}

interface HomePageShortcut {
  id: string;
  title: string;
  url: string;
  addedAt: string;
}

export default function BrowserScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Add WebView ref
  const webViewRef = useRef<WebView>(null);

  // State
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [navigationCommand, setNavigationCommand] = useState<'reload' | 'back' | 'forward' | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [aiContext, setAIContext] = useState<any>(null);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [currentPageContent, setCurrentPageContent] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [userScripts, setUserScripts] = useState<any[]>([]);

  // Modal states
  const [tabManagerVisible, setTabManagerVisible] = useState(false);
  const [downloadManagerVisible, setDownloadManagerVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [bookmarksVisible, setBookmarksVisible] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showUserScripts, setShowUserScripts] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showResourceSniffer, setShowResourceSniffer] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [pageResources, setPageResources] = useState<ResourceItem[]>([]);

  // Homepage states
  const [homePageShortcuts, setHomePageShortcuts] = useState<HomePageShortcut[]>([]);
  const [homePageUrl, setHomePageUrl] = useState<string>('vai://home');

  // Get current active tab
  const currentTab = tabs.find(tab => tab.id === activeTabId);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Initialize all services
        await initializeServices();

        // Load browsing data
        await loadBrowsingData();

        // Load homepage settings
        await loadHomePageSettings();

        // Check AI configuration
        const aiStatus = aiService.getProviderStatus();
        setAiConfigured(aiStatus.configured && aiStatus.ready);

        // Create initial tab if none exist
        const savedTabs = await AsyncStorage.getItem('browser_tabs');
        if (savedTabs) {
          const parsedTabs = JSON.parse(savedTabs);
          if (parsedTabs.length > 0) {
            setTabs(parsedTabs);
            setActiveTabId(parsedTabs[0].id);
            return;
          }
        }

        // Create default tab
        const newTab = createNewTab();
        setTabs([newTab]);
        setActiveTabId(newTab.id);

      } catch (error) {
        console.error('Failed to load browser data:', error);

        // Create fallback tab
        const fallbackTab = createNewTab();
        setTabs([fallbackTab]);
        setActiveTabId(fallbackTab.id);
      }
    };

    loadData();
  }, []);

  const initializeServices = async () => {
    try {
      await aiService.initialize();
      await databaseService.initialize();
      await userScriptService.initialize();
      await mcpService.initialize();

      // Performance monitoring
      performanceService.startMonitoring();

      console.log('Services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  };

  const loadBrowsingData = async () => {
    try {
      // Load AI configuration
      const aiStatus = aiService.getProviderStatus();
      setAiConfigured(aiStatus.configured && aiStatus.ready);

      // Load history
      const historyData = await databaseService.getHistory(50);
      setHistory(historyData);

      // Load bookmarks
      const bookmarkData = await databaseService.getBookmarks();
      setBookmarks(bookmarkData);

    } catch (error) {
      console.error('Failed to load browsing data:', error);
    }
  };

  const loadHomePageSettings = async () => {
    try {
      const shortcuts = await homePageService.getShortcuts();
      const homeUrl = await homePageService.getHomePageUrl();
      setHomePageShortcuts(shortcuts);
      setHomePageUrl(homeUrl);
    } catch (error) {
      console.error('Failed to load homepage settings:', error);
    }
  };

  const checkIfBookmarked = async (url: string) => {
    try {
      const bookmarks = await databaseService.getBookmarks();
      const isBookmarked = bookmarks.some((b: any) => b.url === url);
      setBookmarked(isBookmarked);
    } catch (error) {
      console.error('Failed to check if bookmarked:', error);
    }
  };

  const saveToHistory = async (url: string, title: string) => {
    if (!url || url === 'about:blank') return;

    // Skip for incognito tabs
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    if (currentTab?.isIncognito) return;

    try {
      await databaseService.addHistoryItem({
        url,
        title,
        visitedAt: new Date().toISOString(),
        favicon: currentTab?.favicon || '',
      });

      // Update history state
      const historyData = await databaseService.getHistory(50);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  };

  // Tab management functions
  const createNewTab = (url?: string, isIncognito?: boolean): Tab => {
    const id = Date.now().toString();
    const tabUrl = url || homePageUrl;
    const isHomePage = homePageService.isCustomHomePage(tabUrl);

    return {
      id,
      url: tabUrl,
      title: isHomePage ? 'VaiBrowser 主页' : '新标签页',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      progress: 0,
      isIncognito: isIncognito || false,
      isActive: true,
    };
  };

  const handleNewTab = (isIncognito: boolean = false) => {
    const newTab = createNewTab(undefined, isIncognito);

    setTabs(prevTabs => [
      ...prevTabs.map(tab => ({ ...tab, isActive: false })),
      { ...newTab, isActive: true }
    ]);

    setActiveTabId(newTab.id);
    setTabManagerVisible(false);
  };

  const handleTabSelect = (tabId: string) => {
    setTabs(prevTabs =>
      prevTabs.map(tab => ({
        ...tab,
        isActive: tab.id === tabId
      }))
    );
    setActiveTabId(tabId);
    setTabManagerVisible(false);
  };

  const handleTabClose = (tabId: string) => {
    if (tabs.length <= 1) {
      // If it's the last tab, create a new one
      handleNewTab();
      return;
    }

    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    const isActiveTab = tabId === activeTabId;

    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);

      // If we closed the active tab, select another one
      if (isActiveTab && newTabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        newTabs[newActiveIndex].isActive = true;
        setActiveTabId(newTabs[newActiveIndex].id);
      }

      return newTabs;
    });
  };

  const handleCloseAllTabs = () => {
    // Create a new regular tab
    const newTab = createNewTab(undefined, false);
    setTabs([{ ...newTab, isActive: true }]);
    setActiveTabId(newTab.id);
    setTabManagerVisible(false);
  };

  const updateTab = (tabId: string, updates: Partial<Tab>) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    );
  };

  // Navigation handlers
  const handleNavigate = (input: string) => {
    if (!currentTab) return;

    const url = formatUrl(input);
    updateTab(currentTab.id, {
      url,
      isLoading: true,
      progress: 0
    });

    // Save to history (unless incognito)
    if (!currentTab.isIncognito) {
      saveToHistory(url, input);
    }
  };

  const formatUrl = (input: string): string => {
    if (input.includes('://')) {
      return input;
    }

    if (input.includes('.') && !input.includes(' ')) {
      return `https://${input}`;
    }

    return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
  };

  const handleShowSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    try {
      let suggestions: SearchSuggestion[] = [];

      // Get AI-powered suggestions if available
      if (aiConfigured) {
        try {
          suggestions = await aiService.generateSearchSuggestions(
            query,
            history,
            bookmarks
          );
        } catch (error) {
          console.log('AI suggestions failed, using fallback');
        }
      }

      // Fallback to simple suggestions
      if (suggestions.length === 0) {
        suggestions = generateFallbackSuggestions(query);
      }

      setSearchSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      setSearchSuggestions(generateFallbackSuggestions(query));
    }
  };

  const generateFallbackSuggestions = (query: string): SearchSuggestion[] => {
    const suggestions: SearchSuggestion[] = [];

    // Check if input looks like a URL
    if (query.includes('.') && !query.includes(' ')) {
      suggestions.push({
        query: query.includes('://') ? query : `https://${query}`,
        type: 'url',
        confidence: 0.9,
      });
    }

    // Search in history (only for non-incognito tabs)
    if (!currentTab?.isIncognito) {
      const historyMatches = history
        .filter(url => url.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3);

      historyMatches.forEach(url => {
        suggestions.push({
          query: url,
          type: 'history',
          confidence: 0.7,
        });
      });
    }

    // Search in bookmarks
    const bookmarkMatches = bookmarks
      .filter(url => url.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 2);

    bookmarkMatches.forEach(url => {
      suggestions.push({
        query: url,
        type: 'bookmark',
        confidence: 0.8,
      });
    });

    // Default search suggestion
    if (query.length > 2) {
      suggestions.push({
        query: `Search for "${query}"`,
        type: 'search',
        confidence: 0.6,
      });
    }

    return suggestions.slice(0, 5);
  };

  const handleRefresh = () => {
    setNavigationCommand('reload');
  };

  const handleGoBack = () => {
    if (currentTab?.canGoBack) {
      setNavigationCommand('back');
    }
  };

  const handleGoForward = () => {
    if (currentTab?.canGoForward) {
      setNavigationCommand('forward');
    }
  };

  const handleNavigationCommandExecuted = () => {
    setNavigationCommand(null);
  };

  // WebView event handlers
  const handleNavigationStateChange = (tabId: string, navState: any) => {
    updateTab(tabId, {
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
      url: navState.url,
      title: navState.title || 'Loading...',
    });
  };

  const handleLoadStart = (tabId: string) => {
    updateTab(tabId, { isLoading: true, progress: 0 });
  };

  const handleLoadProgress = (tabId: string, progress: number) => {
    updateTab(tabId, { progress });
  };

  const handleLoadEnd = (tabId: string, url: string, title: string) => {
    updateTab(tabId, {
      url,
      title,
      isLoading: false,
      progress: 1,
    });

    // Save to history (unless incognito)
    const tab = tabs.find(t => t.id === tabId);
    if (url !== 'https://www.google.com' && !tab?.isIncognito) {
      saveToHistory(url, title);
    }
  };

  const handleError = (tabId: string, error: any) => {
    console.error('WebView error:', error);
    updateTab(tabId, { isLoading: false, progress: 0 });

    Alert.alert(
      'Page Load Error',
      'Failed to load the page. Please check your internet connection and try again.',
      [
        { text: 'OK', style: 'default' },
        { text: 'Retry', onPress: handleRefresh },
      ]
    );
  };

  const handleMessage = (tabId: string, message: any) => {
    console.log('WebView message:', message);

    switch (message.type) {
      case 'ai_button_clicked':
        setCurrentPageContent(message.pageContent);
        setAiChatVisible(true);
        break;

      case 'text_selected':
        setSelectedText(message.selectedText);
        break;

      case 'page_content_extracted':
        setCurrentPageContent(message.content.text);
        break;

      case 'download_requested':
        handleDownloadRequest(message.url, message.filename);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  };

  // Download handlers
  const handleDownloadRequest = async (url: string, filename?: string) => {
    try {
      // Check if URL is downloadable
      if (!downloadService.isDownloadableUrl(url)) {
        Alert.alert(
          'Download Not Supported',
          'This file type is not supported for download.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Download File',
        `Do you want to download ${filename || 'this file'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: async () => {
              try {
                await downloadService.startDownload({ url, filename });
                Alert.alert(
                  'Download Started',
                  'File download has started. You can view progress in the Downloads manager.',
                  [
                    { text: 'OK' },
                    { text: 'View Downloads', onPress: () => setDownloadManagerVisible(true) },
                  ]
                );
              } catch (error) {
                console.error('Download failed:', error);
                Alert.alert('Download Failed', 'Failed to start download. Please try again.');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Download request failed:', error);
      Alert.alert('Error', 'Failed to process download request.');
    }
  };

  const handlePauseDownload = async (id: string) => {
    try {
      await downloadService.pauseDownload(id);
    } catch (error) {
      console.error('Failed to pause download:', error);
    }
  };

  const handleResumeDownload = async (id: string) => {
    try {
      await downloadService.resumeDownload(id);
    } catch (error) {
      console.error('Failed to resume download:', error);
    }
  };

  const handleCancelDownload = async (id: string) => {
    try {
      await downloadService.cancelDownload(id);
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  };

  const handleRetryDownload = async (id: string) => {
    try {
      await downloadService.retryDownload(id);
    } catch (error) {
      console.error('Failed to retry download:', error);
    }
  };

  const handleClearCompleted = async () => {
    try {
      await downloadService.clearCompleted();
    } catch (error) {
      console.error('Failed to clear completed downloads:', error);
    }
  };

  const handleClearAllDownloads = async () => {
    try {
      await downloadService.clearAll();
    } catch (error) {
      console.error('Failed to clear all downloads:', error);
    }
  };

  // AI Chat handlers
  const handleToggleAI = () => {
    setAiChatVisible(!aiChatVisible);
  };

  // 新增：快速AI Chat功能 - 自动获取当前页面上下文
  const handleQuickAIChat = () => {
    if (!currentTab) return;

    // 设置页面上下文
    setAIContext({
      type: 'quick_chat',
      title: currentTab.title,
      url: currentTab.url,
      content: currentPageContent || ''
    });

    // 打开AI Chat面板
    setAiChatVisible(true);

    // 如果当前页面内容为空，尝试从WebView获取
    if (!currentPageContent) {
      // 通过WebView注入的脚本自动获取页面内容
      // 这将触发 'page_content_extracted' 消息
      console.log('Requesting page content extraction for AI chat');
    }
  };

  const handleSendAIMessage = async (message: string, context: string): Promise<ReadableStream<string>> => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    setAiMessages(prev => [...prev, userMessage]);

    try {
      if (!aiConfigured) {
        throw new Error('AI not configured');
      }

      // Get AI response using the real AI service
      const responseStream = await aiService.streamResponse(
        message,
        context,
        aiMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      );

      // Create assistant message placeholder
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setAiMessages(prev => [...prev, assistantMessage]);

      // Handle the streaming response
      const reader = responseStream.getReader();
      let accumulatedContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          accumulatedContent += value;

          // Update the streaming message
          setAiMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          );
        }

        // Mark as complete
        setAiMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false }
              : msg
          )
        );

      } finally {
        reader.releaseLock();
      }

      return responseStream;

    } catch (error) {
      console.error('AI chat error:', error);

      // Remove user message and add error message
      setAiMessages(prev => prev.slice(0, -1));

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure the AI service is properly configured with a valid API key.',
        timestamp: Date.now(),
      };

      setAiMessages(prev => [...prev, errorMessage]);

      throw error;
    }
  };

  const handleClearAIHistory = () => {
    setAiMessages([]);
  };

  const handleConfigureAI = () => {
    Alert.alert(
      'Configure AI',
      'To use AI features, you need to configure an AI provider and API key in the Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go to Settings', onPress: () => {
            // Navigate to settings tab - this should be implemented with proper navigation
            console.log('Navigate to settings tab');
          }
        },
      ]
    );
  };

  // Bookmark management
  const handleToggleBookmark = async () => {
    if (!currentTab) return;

    // Don't allow bookmarking in incognito mode
    if (currentTab.isIncognito) {
      Alert.alert(
        'Incognito Mode',
        'Bookmarks are not available in incognito mode.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      if (bookmarked) {
        await databaseService.removeBookmark(currentTab.url);
        setBookmarked(false);
        Alert.alert('Bookmark Removed', 'Page removed from bookmarks');
      } else {
        await databaseService.addBookmark({
          url: currentTab.url,
          title: currentTab.title,
          createdAt: new Date().toISOString(),
          favicon: currentTab.favicon,
        });
        setBookmarked(true);
        Alert.alert('Bookmark Added', 'Page added to bookmarks');
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark');
    }
  };

  // History and Bookmarks UI handlers
  const handleShowHistory = () => {
    if (currentTab?.isIncognito) {
      Alert.alert(
        'Incognito Mode',
        'History is not available in incognito mode.',
        [{ text: 'OK' }]
      );
      return;
    }
    setHistoryVisible(true);
  };

  const handleShowBookmarks = () => {
    setBookmarksVisible(true);
  };

  const handleHistoryNavigate = (url: string) => {
    handleNavigate(url);
    setHistoryVisible(false);
  };

  const handleBookmarkNavigate = (url: string) => {
    handleNavigate(url);
    setBookmarksVisible(false);
  };

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = performanceService.getPerformanceStats();
      setPerformanceStats(stats);
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleWebViewMessage = async (tabId: string, message: any) => {
    console.log('WebView message:', message);

    switch (message.type) {
      case 'ai_button_clicked':
        setAIContext({
          type: 'page_content',
          content: message.pageContent,
          title: message.pageTitle,
          url: message.pageUrl
        });
        setShowAIChat(true);
        break;

      case 'text_selected':
        setAIContext({
          type: 'selected_text',
          content: message.selectedText,
          url: message.pageUrl
        });
        break;

      case 'page_content_extracted':
        console.log('Page content extracted:', message.content);
        break;

      case 'resources_extracted':
        // 处理从WebView接收到的资源数据
        handleResourcesExtracted(message.resources);
        break;

      case 'user_script_executed':
        console.log(`User script executed: ${message.scriptName}`);
        break;

      case 'user_script_error':
        console.error(`User script error in ${message.scriptName}:`, message.error);
        Alert.alert(
          'User Script Error',
          `Script "${message.scriptName}" encountered an error: ${message.error}`,
          [{ text: 'OK' }]
        );
        break;

      case 'performance_metric':
        performanceService.measureLoadTime(Date.now() - message.duration);
        break;

      case 'memory_usage':
        console.log('Memory usage:', message);
        break;

      case 'ai_script_injected':
        console.log(`AI script injected in ${message.injectionTime}ms`);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  };

  // 处理从WebView提取的资源
  const handleResourcesExtracted = (rawResources: any[]) => {
    try {
      const processedResources: ResourceItem[] = rawResources.map((resource, index) => ({
        id: resource.id || `resource_${Date.now()}_${index}`,
        url: resource.url,
        type: resource.type || 'other',
        name: resource.name || resource.url.split('/').pop() || 'unknown',
        size: resource.size ? String(resource.size) : undefined,
        extension: resource.extension,
        thumbnail: resource.thumbnail,
      }));
      setPageResources(processedResources);
      console.log(`Extracted ${processedResources.length} resources from page`);
    } catch (error) {
      console.error('Failed to process extracted resources:', error);
    }
  };

  // 处理资源嗅探
  const handleResourceSniffed = (resource: any) => {
    try {
      // Add the sniffed resource to page resources
      const resourceItem = {
        id: Date.now().toString(),
        url: resource.url,
        type: resource.type || 'unknown',
        name: resource.name || resource.url.split('/').pop() || 'unknown',
        size: resource.size || 0,
        createdAt: new Date().toISOString(),
      };
      setPageResources(prev => [...prev, resourceItem]);
    } catch (error) {
      console.error('Failed to handle sniffed resource:', error);
    }
  };

  // 触发资源提取
  const handleExtractResources = async (): Promise<ResourceItem[]> => {
    return pageResources;
  };

  // 下载资源
  const handleDownloadResource = (resource: ResourceItem) => {
    try {
      if (!resourceSnifferService.isDownloadableResource(resource.url)) {
        Alert.alert('不支持的资源', '该资源类型不支持下载');
        return;
      }

      const filename = resourceSnifferService.getSuggestedFilename({
        ...resource,
        type: resource.type,
      });
      handleDownloadRequest(resource.url, filename);

      Alert.alert('开始下载', `正在下载: ${resource.name}`);
    } catch (error) {
      console.error('Failed to download resource:', error);
      Alert.alert('下载失败', '资源下载失败，请重试');
    }
  };

  // 主页快捷方式管理
  const handleUpdateHomePageShortcuts = async (shortcuts: HomePageShortcut[]) => {
    try {
      const shortcutsWithTimestamp = shortcuts.map(shortcut => ({
        ...shortcut,
        addedAt: shortcut.addedAt || new Date().toISOString(),
      }));
      await homePageService.updateShortcuts(shortcutsWithTimestamp as any);
      setHomePageShortcuts(shortcuts);
    } catch (error) {
      console.error('Failed to update homepage shortcuts:', error);
      Alert.alert('错误', '更新主页快捷方式失败');
    }
  };

  // 添加当前页面到主页
  const handleAddCurrentPageToHome = async () => {
    if (!currentTab) return;

    try {
      const favicon = homePageService.generateFaviconUrl(currentTab.url);
      await homePageService.addShortcut({
        title: currentTab.title,
        url: currentTab.url,
        favicon,
      });

      // 重新加载快捷方式
      await loadHomePageSettings();
      Alert.alert('添加成功', `"${currentTab.title}" 已添加到主页`);
    } catch (err: any) {
      Alert.alert('添加失败', err?.message || '无法添加到主页');
    }
  };

  // 导航到主页
  const handleNavigateToHome = () => {
    if (currentTab) {
      updateTab(currentTab.id, {
        url: homePageUrl,
        isLoading: false,
        progress: 0,
        title: 'VaiBrowser 主页'
      });
    }
  };

  // Share functionality
  const handleShare = async () => {
    if (!currentTab) return;

    try {
      await Share.share({
        message: `${currentTab.title}\n${currentTab.url}`,
        url: currentTab.url,
        title: currentTab.title,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // 工具菜单配置
  const getToolsMenuItems = () => {
    const mcpStats = mcpService.getStatistics();
    const scriptStats = userScriptService.getScriptStats();

    return [
      {
        id: 'ai_chat',
        title: 'AI 智能助手',
        subtitle: aiConfigured ? '与AI进行智能对话' : '需要配置AI提供商',
        icon: 'chatbubble-ellipses',
        color: '#007AFF',
        onPress: () => setShowAIChat(true),
        disabled: !aiConfigured,
      },
      {
        id: 'ai_quick',
        title: '快速AI对话',
        subtitle: '基于当前页面内容的AI对话',
        icon: 'sparkles',
        color: '#5856D6',
        onPress: handleQuickAIChat,
        disabled: !aiConfigured,
      },
      {
        id: 'tools_scripts',
        title: '用户脚本',
        subtitle: `${scriptStats?.enabledScripts || 0} 个脚本已启用`,
        icon: 'code-slash',
        color: '#AF52DE',
        onPress: () => setShowUserScripts(true),
        badge: scriptStats?.enabledScripts > 0 ? String(scriptStats.enabledScripts) : undefined,
      },
      {
        id: 'tools_resources',
        title: '资源嗅探',
        subtitle: '提取并下载页面资源',
        icon: 'search',
        color: '#34C759',
        onPress: () => setShowResourceSniffer(true),
      },
      {
        id: 'tools_mcp',
        title: 'MCP 工具',
        subtitle: `${mcpStats.connectedServers} 个服务器已连接`,
        icon: 'extension-puzzle',
        color: '#FF9500',
        onPress: () => {
          // Navigate to settings MCP section
          console.log('Navigate to MCP settings');
        },
        badge: mcpStats.connectedServers > 0 ? String(mcpStats.connectedServers) : undefined,
      },
      {
        id: 'browser_downloads',
        title: '下载管理',
        subtitle: '查看和管理下载文件',
        icon: 'download',
        color: '#FF3B30',
        onPress: () => setDownloadManagerVisible(true),
        badge: downloads.length > 0 ? String(downloads.length) : undefined,
      },
      {
        id: 'browser_bookmarks',
        title: '书签',
        subtitle: '管理收藏的网页',
        icon: 'bookmark',
        color: '#FF9500',
        onPress: () => setBookmarksVisible(true),
      },
      {
        id: 'browser_history',
        title: '浏览历史',
        subtitle: currentTab?.isIncognito ? '隐身模式下不可用' : '查看浏览记录',
        icon: 'time',
        color: '#5856D6',
        onPress: () => setHistoryVisible(true),
        disabled: currentTab?.isIncognito,
      },
      {
        id: 'browser_tabs',
        title: '标签管理',
        subtitle: `当前有 ${tabs.length} 个标签页`,
        icon: 'browsers',
        color: '#007AFF',
        onPress: () => setTabManagerVisible(true),
        badge: tabs.length > 1 ? String(tabs.length) : undefined,
      },
      {
        id: 'browser_share',
        title: '分享页面',
        subtitle: '分享当前网页',
        icon: 'share',
        color: '#34C759',
        onPress: handleShare,
        disabled: !currentTab || currentTab.url === homePageUrl,
      },
      {
        id: 'settings_performance',
        title: '性能监控',
        subtitle: performanceStats ?
          `内存: ${Math.round(performanceStats.averageMemoryUsage / 1024 / 1024)}MB` :
          '查看浏览器性能',
        icon: 'speedometer',
        color: '#FF3B30',
        onPress: () => {
          Alert.alert(
            '性能统计',
            `标签页: ${performanceStats?.totalTabs || 0}\n` +
            `内存使用: ${Math.round((performanceStats?.averageMemoryUsage || 0) / 1024 / 1024)}MB\n` +
            `平均加载时间: ${Math.round(performanceStats?.averageLoadTime || 0)}ms\n` +
            `缓存命中率: ${Math.round(performanceStats?.cacheHitRate || 0)}%`,
            [{ text: '确定' }]
          );
        },
      },
    ];
  };

  // Render main content
  const renderMainContent = () => {
    if (!currentTab) return null;

    const isHomePage = homePageService.isCustomHomePage(currentTab.url);

    if (isHomePage) {
      return (
        <HomePage
          onNavigate={handleNavigate}
          onShowAIChat={() => setShowAIChat(true)}
          onShowResourceSniffer={() => setShowResourceSniffer(true)}
          onShowUserScripts={() => setShowUserScripts(true)}
          onShowDownloads={() => setShowDownloads(true)}
          onShowBookmarks={() => setShowBookmarks(true)}
          onShowHistory={() => setShowHistory(true)}
          shortcuts={homePageShortcuts}
          onUpdateShortcuts={handleUpdateHomePageShortcuts}
          currentPageUrl={currentTab.url !== homePageUrl ? currentTab.url : undefined}
          currentPageTitle={currentTab.url !== homePageUrl ? currentTab.title : undefined}
          aiConfigured={aiConfigured}
        />
      );
    }

    return null; // Remove the BrowserWebView component from renderMainContent
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity
        style={[styles.quickActionButton, isDark && styles.quickActionButtonDark]}
        onPress={() => setShowHistory(true)}
      >
        <Text style={styles.quickActionIcon}>📚</Text>
        <Text style={[styles.quickActionText, isDark && styles.quickActionTextDark]}>History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionButton, isDark && styles.quickActionButtonDark]}
        onPress={() => setShowBookmarks(true)}
      >
        <Text style={styles.quickActionIcon}>⭐</Text>
        <Text style={[styles.quickActionText, isDark && styles.quickActionTextDark]}>Bookmarks</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionButton, isDark && styles.quickActionButtonDark]}
        onPress={() => setShowDownloads(true)}
      >
        <Text style={styles.quickActionIcon}>📥</Text>
        <Text style={[styles.quickActionText, isDark && styles.quickActionTextDark]}>Downloads</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionButton, isDark && styles.quickActionButtonDark]}
        onPress={() => setShowUserScripts(true)}
      >
        <Text style={styles.quickActionIcon}>🐒</Text>
        <Text style={[styles.quickActionText, isDark && styles.quickActionTextDark]}>Scripts</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionButton, isDark && styles.quickActionButtonDark]}
        onPress={() => setShowAIChat(true)}
      >
        <Text style={styles.quickActionIcon}>✨</Text>
        <Text style={[styles.quickActionText, isDark && styles.quickActionTextDark]}>AI Chat</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionButton, isDark && styles.quickActionButtonDark]}
        onPress={() => setShowResourceSniffer(true)}
      >
        <Text style={styles.quickActionIcon}>🕵️</Text>
        <Text style={[styles.quickActionText, isDark && styles.quickActionTextDark]}>Resources</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPerformanceIndicator = () => {
    if (!performanceStats || tabs.length === 0) return null;

    return (
      <View style={[styles.performanceIndicator, isDark && styles.performanceIndicatorDark]}>
        <Text style={[styles.performanceText, isDark && styles.performanceTextDark]}>
          🚀 {performanceStats.totalTabs} tabs •
          📊 {Math.round(performanceStats.averageMemoryUsage / 1024 / 1024)}MB •
          ⚡ {Math.round(performanceStats.averageLoadTime)}ms •
          🤖 <Text style={{ color: aiService.isConfigured() ? '#4CAF50' : '#FF3B30' }}>
            {aiService.isConfigured() ? 'AI' : 'OFF'}
          </Text> •
          🔧 <Text style={{ color: mcpService.getStatistics().connectedServers > 0 ? '#4CAF50' : '#8E8E93' }}>
            {mcpService.getStatistics().connectedServers > 0 ? 'MCP' : 'OFF'}
          </Text>
        </Text>
      </View>
    );
  };

  if (!currentTab) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.errorContainer}>
          {/* Error state */}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Address Bar */}
      <AddressBar
        currentUrl={currentTab.url}
        isLoading={currentTab.isLoading}
        progress={currentTab.progress}
        canGoBack={currentTab.canGoBack}
        canGoForward={currentTab.canGoForward}
        onNavigate={handleNavigate}
        onShowSuggestions={handleShowSuggestions}
        suggestions={searchSuggestions}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onRefresh={handleRefresh}
        onToggleAI={handleToggleAI}
        aiEnabled={aiChatVisible}
        isBookmarked={bookmarked}
        onToggleBookmark={handleToggleBookmark}
        onShowHistory={handleShowHistory}
        onShowBookmarks={handleShowBookmarks}
        onShowTabManager={() => setTabManagerVisible(true)}
        tabCount={tabs.length}
        isIncognito={currentTab.isIncognito}
        onShowDownloads={() => setDownloadManagerVisible(true)}
        downloadCount={downloads.length}
        onUserScriptsPress={() => setShowUserScripts(true)}
        onQuickAIChat={handleQuickAIChat}
        aiConfigured={aiConfigured}
        onShowResourceSniffer={() => setShowResourceSniffer(true)}
        onHome={handleNavigateToHome}
        onAddToHome={handleAddCurrentPageToHome}
        onShowToolsMenu={() => setShowToolsMenu(true)}
        showAddToHome={currentTab.url !== homePageUrl && !homePageService.isCustomHomePage(currentTab.url)}
      />

      {/* Main Content Area */}
      <View style={styles.contentContainer}>
        {renderMainContent()}
      </View>

      {/* Performance Indicator */}
      {renderPerformanceIndicator()}

      {/* WebView Container */}
      <View style={styles.webViewContainer}>
        {tabs.map(tab => (
          <View
            key={tab.id}
            style={[
              styles.webViewWrapper,
              { display: tab.id === activeTabId ? 'flex' : 'none' }
            ]}
          >
            <BrowserWebView
              tabId={tab.id}
              initialUrl={tab.url}
              isActive={tab.id === activeTabId}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadStart={handleLoadStart}
              onLoadProgress={handleLoadProgress}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              onMessage={handleWebViewMessage}
              navigationCommand={tab.id === activeTabId ? navigationCommand : null}
              onNavigationCommandExecuted={handleNavigationCommandExecuted}
            />
          </View>
        ))}
      </View>

      {/* Tab Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        onNewTab={() => handleNewTab(false)}
        onShowTabManager={() => setTabManagerVisible(true)}
        isVisible={tabs.length > 1}
      />

      {/* Tools Menu */}
      <ToolsMenu
        isVisible={showToolsMenu}
        onClose={() => setShowToolsMenu(false)}
        tools={getToolsMenuItems()}
        title="浏览器工具"
        subtitle="选择要使用的功能和工具"
      />

      {/* AI Chat Panel */}
      <AIChatPanel
        isVisible={aiChatVisible}
        onClose={() => setAiChatVisible(false)}
        currentPageTitle={currentTab.title}
        currentPageUrl={currentTab.url}
        currentPageContent={currentPageContent}
        selectedText={selectedText}
        onSendMessage={handleSendAIMessage}
        messages={aiMessages}
        onClearHistory={handleClearAIHistory}
        aiConfigured={aiConfigured}
        onConfigureAI={handleConfigureAI}
      />

      {/* Tab Manager Modal */}
      <Modal
        isVisible={tabManagerVisible}
        onBackdropPress={() => setTabManagerVisible(false)}
        style={styles.fullScreenModal}
        useNativeDriver={true}
      >
        <TabManager
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={handleTabSelect}
          onTabClose={handleTabClose}
          onNewTab={handleNewTab}
          onCloseAllTabs={handleCloseAllTabs}
          maxTabs={10}
        />
      </Modal>

      {/* Download Manager */}
      <DownloadManager
        isVisible={downloadManagerVisible}
        onClose={() => setDownloadManagerVisible(false)}
        downloads={downloads.map(download => ({
          ...download,
          downloadedSize: download.downloadedSize || 0,
        }))}
        onPauseDownload={handlePauseDownload}
        onResumeDownload={handleResumeDownload}
        onCancelDownload={handleCancelDownload}
        onRetryDownload={handleRetryDownload}
        onClearCompleted={handleClearCompleted}
        onClearAll={handleClearAllDownloads}
      />

      {/* History Manager */}
      <HistoryManager
        isVisible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        onNavigateToUrl={handleHistoryNavigate}
      />

      {/* Bookmark Manager */}
      <BookmarkManager
        isVisible={bookmarksVisible}
        onClose={() => setBookmarksVisible(false)}
        onNavigateToUrl={handleBookmarkNavigate}
      />

      {/* User Script Manager Modal */}
      <UserScriptManager
        visible={showUserScripts}
        onClose={() => setShowUserScripts(false)}
      />

      {/* Resource Sniffer Modal */}
      <ResourceSniffer
        isVisible={showResourceSniffer}
        onClose={() => setShowResourceSniffer(false)}
        currentPageUrl={currentTab.url}
        currentPageTitle={currentTab.title}
        onExtractResources={handleExtractResources}
        onDownloadResource={handleDownloadResource}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
  },
  webViewWrapper: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenModal: {
    margin: 0,
  },
  performanceIndicator: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  performanceIndicatorDark: {
    backgroundColor: '#2C2C2E',
    borderBottomColor: '#48484A',
  },
  performanceText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  performanceTextDark: {
    color: '#8E8E93',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 30,
    gap: 15,
  },
  quickActionButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionButtonDark: {
    backgroundColor: '#2C2C2E',
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  quickActionTextDark: {
    color: '#FFF',
  },
  contentContainer: {
    flex: 1,
  },
});

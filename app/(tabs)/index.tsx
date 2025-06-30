import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, Share, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';

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
import UserScriptManager from '@/components/browser/UserScriptManager';

// Services
import { aiService } from '@/services/AIService';
import { databaseService } from '@/services/DatabaseService';
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
  isActive?: boolean;
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
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  progress: number;
  totalSize?: number;
  downloadedSize?: number;
  createdAt: string;
}

interface ResourceItem {
  id: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}

interface HomePageShortcut {
  id: string;
  title: string;
  url: string;
}

export default function BrowserScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [navigationCommand, setNavigationCommand] = useState<'refresh' | 'back' | 'forward' | null>(null);
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
    setNavigationCommand('refresh');
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
      const responseStream = await aiService.chat(
        `Context: ${context}\n\nUser: ${message}`,
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
      'To use AI features, you need to configure an OpenAI API key in the Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go to Settings', onPress: () => {
            // This would navigate to settings tab
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
      const processedResources = resourceSnifferService.processExtractedResources(rawResources);
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
        size: resource.size || 0,
        name: resource.name || resource.url.split('/').pop() || 'unknown',
        createdAt: new Date().toISOString(),
      };
      setPageResources(prev => [...prev, resourceItem]);
    } catch (error) {
      console.error('Failed to handle sniffed resource:', error);
    }
  };

  // 触发资源提取
  const handleExtractResources = async (): Promise<ResourceItem[]> => {
    return new Promise((resolve, reject) => {
      // 请求WebView提取资源
      // 这里需要一个方法来向WebView发送消息
      // 暂时返回当前已提取的资源
      resolve(pageResources);
    });
  };

  // 下载资源
  const handleDownloadResource = async (resource: ResourceItem) => {
    try {
      if (!resourceSnifferService.isDownloadableResource(resource.url)) {
        Alert.alert('不支持的资源', '该资源类型不支持下载');
        return;
      }

      const filename = resourceSnifferService.getSuggestedFilename(resource);
      await handleDownloadRequest(resource.url, filename);

      Alert.alert('开始下载', `正在下载: ${resource.name}`);
    } catch (error) {
      console.error('Failed to download resource:', error);
      Alert.alert('下载失败', '资源下载失败，请重试');
    }
  };

  // 主页快捷方式管理
  const handleUpdateHomePageShortcuts = async (shortcuts: HomePageShortcut[]) => {
    try {
      await homePageService.updateShortcuts(shortcuts);
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
    } catch (error) {
      Alert.alert('添加失败', error.message || '无法添加到主页');
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

    return (
      <BrowserWebView
        url={currentTab.url}
        userScripts={userScripts}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onLoadProgress={handleLoadProgress}
        onMessage={handleWebViewMessage}
        onResourceSniffed={handleResourceSniffed}
        ref={(ref) => {
          if (ref && currentTab) {
            webViewRef.current = ref;
          }
        }}
      />
    );
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
        url={currentTab.url}
        isLoading={currentTab.isLoading}
        progress={currentTab.progress}
        canGoBack={currentTab.canGoBack}
        canGoForward={currentTab.canGoForward}
        isBookmarked={bookmarked}
        onNavigate={handleNavigate}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onRefresh={handleRefresh}
        onBookmark={handleToggleBookmark}
        onShare={handleShare}
        onNewTab={handleNewTab}
        onQuickAIChat={handleQuickAIChat}
        onResourceSniffer={handleResourceSniffed}
        aiConfigured={aiConfigured}
        onHome={handleNavigateToHome}
        onAddToHome={handleAddCurrentPageToHome}
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
        downloads={downloads}
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

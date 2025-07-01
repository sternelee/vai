import { BehaviorSubject, Subject } from "rxjs";
import { v4 as uuidv4 } from "uuid";

export interface Tab {
  id: string;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  progress: number;
  favicon?: string;
  isActive: boolean;
}

export interface BrowserState {
  tabs: Tab[];
  activeTabId: string | null;
  isIncognito: boolean;
  showAddressBar: boolean;
  addressBarQuery: string;
  searchSuggestions: any[];
  aiChatVisible: boolean;
  aiChatMessages: {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }[];
}

class BrowserStore {
  private state: BrowserState = {
    tabs: [],
    activeTabId: null,
    isIncognito: false,
    showAddressBar: true,
    addressBarQuery: "",
    searchSuggestions: [],
    aiChatVisible: false,
    aiChatMessages: [],
  };

  // Observable state
  private stateSubject = new BehaviorSubject<BrowserState>(this.state);
  public state$ = this.stateSubject.asObservable();

  // Action subjects
  private tabCreatedSubject = new Subject<Tab>();
  private tabClosedSubject = new Subject<string>();
  private navigationSubject = new Subject<{ tabId: string; url: string }>();

  public tabCreated$ = this.tabCreatedSubject.asObservable();
  public tabClosed$ = this.tabClosedSubject.asObservable();
  public navigation$ = this.navigationSubject.asObservable();

  constructor() {
    // Create initial tab
    this.createNewTab("https://www.google.com");
  }

  private updateState(updates: Partial<BrowserState>) {
    this.state = { ...this.state, ...updates };
    this.stateSubject.next(this.state);
  }

  private updateTab(tabId: string, updates: Partial<Tab>) {
    const tabs = this.state.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, ...updates } : tab,
    );
    this.updateState({ tabs });
  }

  // Tab management
  createNewTab(url: string = "https://www.google.com"): string {
    const newTab: Tab = {
      id: uuidv4(),
      url,
      title: "New Tab",
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
      progress: 0,
      isActive: false,
    };

    // Deactivate all other tabs
    const tabs = this.state.tabs.map((tab) => ({ ...tab, isActive: false }));
    tabs.push({ ...newTab, isActive: true });

    this.updateState({
      tabs,
      activeTabId: newTab.id,
    });

    this.tabCreatedSubject.next(newTab);
    this.navigationSubject.next({ tabId: newTab.id, url });

    return newTab.id;
  }

  closeTab(tabId: string): void {
    const tabs = this.state.tabs.filter((tab) => tab.id !== tabId);
    let activeTabId = this.state.activeTabId;

    // If closing the active tab, switch to another tab
    if (activeTabId === tabId) {
      if (tabs.length > 0) {
        activeTabId = tabs[tabs.length - 1].id;
        tabs[tabs.length - 1].isActive = true;
      } else {
        // Create a new tab if no tabs left
        activeTabId = this.createNewTab();
        return; // createNewTab will handle the state update
      }
    }

    this.updateState({ tabs, activeTabId });
    this.tabClosedSubject.next(tabId);
  }

  switchToTab(tabId: string): void {
    const tabs = this.state.tabs.map((tab) => ({
      ...tab,
      isActive: tab.id === tabId,
    }));

    this.updateState({
      tabs,
      activeTabId: tabId,
    });
  }

  // Navigation
  navigateToUrl(tabId: string, url: string): void {
    this.updateTab(tabId, {
      url,
      isLoading: true,
      progress: 0,
    });
    this.navigationSubject.next({ tabId, url });
  }

  // WebView event handlers
  onNavigationStart(tabId: string): void {
    this.updateTab(tabId, {
      isLoading: true,
      progress: 0,
    });
  }

  onNavigationProgress(tabId: string, progress: number): void {
    this.updateTab(tabId, { progress });
  }

  onNavigationComplete(tabId: string, url: string, title: string): void {
    this.updateTab(tabId, {
      url,
      title,
      isLoading: false,
      progress: 1,
    });
  }

  onNavigationError(tabId: string): void {
    this.updateTab(tabId, {
      isLoading: false,
      progress: 0,
    });
  }

  updateTabNavigationState(
    tabId: string,
    canGoBack: boolean,
    canGoForward: boolean,
  ): void {
    this.updateTab(tabId, { canGoBack, canGoForward });
  }

  updateTabFavicon(tabId: string, favicon: string): void {
    this.updateTab(tabId, { favicon });
  }

  // Address bar
  setAddressBarQuery(query: string): void {
    this.updateState({ addressBarQuery: query });
  }

  setSearchSuggestions(suggestions: any[]): void {
    this.updateState({ searchSuggestions: suggestions });
  }

  showAddressBar(): void {
    this.updateState({ showAddressBar: true });
  }

  hideAddressBar(): void {
    this.updateState({ showAddressBar: false });
  }

  // Incognito mode
  toggleIncognito(): void {
    this.updateState({ isIncognito: !this.state.isIncognito });
  }

  // AI Chat
  toggleAiChat(): void {
    this.updateState({ aiChatVisible: !this.state.aiChatVisible });
  }

  addAiChatMessage(role: "user" | "assistant", content: string): void {
    const newMessage = {
      role,
      content,
      timestamp: Date.now(),
    };

    const aiChatMessages = [...this.state.aiChatMessages, newMessage];
    this.updateState({ aiChatMessages });
  }

  clearAiChatHistory(): void {
    this.updateState({ aiChatMessages: [] });
  }

  // Getters
  getCurrentTab(): Tab | null {
    return (
      this.state.tabs.find((tab) => tab.id === this.state.activeTabId) || null
    );
  }

  getTabCount(): number {
    return this.state.tabs.length;
  }

  getTabById(tabId: string): Tab | null {
    return this.state.tabs.find((tab) => tab.id === tabId) || null;
  }

  getAllTabs(): Tab[] {
    return [...this.state.tabs];
  }

  // Browser actions
  goBack(tabId?: string): void {
    const targetTabId = tabId || this.state.activeTabId;
    if (!targetTabId) return;

    const tab = this.getTabById(targetTabId);
    if (tab?.canGoBack) {
      // WebView will handle the actual navigation
      // We just emit the action
      this.navigationSubject.next({ tabId: targetTabId, url: "back" });
    }
  }

  goForward(tabId?: string): void {
    const targetTabId = tabId || this.state.activeTabId;
    if (!targetTabId) return;

    const tab = this.getTabById(targetTabId);
    if (tab?.canGoForward) {
      // WebView will handle the actual navigation
      this.navigationSubject.next({ tabId: targetTabId, url: "forward" });
    }
  }

  reload(tabId?: string): void {
    const targetTabId = tabId || this.state.activeTabId;
    if (!targetTabId) return;

    this.navigationSubject.next({ tabId: targetTabId, url: "reload" });
  }

  // Cleanup
  destroy(): void {
    this.stateSubject.complete();
    this.tabCreatedSubject.complete();
    this.tabClosedSubject.complete();
    this.navigationSubject.complete();
  }
}

export const browserStore = new BrowserStore();


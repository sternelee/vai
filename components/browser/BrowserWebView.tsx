import { useColorScheme } from "@/hooks/useColorScheme";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { performanceService } from "../../services/PerformanceService";
import { resourceSnifferService } from "../../services/ResourceSnifferService";
import { userScriptService } from "../../services/UserScriptService";

interface BrowserWebViewProps {
  tabId: string;
  initialUrl: string;
  isActive: boolean;
  onNavigationStateChange: (tabId: string, navState: any) => void;
  onLoadStart: (tabId: string) => void;
  onLoadProgress: (tabId: string, progress: number) => void;
  onLoadEnd: (tabId: string, url: string, title: string) => void;
  onError: (tabId: string, error: any) => void;
  onMessage: (tabId: string, message: any) => void;
  onScroll?: (tabId: string, scrollY: number) => void;
  navigationCommand?: "back" | "forward" | "reload" | null;
  onNavigationCommandExecuted?: () => void;
}

export default function BrowserWebView({
  tabId,
  initialUrl,
  isActive,
  onNavigationStateChange,
  onLoadStart,
  onLoadProgress,
  onLoadEnd,
  onError,
  onMessage,
  onScroll,
  navigationCommand,
  onNavigationCommandExecuted,
}: BrowserWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const colorScheme = useColorScheme();
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [loadStartTime, setLoadStartTime] = useState<number>(0);

  const isDark = colorScheme === "dark";

  // Register WebView for performance monitoring
  useEffect(() => {
    if (webViewRef.current) {
      performanceService.registerWebView(tabId, webViewRef.current);
    }

    return () => {
      performanceService.unregisterWebView(tabId);
    };
  }, [tabId]);

  // Handle navigation commands
  useEffect(() => {
    if (navigationCommand && webViewRef.current) {
      switch (navigationCommand) {
        case "back":
          webViewRef.current.goBack();
          break;
        case "forward":
          webViewRef.current.goForward();
          break;
        case "reload":
          webViewRef.current.reload();
          break;
      }
      onNavigationCommandExecuted?.();
    }
  }, [navigationCommand, onNavigationCommandExecuted]);

  // Navigate to new URL
  const navigateToUrl = (url: string) => {
    if (webViewRef.current && url !== currentUrl) {
      setCurrentUrl(url);
      // For proper URL navigation, we need to check if it's a valid URL
      const formattedUrl = formatUrl(url);
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "navigate",
          url: formattedUrl,
        }),
      );
    }
  };

  const formatUrl = (input: string): string => {
    // Handle custom vai:// scheme
    if (input.startsWith("vai://")) {
      return input; // Keep vai:// URLs as-is for custom handling
    }

    // If it's already a complete URL, return as is
    if (input.includes("://")) {
      return input;
    }

    // Check if it looks like a domain
    if (input.includes(".") && !input.includes(" ")) {
      return `https://${input}`;
    }

    // Otherwise, treat as search query
    return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
  };

  // Handle custom URL schemes
  const handleCustomScheme = (url: string): boolean => {
    if (url.startsWith("vai://")) {
      const path = url.replace("vai://", "");

      switch (path) {
        case "home":
          return false; // Prevent default navigation

        case "settings":
          // Handle settings navigation
          onMessage(tabId, { type: "navigate_to_settings" });
          return false;

        case "bookmarks":
          // Handle bookmarks navigation
          onMessage(tabId, { type: "navigate_to_bookmarks" });
          return false;

        case "history":
          // Handle history navigation
          onMessage(tabId, { type: "navigate_to_history" });
          return false;

        case "downloads":
          // Handle downloads navigation
          onMessage(tabId, { type: "navigate_to_downloads" });
          return false;

        default:
          // Handle unknown vai:// URLs
          console.warn(`Unknown vai:// URL: ${url}`);
          return false;
      }
    }

    return true; // Allow other URLs to proceed
  };

  const handleNavigationStateChange = (navState: any) => {
    onNavigationStateChange(tabId, navState);
  };

  const handleLoadStart = () => {
    setLoadStartTime(Date.now());
    onLoadStart(tabId);
  };

  const handleLoadProgress = (event: any) => {
    onLoadProgress(tabId, event.nativeEvent.progress);
  };

  const handleLoadEnd = async (event: any) => {
    const { url, title } = event.nativeEvent;
    const loadTime = Date.now() - loadStartTime;

    // Record performance metrics
    performanceService.measureLoadTime(loadStartTime);

    onLoadEnd(tabId, url, title || "Untitled");

    // Inject user scripts
    await injectUserScripts(url);

    // Inject AI script
    injectAIScript();

    // Inject resource sniffer script
    injectResourceSnifferScript();
  };

  const handleError = (error: any) => {
    onError(tabId, error);
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      // Handle scroll events for bottom navigation bar
      if (data.type === "scroll" && onScroll) {
        onScroll(tabId, data.scrollY);
      }

      // Handle search requests from home page
      if (data.type === "search_request") {
        const query = data.query;
        const searchUrl = formatUrl(query);
        if (webViewRef.current) {
          webViewRef.current.postMessage(
            JSON.stringify({
              type: "navigate",
              url: searchUrl,
            }),
          );
        }
        return;
      }

      // Handle navigation requests from home page
      if (data.type === "navigate_request") {
        const url = data.url;
        if (handleCustomScheme(url) === false) {
          // Custom scheme was handled, don't navigate
          return;
        }
        // Navigate to regular URL
        if (webViewRef.current) {
          webViewRef.current.postMessage(
            JSON.stringify({
              type: "navigate",
              url: url,
            }),
          );
        }
        return;
      }

      // Handle HTML loading requests
      if (data.type === "load_html") {
        if (webViewRef.current) {
          // Use postMessage to load HTML content
          webViewRef.current.injectJavaScript(`
            document.open();
            document.write(\`${data.html.replace(/`/g, "\\`")}\`);
            document.close();

            // Update the URL in the address bar
            history.replaceState(null, '', '${data.baseUrl}');

            // Notify about successful load
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'home_page_loaded',
              url: '${data.baseUrl}',
              title: 'Vai Browser - Home'
            }));

            true;
          `);
        }
        return;
      }

      onMessage(tabId, data);
    } catch (error) {
      console.error("Failed to parse WebView message:", error);
    }
  };

  // Handle initial load for vai:// URLs
  useEffect(() => {
    if (initialUrl.startsWith("vai://")) {
      handleCustomScheme(initialUrl);
    }
  }, [initialUrl]);

  // Inject user scripts for current URL
  const injectUserScripts = async (url: string) => {
    try {
      const scriptsToRun = userScriptService.getScriptsForUrl(url);

      for (const script of scriptsToRun) {
        if (script.enabled) {
          // Create a wrapper that respects the run timing
          const wrappedScript = `
            (function() {
              const runScript = function() {
                try {
                  ${script.code}

                  // Notify about script execution
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'user_script_executed',
                    scriptId: '${script.id}',
                    scriptName: '${script.name}',
                    url: window.location.href
                  }));
                } catch (error) {
                  console.error('User script error:', error);
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'user_script_error',
                    scriptId: '${script.id}',
                    scriptName: '${script.name}',
                    error: error.message,
                    url: window.location.href
                  }));
                }
              };

              // Execute based on run timing
              if ('${script.runAt}' === 'document-start') {
                runScript();
              } else if ('${script.runAt}' === 'document-ready') {
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', runScript);
                } else {
                  runScript();
                }
              } else if ('${script.runAt}' === 'document-end') {
                if (document.readyState === 'complete') {
                  runScript();
                } else {
                  window.addEventListener('load', runScript);
                }
              } else if ('${script.runAt}' === 'document-idle') {
                setTimeout(runScript, 100);
              } else {
                runScript(); // Default
              }
            })();

            true; // Note: This is required for iOS
          `;

          webViewRef.current?.injectJavaScript(wrappedScript);

          // Update run count
          script.runCount++;
          if (!script.isBuiltIn) {
            await userScriptService.updateScript(script.id, {
              runCount: script.runCount,
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to inject user scripts:", error);
    }
  };

  const injectAIScript = () => {
    const script = `
      // AI Assistant Integration Script with Performance Monitoring
      (function() {
        const startTime = performance.now();

        // Performance monitoring
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'performance_metric',
                metric: 'navigation',
                duration: entry.duration,
                loadTime: entry.loadEventEnd - entry.loadEventStart
              }));
            }
          }
        });

        try {
          observer.observe({ entryTypes: ['navigation', 'resource'] });
        } catch (e) {
          // Performance observer not supported
        }

        // Memory monitoring (if available)
        if (performance.memory) {
          setInterval(() => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'memory_usage',
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            }));
          }, 10000); // Report every 10 seconds
        }

        // Create AI button
        const aiButton = document.createElement('div');
        aiButton.id = 'vai-ai-button';
        aiButton.style.cssText = \`
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 56px;
          height: 56px;
          background: #007AFF;
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
          transition: all 0.3s ease;
        \`;
        aiButton.innerHTML = '✨';
        aiButton.style.fontSize = '24px';

        aiButton.addEventListener('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ai_button_clicked',
            pageContent: document.body.innerText.substring(0, 2000),
            pageTitle: document.title,
            pageUrl: window.location.href
          }));
        });

        document.body.appendChild(aiButton);

        // Enhanced selection handling
        document.addEventListener('mouseup', function() {
          const selection = window.getSelection();
          if (selection.toString().length > 0) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'text_selected',
              selectedText: selection.toString(),
              pageUrl: window.location.href
            }));
          }
        });

        // Scroll tracking for bottom navigation bar
        let lastScrollY = 0;
        let scrollTimeout;

        function handleScroll() {
          const scrollY = window.pageYOffset || document.documentElement.scrollTop;

          // Only report significant scroll changes
          if (Math.abs(scrollY - lastScrollY) > 5) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'scroll',
              scrollY: scrollY,
              scrollDirection: scrollY > lastScrollY ? 'down' : 'up'
            }));
            lastScrollY = scrollY;
          }

          // Debounce scroll events
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'scroll_end',
              scrollY: scrollY
            }));
          }, 150);
        }

        // Add scroll listener with passive option for better performance
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Page content extraction for AI
        function extractPageContent() {
          const content = {
            title: document.title,
            url: window.location.href,
            text: document.body.innerText.substring(0, 5000),
            headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText),
            links: Array.from(document.querySelectorAll('a')).map(a => ({
              text: a.innerText,
              href: a.href
            })).slice(0, 10),
            images: Array.from(document.querySelectorAll('img')).map(img => ({
              src: img.src,
              alt: img.alt
            })).slice(0, 5)
          };

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'page_content_extracted',
            content: content
          }));
        }

        // Extract content when page is fully loaded
        if (document.readyState === 'complete') {
          extractPageContent();
        } else {
          window.addEventListener('load', extractPageContent);
        }

        // Handle navigation messages from React Native
        window.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'navigate' && data.url) {
              window.location.href = data.url;
            }
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        });

        // Report script injection time
        const endTime = performance.now();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ai_script_injected',
          injectionTime: endTime - startTime
        }));
      })();

      true; // Note: This is required for iOS
    `;

    webViewRef.current?.injectJavaScript(script);
  };

  const injectResourceSnifferScript = () => {
    const script = resourceSnifferService.generateResourceSnifferScript();
    webViewRef.current?.injectJavaScript(script);
  };

  // Public method to trigger resource extraction
  const extractResources = () => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "extract_resources",
        }),
      );
    }
  };

  // Note: extractResources method is available in component scope

  const userAgent = `Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1 VaiBrowser/1.0`;

  return (
    <View style={[styles.container, { display: isActive ? "flex" : "none" }]}>
      <WebView
        ref={webViewRef}
        source={
          initialUrl.startsWith("vai://")
            ? undefined
            : {
                uri: initialUrl.startsWith("vai://")
                  ? "about:blank"
                  : currentUrl,
              }
        }
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={handleLoadStart}
        onLoadProgress={handleLoadProgress}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onMessage={handleMessage}
        userAgent={userAgent}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={true}
        allowsBackForwardNavigationGestures={true}
        allowsFullscreenVideo={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        originWhitelist={["*"]}
        renderLoading={() => (
          <View
            style={[
              styles.loadingContainer,
              { backgroundColor: isDark ? "#000000" : "#FFFFFF" },
            ]}
          >
            {/* Loading indicator is handled by the WebView itself */}
          </View>
        )}
        renderError={(errorDomain, errorCode, errorDesc) => (
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" },
            ]}
          >
            {/* Error handling will be managed by the parent component */}
          </View>
        )}
        onShouldStartLoadWithRequest={(request) => {
          // Handle custom vai:// schemes
          if (request.url.startsWith("vai://")) {
            return handleCustomScheme(request.url);
          }

          // Allow all other requests
          return true;
        }}
        onContentProcessDidTerminate={() => {
          // Handle WebView crashes
          Alert.alert(
            "Page Crashed",
            "The web page has crashed. Would you like to reload it?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Reload", onPress: () => webViewRef.current?.reload() },
            ],
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

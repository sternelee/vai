import { ArcTheme, getThemeColors } from "@/constants/ArcTheme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NAVBAR_HEIGHT = Platform.OS === "ios" ? 84 : 64; // Include safe area for iOS

interface BottomNavigationBarProps {
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;

  // Navigation actions
  onGoBack: () => void;
  onGoForward: () => void;
  onGoHome: () => void;
  onShowTabManager: () => void;
  onShowMenu: () => void;

  // State
  canGoBack: boolean;
  canGoForward: boolean;
  tabCount: number;
  isIncognito?: boolean;
}

export default function BottomNavigationBar({
  visible,
  onVisibilityChange,
  onGoBack,
  onGoForward,
  onGoHome,
  onShowTabManager,
  onShowMenu,
  canGoBack,
  canGoForward,
  tabCount,
  isIncognito = false,
}: BottomNavigationBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const themeColors = getThemeColors(isDark);

  const translateY = useRef(
    new Animated.Value(visible ? 0 : NAVBAR_HEIGHT),
  ).current;
  const lastScrollY = useRef(0);
  const isHiding = useRef(false);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : NAVBAR_HEIGHT,
      damping: 20,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical gestures
        return (
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 10
        );
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dy } = gestureState;

        if (dy < -20 && !isHiding.current) {
          // Swipe up - hide navbar
          isHiding.current = true;
          onVisibilityChange(false);
        } else if (dy > 20 && isHiding.current) {
          // Swipe down - show navbar
          isHiding.current = false;
          onVisibilityChange(true);
        }
      },
      onPanResponderRelease: () => {
        // Reset the hiding flag after a delay
        setTimeout(() => {
          isHiding.current = false;
        }, 300);
      },
    }),
  ).current;

  const renderNavButton = (
    iconName: string,
    onPress: () => void,
    disabled = false,
    badge?: string | number,
    style?: any,
  ) => (
    <TouchableOpacity
      style={[
        styles.navButton,
        {
          backgroundColor: disabled
            ? "transparent"
            : themeColors.interactive.hover,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons
        name={iconName as any}
        size={22}
        color={isIncognito ? ArcTheme.colors.accent : themeColors.text.primary}
      />
      {badge && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isIncognito
                ? ArcTheme.colors.accent
                : ArcTheme.colors.primary,
            },
          ]}
        >
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderTabButton = () => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        {
          backgroundColor: themeColors.interactive.hover,
          borderColor: isIncognito
            ? ArcTheme.colors.accent
            : themeColors.border,
          ...(isIncognito && {
            borderColor: ArcTheme.colors.accent,
            borderWidth: 1.5,
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
        {tabCount > 99 ? "99+" : tabCount.toString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "rgba(26, 26, 26, 0.95)"
            : "rgba(248, 250, 252, 0.95)",
          borderTopColor: themeColors.border,
          transform: [{ translateY }],
          ...(isIncognito && {
            backgroundColor: isDark
              ? "rgba(26, 26, 26, 0.95)"
              : "rgba(240, 240, 240, 0.95)",
            borderTopColor: ArcTheme.colors.accent,
            borderTopWidth: 2,
          }),
          // Arc-style backdrop blur effect (approximated)
          ...ArcTheme.shadows.lg,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Drag Handle */}
      <View style={styles.dragHandle}>
        <View
          style={[
            styles.handle,
            {
              backgroundColor: themeColors.text.tertiary,
            },
          ]}
        />
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {/* Back Button */}
        {renderNavButton("chevron-back", onGoBack, !canGoBack)}

        {/* Forward Button */}
        {renderNavButton("chevron-forward", onGoForward, !canGoForward)}

        {/* Home Button */}
        {renderNavButton("home", onGoHome, false, undefined, styles.homeButton)}

        {/* Tab Manager Button */}
        {renderTabButton()}

        {/* Menu Button */}
        {renderNavButton(
          "menu",
          onShowMenu,
          false,
          undefined,
          styles.menuButton,
        )}
      </View>

      {/* iOS Safe Area */}
      {Platform.OS === "ios" && <View style={styles.safeArea} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: ArcTheme.spacing.sm,
    paddingHorizontal: ArcTheme.spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    // Backdrop blur approximation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  } as const,
  dragHandle: {
    alignItems: "center",
    paddingVertical: ArcTheme.spacing.xs,
  } as const,
  handle: {
    width: 36,
    height: 3,
    borderRadius: ArcTheme.borderRadius.full,
    opacity: 0.5,
  } as const,
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: ArcTheme.spacing.sm,
  } as const,
  navButton: {
    width: 44,
    height: 44,
    borderRadius: ArcTheme.borderRadius.base,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  } as const,
  homeButton: {
    backgroundColor: ArcTheme.colors.primary + "15",
    borderWidth: 1,
    borderColor: ArcTheme.colors.primary + "30",
  } as const,
  menuButton: {
    backgroundColor: ArcTheme.colors.accent + "15",
    borderWidth: 1,
    borderColor: ArcTheme.colors.accent + "30",
  } as const,
  tabButton: {
    width: 44,
    height: 44,
    borderRadius: ArcTheme.borderRadius.base,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  } as const,
  tabCount: {
    fontSize: ArcTheme.typography.fontSize.sm,
    fontWeight: "600" as const,
    textAlign: "center",
  } as const,
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  } as const,
  badgeText: {
    color: "#FFFFFF",
    fontSize: ArcTheme.typography.fontSize.xs,
    fontWeight: "600" as const,
  } as const,
  safeArea: {
    height: Platform.OS === "ios" ? 20 : 0, // iPhone home indicator space
  } as const,
});


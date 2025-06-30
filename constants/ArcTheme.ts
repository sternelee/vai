// Arc Browser inspired theme system
export const ArcTheme = {
  // Core Colors (inspired by Arc)
  colors: {
    // Primary brand colors
    primary: '#6366F1',        // Indigo
    primaryLight: '#8B5CF6',   // Purple
    primaryDark: '#4F46E5',    // Darker indigo

    // Accent colors
    accent: '#EC4899',         // Pink
    accentLight: '#F472B6',    // Light pink
    success: '#10B981',        // Emerald
    warning: '#F59E0B',        // Amber
    error: '#EF4444',          // Red

    // Neutral colors - Light theme
    light: {
      background: '#FFFFFF',
      surface: '#F8FAFC',
      card: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.02)',
      border: '#E2E8F0',
      divider: '#F1F5F9',

      // Text colors
      text: {
        primary: '#0F172A',
        secondary: '#475569',
        tertiary: '#94A3B8',
        disabled: '#CBD5E1',
      },

      // Interactive states
      interactive: {
        hover: '#F1F5F9',
        active: '#E2E8F0',
        focus: '#E0E7FF',
      },
    },

    // Neutral colors - Dark theme
    dark: {
      background: '#0F0F0F',      // Very dark, like Arc
      surface: '#1A1A1A',
      card: '#262626',
      overlay: 'rgba(255, 255, 255, 0.05)',
      border: '#404040',
      divider: '#2A2A2A',

      // Text colors
      text: {
        primary: '#FAFAFA',
        secondary: '#D4D4D8',
        tertiary: '#A1A1AA',
        disabled: '#71717A',
      },

      // Interactive states
      interactive: {
        hover: '#2A2A2A',
        active: '#404040',
        focus: '#312E81',
      },
    },
  },

  // Typography (Arc-inspired)
  typography: {
    fontFamily: {
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'SF Mono, Monaco, "Cascadia Code", monospace',
    },

    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
    },

    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Spacing system
  spacing: {
    xs: 4,
    sm: 8,
    base: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  // Border radius (Arc loves rounded corners)
  borderRadius: {
    sm: 6,
    base: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
  },

  // Shadows (subtle and elegant like Arc)
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    base: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.2,
      shadowRadius: 40,
      elevation: 12,
    },
  },

  // Gradients (Arc-style gradients)
  gradients: {
    primary: ['#6366F1', '#8B5CF6'],
    accent: ['#EC4899', '#F472B6'],
    surface: {
      light: ['#FFFFFF', '#F8FAFC'],
      dark: ['#1A1A1A', '#0F0F0F'],
    },
    overlay: {
      light: 'rgba(0, 0, 0, 0.5)',
      dark: 'rgba(0, 0, 0, 0.8)',
    },
  },

  // Animation timings
  animation: {
    fast: 150,
    normal: 250,
    slow: 350,

    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },

  // Layout constants
  layout: {
    headerHeight: 64,
    tabBarHeight: 48,
    bottomSheetHandle: 4,
    maxContentWidth: 1200,
  },
};

// Helper functions for theme usage
export const getThemeColors = (isDark: boolean) => {
  return isDark ? ArcTheme.colors.dark : ArcTheme.colors.light;
};

export const createArcStyle = (isDark: boolean) => ({
  // Common Arc-style components
  card: {
    backgroundColor: getThemeColors(isDark).card,
    borderRadius: ArcTheme.borderRadius.lg,
    ...ArcTheme.shadows.base,
    borderWidth: 1,
    borderColor: getThemeColors(isDark).border,
  },

  button: {
    borderRadius: ArcTheme.borderRadius.base,
    paddingHorizontal: ArcTheme.spacing.lg,
    paddingVertical: ArcTheme.spacing.sm,
    ...ArcTheme.shadows.sm,
  },

  input: {
    borderRadius: ArcTheme.borderRadius.base,
    paddingHorizontal: ArcTheme.spacing.base,
    paddingVertical: ArcTheme.spacing.sm,
    borderWidth: 1,
    borderColor: getThemeColors(isDark).border,
    backgroundColor: getThemeColors(isDark).surface,
  },

  text: {
    primary: {
      color: getThemeColors(isDark).text.primary,
      fontSize: ArcTheme.typography.fontSize.base,
      fontWeight: ArcTheme.typography.fontWeight.normal,
    },
    secondary: {
      color: getThemeColors(isDark).text.secondary,
      fontSize: ArcTheme.typography.fontSize.sm,
      fontWeight: ArcTheme.typography.fontWeight.normal,
    },
  },
});

export default ArcTheme;
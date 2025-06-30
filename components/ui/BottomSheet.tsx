import { ArcTheme, getThemeColors } from '@/constants/ArcTheme';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    Platform,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;
  enableBackdropClose?: boolean;
  enableSwipeDown?: boolean;
  snapPoints?: number[];
  initialSnapIndex?: number;
  backdropOpacity?: number;
  showHandle?: boolean;
}

export default function BottomSheet({
  isVisible,
  onClose,
  children,
  height = SCREEN_HEIGHT * 0.6,
  enableBackdropClose = true,
  enableSwipeDown = true,
  snapPoints = [0],
  initialSnapIndex = 0,
  backdropOpacity = 0.4,
  showHandle = true,
}: BottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);

  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnapIndex);

  useEffect(() => {
    if (isVisible) {
      // Arc-style entrance animation with slight scale effect
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: snapPoints[currentSnapIndex],
          damping: 20,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacityAnim, {
          toValue: backdropOpacity,
          duration: ArcTheme.animation.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Arc-style exit animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: height,
          duration: ArcTheme.animation.normal,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacityAnim, {
          toValue: 0,
          duration: ArcTheme.animation.normal,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: ArcTheme.animation.normal,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, currentSnapIndex]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return enableSwipeDown && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        translateY.setOffset(snapPoints[currentSnapIndex]);
        translateY.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!enableSwipeDown) return;

        // Only allow downward movement with elastic effect
        const dy = Math.max(0, gestureState.dy);
        const elasticDy = dy > 50 ? 50 + (dy - 50) * 0.3 : dy;
        translateY.setValue(elasticDy);

        // Update backdrop opacity and scale based on position
        const progress = Math.max(0, Math.min(1, elasticDy / (height - snapPoints[currentSnapIndex])));
        backdropOpacityAnim.setValue(backdropOpacity * (1 - progress * 0.6));
        scaleAnim.setValue(1 - progress * 0.05);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!enableSwipeDown) return;

        translateY.flattenOffset();

        const { dy, vy } = gestureState;
        const shouldClose = dy > height * 0.25 || vy > 800;

        if (shouldClose) {
          onClose();
        } else {
          // Snap back with Arc-style spring animation
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: snapPoints[currentSnapIndex],
              damping: 20,
              stiffness: 300,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacityAnim, {
              toValue: backdropOpacity,
              duration: ArcTheme.animation.fast,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              damping: 18,
              stiffness: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const handleBackdropPress = () => {
    if (enableBackdropClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Arc-style backdrop with gradient */}
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                backgroundColor: isDark
                  ? ArcTheme.gradients.overlay.dark
                  : ArcTheme.gradients.overlay.light,
                opacity: backdropOpacityAnim,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Arc-style bottom sheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: themeColors.card,
              height: height,
              borderTopColor: themeColors.border,
              transform: [
                { translateY },
                { scale: scaleAnim },
              ],
              // Arc-style shadow
              ...ArcTheme.shadows.xl,
              // Add subtle border for Arc effect
              borderTopWidth: Platform.OS === 'ios' ? 0.5 : 1,
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Arc-style handle */}
          {showHandle && (
            <View style={styles.handleContainer}>
              <View
                style={[
                  styles.handle,
                  {
                    backgroundColor: themeColors.text.tertiary,
                  },
                ]}
              />
            </View>
          )}

          {/* Content with Arc-style padding */}
          <View
            style={[
              styles.content,
              {
                paddingTop: showHandle ? ArcTheme.spacing.sm : ArcTheme.spacing.lg,
              }
            ]}
          >
            {children}
          </View>

          {/* Arc-style bottom safe area */}
          <View style={styles.bottomSafeArea} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    borderTopLeftRadius: ArcTheme.borderRadius.xl,
    borderTopRightRadius: ArcTheme.borderRadius.xl,
    minHeight: 100,
    // Arc-style backdrop filter effect (approximated)
    ...(Platform.OS === 'ios' && {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    }),
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: ArcTheme.spacing.sm,
    paddingBottom: ArcTheme.spacing.xs,
  },
  handle: {
    width: 36,
    height: ArcTheme.layout.bottomSheetHandle,
    borderRadius: ArcTheme.borderRadius.full,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    paddingHorizontal: ArcTheme.spacing.lg,
  },
  bottomSafeArea: {
    height: Platform.OS === 'ios' ? 34 : ArcTheme.spacing.base, // iPhone home indicator space
    backgroundColor: 'transparent',
  },
});
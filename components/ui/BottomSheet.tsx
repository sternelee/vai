import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    PanResponder,
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
  backdropOpacity = 0.5,
}: BottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacityAnim = useRef(new Animated.Value(0)).current;
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnapIndex);

  useEffect(() => {
    if (isVisible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: snapPoints[currentSnapIndex],
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacityAnim, {
          toValue: backdropOpacity,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacityAnim, {
          toValue: 0,
          duration: 250,
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

        // Only allow downward movement
        const dy = Math.max(0, gestureState.dy);
        translateY.setValue(dy);

        // Update backdrop opacity based on position
        const progress = Math.max(0, Math.min(1, dy / (height - snapPoints[currentSnapIndex])));
        backdropOpacityAnim.setValue(backdropOpacity * (1 - progress * 0.5));
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!enableSwipeDown) return;

        translateY.flattenOffset();

        const { dy, vy } = gestureState;
        const shouldClose = dy > height * 0.3 || vy > 1000;

        if (shouldClose) {
          onClose();
        } else {
          // Snap back to original position
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: snapPoints[currentSnapIndex],
              damping: 20,
              stiffness: 300,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacityAnim, {
              toValue: backdropOpacity,
              duration: 200,
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
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacityAnim,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              height: height,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Handle Bar */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handle,
                {
                  backgroundColor: isDark ? '#48484A' : '#D1D1D6',
                },
              ]}
            />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

interface MicButtonProps {
  onPressIn: () => void;
  onPressOut: () => void;
  isRecording: boolean;
  isProcessing: boolean;
  disabled?: boolean;
  size?: number;
}

export function MicButton({
  onPressIn,
  onPressOut,
  isRecording,
  isProcessing,
  disabled = false,
  size = 80,
}: MicButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 700, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 700 }),
          withTiming(0, { duration: 700 })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording]);

  const longPress = Gesture.LongPress()
    .minDuration(0)
    .runOnJS(true)
    .onBegin(() => {
      if (disabled || isProcessing) return;
      scale.value = withSpring(0.9, { damping: 12 });
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onPressIn();
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 12 });
      onPressOut();
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 12 });
    });

  const animatedButton = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const bgColor = isRecording
    ? "#EF4444"
    : disabled || isProcessing
    ? colors.muted
    : colors.primary;

  const iconColor = isRecording
    ? "#FFFFFF"
    : disabled || isProcessing
    ? colors.mutedForeground
    : colors.primaryForeground;

  return (
    <GestureDetector gesture={longPress}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size / 2,
              backgroundColor: isRecording ? "#EF4444" : colors.primary,
            },
            animatedPulse,
          ]}
        />
        <Animated.View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bgColor,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: isRecording ? "#EF4444" : colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            },
            animatedButton,
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <Ionicons
              name={isRecording ? "stop" : "mic"}
              size={size * 0.38}
              color={iconColor}
            />
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

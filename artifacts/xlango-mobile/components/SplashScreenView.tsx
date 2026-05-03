import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

const logoMark = require("@/assets/images/xlango-mark.png");
const wordmark = require("@/assets/images/xlango-wordmark.png");
const zapurzaaLogo = require("@/assets/images/zapurzaa-logo.png");

interface Props {
  onFinish: () => void;
}

export function SplashScreenView({ onFinish }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      const timer = setTimeout(() => {
        Animated.timing(exitAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => onFinish());
      }, 1800);
      return () => clearTimeout(timer);
    });
  }, [fadeAnim, exitAnim, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: exitAnim }]}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {/* XLango logo cluster */}
        <View style={styles.logoCluster}>
          <Image source={logoMark} style={styles.mark} />
          <Image source={wordmark} style={styles.wordmark} />
          <Animated.Text style={styles.tagline}>
            Live Global Voice Interpreter
          </Animated.Text>
        </View>

        {/* Created by + Zapurzaa */}
        <View style={styles.createdBy}>
          <Animated.Text style={styles.createdByLabel}>
            Created by
          </Animated.Text>
          <Image source={zapurzaaLogo} style={styles.zapurzaa} resizeMode="contain" />
        </View>
      </Animated.View>

      {/* Amber loading dots */}
      <View style={styles.dots}>
        {[1, 0.55, 0.25].map((opacity, i) => (
          <View key={i} style={[styles.dot, { opacity }]} />
        ))}
      </View>
    </Animated.View>
  );
}

const BG = "#F2EBD9";
const AMBER = "#F59E0B";
const MUTED = "#6B7F96";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 80,
    paddingBottom: 60,
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  logoCluster: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: -52,
  },
  wordmark: {
    width: 340,
    height: 102,
    resizeMode: "contain",
    marginBottom: -36,
  },
  tagline: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: MUTED,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  createdBy: {
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
  },
  createdByLabel: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: MUTED,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  zapurzaa: {
    width: 200,
    height: 50,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AMBER,
  },
});

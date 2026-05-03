import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const IMG_MARK = require("../../assets/images/xlango-mark.png");
const IMG_WORDMARK = require("../../assets/images/xlango-wordmark.png");
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LanguagePicker } from "@/components/LanguagePicker";
import { useApp, SpeakerGender } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type GenderOption = { value: SpeakerGender; label: string };
const GENDERS: GenderOption[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unspecified", label: "—" },
];

function GenderToggle({
  value,
  onChange,
  accent,
}: {
  value: SpeakerGender;
  onChange: (v: SpeakerGender) => void;
  accent: "primary" | "secondary";
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {GENDERS.map((g) => {
        const active = value === g.value;
        const activeBg = accent === "primary" ? colors.primary : colors.secondary;
        return (
          <TouchableOpacity
            key={g.value}
            onPress={() => onChange(g.value)}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 34,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? activeBg : colors.muted,
              borderWidth: active ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "PlusJakartaSans_600SemiBold",
                color: active
                  ? accent === "primary"
                    ? colors.primaryForeground
                    : colors.secondaryForeground
                  : colors.mutedForeground,
              }}
            >
              {g.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SpeakerCard({
  number,
  name,
  lang,
  gender,
  onNameChange,
  onLangChange,
  onGenderChange,
  accent,
}: {
  number: 1 | 2;
  name: string;
  lang: string;
  gender: SpeakerGender;
  onNameChange: (v: string) => void;
  onLangChange: (v: string) => void;
  onGenderChange: (v: SpeakerGender) => void;
  accent: "primary" | "secondary";
}) {
  const colors = useColors();
  const badgeBg = accent === "primary" ? colors.amberLight : colors.muted;
  const badgeColor = accent === "primary" ? colors.amberDark : colors.foreground;

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      padding: 16,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    badge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: badgeBg,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      fontSize: 13,
      fontFamily: "PlusJakartaSans_700Bold",
      color: badgeColor,
    },
    headerTitle: {
      fontSize: 15,
      fontFamily: "PlusJakartaSans_700Bold",
      color: colors.foreground,
    },
    label: {
      fontSize: 11,
      fontFamily: "PlusJakartaSans_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    input: {
      height: 42,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      fontSize: 15,
      fontFamily: "PlusJakartaSans_400Regular",
      color: colors.foreground,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    langBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{number}</Text>
        </View>
        <Text style={styles.headerTitle}>
          {number === 1 ? "First Speaker" : "Second Speaker"}
        </Text>
      </View>

      <View>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onNameChange}
          placeholder={`Speaker ${number}`}
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          testID={`input-s${number}-name`}
        />
      </View>

      <View>
        <View style={styles.langBox}>
          <Text style={styles.label}>Language</Text>
          <LanguagePicker value={lang} onChange={onLangChange} />
        </View>
      </View>

      <View>
        <Text style={styles.label}>Gender (for grammar)</Text>
        <GenderToggle
          value={gender}
          onChange={onGenderChange}
          accent={accent}
        />
      </View>
    </View>
  );
}

export default function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { speaker1, speaker2, sessionTitle, setSpeaker1, setSpeaker2, setSessionTitle } =
    useApp();
  const [localTitle, setLocalTitle] = useState(sessionTitle);

  const handleStart = () => {
    setSessionTitle(localTitle);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/session");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    gradient: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 260,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: topPad + 12,
      paddingBottom: botPad + 24,
      paddingHorizontal: 20,
      gap: 16,
    },
    hero: {
      alignItems: "center",
      paddingVertical: 0,
      gap: 0,
    },
    logoMark: {
      width: 110,
      height: 110,
      resizeMode: "contain",
      marginBottom: -52,
    },
    wordmark: {
      width: 480,
      height: 144,
      resizeMode: "contain",
      marginBottom: -44,
    },
    appTagline: {
      fontSize: 12,
      fontFamily: "PlusJakartaSans_500Medium",
      color: colors.mutedForeground,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    sessionCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    sessionLabel: {
      fontSize: 11,
      fontFamily: "PlusJakartaSans_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    sessionInput: {
      height: 42,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      fontSize: 15,
      fontFamily: "PlusJakartaSans_400Regular",
      color: colors.foreground,
    },
    startBtn: {
      height: 54,
      borderRadius: colors.radius + 4,
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
    startBtnText: {
      fontSize: 17,
      fontFamily: "PlusJakartaSans_700Bold",
      color: colors.primaryForeground,
    },
    historyBtn: {
      height: 44,
      borderRadius: colors.radius,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    historyBtnText: {
      fontSize: 14,
      fontFamily: "PlusJakartaSans_500Medium",
      color: colors.mutedForeground,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={[`${colors.primary}18`, colors.background]}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image source={IMG_MARK} style={styles.logoMark} />
          <Image source={IMG_WORDMARK} style={styles.wordmark} />
          <Text style={styles.appTagline}>Live Global Voice Interpreter</Text>
        </View>

        <View style={styles.sessionCard}>
          <Text style={styles.sessionLabel}>Session Name (optional)</Text>
          <TextInput
            style={styles.sessionInput}
            value={localTitle}
            onChangeText={setLocalTitle}
            placeholder="e.g. Doctor visit, Business meeting"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            testID="input-session-title"
          />
        </View>

        <SpeakerCard
          number={1}
          name={speaker1.name}
          lang={speaker1.lang}
          gender={speaker1.gender}
          onNameChange={(v) => setSpeaker1({ name: v })}
          onLangChange={(v) => setSpeaker1({ lang: v })}
          onGenderChange={(v) => setSpeaker1({ gender: v })}
          accent="primary"
        />

        <SpeakerCard
          number={2}
          name={speaker2.name}
          lang={speaker2.lang}
          gender={speaker2.gender}
          onNameChange={(v) => setSpeaker2({ name: v })}
          onLangChange={(v) => setSpeaker2({ lang: v })}
          onGenderChange={(v) => setSpeaker2({ gender: v })}
          accent="secondary"
        />

        <TouchableOpacity
          style={styles.startBtn}
          onPress={handleStart}
          activeOpacity={0.85}
          testID="button-start-session"
        >
          <Text style={styles.startBtnText}>Start Session</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>

        <Pressable
          style={styles.historyBtn}
          onPress={() => router.push("/(tabs)/history")}
          testID="link-history"
        >
          <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.historyBtnText}>View History</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

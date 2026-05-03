import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MicButton } from "@/components/MicButton";
import { getLangLabel } from "@/components/LanguagePicker";
import { useApp, Turn } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};

function apiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return `https://${domain}/api${path}`;
}

function makeId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

type StatusPhase = "idle" | "recording" | "transcribing" | "translating" | "speaking" | "error";

export default function SessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { speaker1, speaker2, sessionTitle, saveSession } = useApp();

  const sessionId = useRef(makeId());
  const sessionStart = useRef(Date.now());
  const recordingRef = useRef<Audio.Recording | null>(null);
  const activeSpeakerRef = useRef<0 | 1 | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [recordingSpeaker, setRecordingSpeaker] = useState<0 | 1 | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phase, setPhase] = useState<StatusPhase>("idle");
  const [permissionGranted, setPermissionGranted] = useState(false);

  const statusOpacity = useSharedValue(0);
  const statusAnimStyle = useAnimatedStyle(() => ({ opacity: statusOpacity.value }));

  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") {
        setPermissionGranted(true);
        return;
      }
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === "granted");
      if (status !== "granted") {
        Alert.alert(
          "Microphone Required",
          "XLango needs microphone access to interpret speech. Please enable it in Settings.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    })();

    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (phase !== "idle") {
      statusOpacity.value = withTiming(1, { duration: 200 });
    } else {
      statusOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [phase]);

  const handleMicPressIn = useCallback(
    async (speakerIdx: 0 | 1) => {
      if (isProcessing || !permissionGranted || Platform.OS === "web") return;
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
        recordingRef.current = recording;
        activeSpeakerRef.current = speakerIdx;
        setRecordingSpeaker(speakerIdx);
        setPhase("recording");
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch {
        setPhase("idle");
      }
    },
    [isProcessing, permissionGranted]
  );

  const handleMicPressOut = useCallback(async () => {
    if (!recordingRef.current || activeSpeakerRef.current === null) return;

    const speakerIdx = activeSpeakerRef.current;
    const speakers = [speaker1, speaker2];
    const thisSpeaker = speakers[speakerIdx];
    const otherSpeaker = speakers[1 - speakerIdx];
    const fromLang = thisSpeaker.lang === "auto" ? undefined : thisSpeaker.lang;
    const toLang = otherSpeaker.lang === "auto" ? "en" : otherSpeaker.lang;

    setRecordingSpeaker(null);
    setIsProcessing(true);

    try {
      const recording = recordingRef.current;
      recordingRef.current = null;
      activeSpeakerRef.current = null;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error("No recording URI");

      setPhase("transcribing");
      const audioBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const transcribeBody: Record<string, string> = {
        audioBase64,
        mimeType: "audio/m4a",
      };
      if (fromLang) transcribeBody.language = fromLang;

      const transcribeRes = await fetch(apiUrl("/umi/transcribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transcribeBody),
      });
      if (!transcribeRes.ok) throw new Error("Transcription failed");
      const { text } = (await transcribeRes.json()) as { text: string };

      if (!text?.trim()) {
        setPhase("idle");
        setIsProcessing(false);
        return;
      }

      setPhase("translating");
      const translateRes = await fetch(apiUrl("/umi/translate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          fromLang: fromLang ?? "en",
          toLang,
        }),
      });
      if (!translateRes.ok) throw new Error("Translation failed");
      const { translatedText } = (await translateRes.json()) as {
        translatedText: string;
      };

      setPhase("speaking");
      const speakRes = await fetch(apiUrl("/umi/speak"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: translatedText, lang: toLang }),
      });
      if (!speakRes.ok) throw new Error("TTS failed");
      const { audioBase64: ttsBase64, mimeType: ttsMime } = (await speakRes.json()) as {
        audioBase64: string;
        mimeType: string;
      };

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      soundRef.current?.unloadAsync().catch(() => {});
      const { sound } = await Audio.Sound.createAsync({
        uri: `data:${ttsMime};base64,${ttsBase64}`,
      });
      soundRef.current = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const newTurn: Turn = {
        id: makeId(),
        speakerIdx,
        original: text,
        translated: translatedText,
        timestamp: Date.now(),
      };
      setTurns((prev) => [...prev, newTurn]);
      setPhase("idle");
    } catch (err) {
      console.error("Session error:", err);
      setPhase("error");
      setTimeout(() => setPhase("idle"), 2000);
    } finally {
      recordingRef.current = null;
      activeSpeakerRef.current = null;
      setIsProcessing(false);
    }
  }, [speaker1, speaker2]);

  const handleEnd = useCallback(() => {
    const session = {
      id: sessionId.current,
      title: sessionTitle || undefined,
      speaker1,
      speaker2,
      turns,
      startedAt: sessionStart.current,
      endedAt: Date.now(),
    };
    saveSession(session);
    router.back();
  }, [speaker1, speaker2, turns, sessionTitle, saveSession]);

  const s1Turns = turns.filter((t) => t.speakerIdx === 0);
  const s2Turns = turns.filter((t) => t.speakerIdx === 1);
  const s1Last = s1Turns[s1Turns.length - 1];
  const s2Last = s2Turns[s2Turns.length - 1];

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const PHASE_LABELS: Record<StatusPhase, string> = {
    idle: "",
    recording: "Listening…",
    transcribing: "Transcribing…",
    translating: "Translating…",
    speaking: "Speaking…",
    error: "Try again",
  };

  const PHASE_COLORS: Record<StatusPhase, string> = {
    idle: colors.mutedForeground,
    recording: "#EF4444",
    transcribing: colors.primary,
    translating: colors.primary,
    speaking: "#22C55E",
    error: "#EF4444",
  };

  const isS1Recording = recordingSpeaker === 0;
  const isS2Recording = recordingSpeaker === 1;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy },
    topHalf: {
      flex: 1,
      transform: [{ rotate: "180deg" }],
      padding: 20,
      paddingTop: topPad + 8,
      justifyContent: "space-between",
    },
    bottomHalf: {
      flex: 1,
      padding: 20,
      paddingBottom: botPad + 8,
      justifyContent: "space-between",
    },
    divider: {
      height: 1,
      backgroundColor: `${colors.primary}40`,
      marginHorizontal: 0,
      position: "relative",
    },
    statusBar: {
      position: "absolute",
      left: 0,
      right: 0,
      top: -14,
      alignItems: "center",
    },
    statusPill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.navy,
      borderWidth: 1,
      borderColor: `${colors.primary}60`,
    },
    statusText: {
      fontSize: 11,
      fontFamily: "PlusJakartaSans_600SemiBold",
    },
    speakerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    speakerChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: `${colors.primary}20`,
    },
    speakerName: {
      fontSize: 13,
      fontFamily: "PlusJakartaSans_700Bold",
      color: colors.primary,
    },
    langLabel: {
      fontSize: 11,
      fontFamily: "PlusJakartaSans_500Medium",
      color: `${colors.primary}90`,
    },
    endBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: `${colors.destructive}30`,
      alignItems: "center",
      justifyContent: "center",
    },
    transcriptArea: {
      flex: 1,
      justifyContent: "center",
      paddingVertical: 12,
      gap: 8,
    },
    originalText: {
      fontSize: 13,
      fontFamily: "PlusJakartaSans_400Regular",
      color: `${colors.foreground}60`,
      lineHeight: 18,
    },
    translatedText: {
      fontSize: 22,
      fontFamily: "PlusJakartaSans_700Bold",
      color: colors.foreground,
      lineHeight: 30,
    },
    emptyHint: {
      fontSize: 13,
      fontFamily: "PlusJakartaSans_400Regular",
      color: `${colors.foreground}40`,
      textAlign: "center",
    },
    micRow: {
      alignItems: "center",
    },
    micHint: {
      marginTop: 8,
      fontSize: 11,
      fontFamily: "PlusJakartaSans_500Medium",
      color: `${colors.foreground}50`,
      textAlign: "center",
    },
    webOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: `${colors.navy}CC`,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    webOverlayText: {
      fontSize: 16,
      fontFamily: "PlusJakartaSans_600SemiBold",
      color: colors.foreground,
      textAlign: "center",
      lineHeight: 24,
    },
  });

  const SpeakerHalf = ({
    speakerIdx,
    inverted,
  }: {
    speakerIdx: 0 | 1;
    inverted: boolean;
  }) => {
    const sp = speakerIdx === 0 ? speaker1 : speaker2;
    const otherSp = speakerIdx === 0 ? speaker2 : speaker1;
    const myLast = speakerIdx === 0 ? s1Last : s2Last;
    const theirLast = speakerIdx === 0 ? s2Last : s1Last;
    const isRec = speakerIdx === 0 ? isS1Recording : isS2Recording;
    const halfStyle = inverted ? styles.topHalf : styles.bottomHalf;

    return (
      <View style={halfStyle}>
        <View style={styles.speakerRow}>
          <View style={styles.speakerChip}>
            <Ionicons name="person" size={12} color={colors.primary} />
            <Text style={styles.speakerName}>{sp.name}</Text>
            <Text style={styles.langLabel}>{getLangLabel(sp.lang)}</Text>
          </View>
          {!inverted && (
            <TouchableOpacity style={styles.endBtn} onPress={handleEnd} testID="button-end-session">
              <Ionicons name="close" size={16} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.transcriptArea}>
          {theirLast ? (
            <>
              <Text style={styles.translatedText} numberOfLines={4}>
                {theirLast.translated}
              </Text>
              {myLast && (
                <Text style={styles.originalText} numberOfLines={2}>
                  {myLast.original}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.emptyHint}>
              {inverted
                ? `Hold the mic to speak in ${getLangLabel(sp.lang)}`
                : `Hold the mic to speak in ${getLangLabel(sp.lang)}`}
            </Text>
          )}
        </View>

        <View style={styles.micRow}>
          <MicButton
            onPressIn={() => handleMicPressIn(speakerIdx)}
            onPressOut={handleMicPressOut}
            isRecording={isRec}
            isProcessing={isProcessing && !isRec}
            disabled={isProcessing}
          />
          <Text style={styles.micHint}>
            {isRec ? "Release to translate" : "Hold to speak"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SpeakerHalf speakerIdx={1} inverted />

      <View style={styles.divider}>
        <Animated.View style={[styles.statusBar, statusAnimStyle]}>
          <View style={styles.statusPill}>
            <Text
              style={[
                styles.statusText,
                { color: PHASE_COLORS[phase] },
              ]}
            >
              {PHASE_LABELS[phase]}
            </Text>
          </View>
        </Animated.View>
      </View>

      <SpeakerHalf speakerIdx={0} inverted={false} />

      {Platform.OS === "web" && (
        <View style={styles.webOverlay} pointerEvents="none">
          <Ionicons name="phone-portrait-outline" size={40} color={colors.primary} />
          <Text style={[styles.webOverlayText, { marginTop: 12 }]}>
            Open XLango in Expo Go on your phone to use the microphone
          </Text>
        </View>
      )}
    </View>
  );
}

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
  web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
};

function apiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return `https://${domain}/api${path}`;
}

function makeId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

type StatusPhase =
  | "idle"
  | "recording"
  | "transcribing"
  | "translating"
  | "speaking"
  | "error";

export default function SessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { speaker1, speaker2, sessionTitle, saveSession, layoutMode, setLayoutMode } = useApp();

  const sessionId = useRef(makeId());
  const sessionStart = useRef(Date.now());

  // Native recording
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Web recording
  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webChunksRef = useRef<BlobPart[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);

  const activeSpeakerRef = useRef<0 | 1 | null>(null);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [recordingSpeaker, setRecordingSpeaker] = useState<0 | 1 | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phase, setPhase] = useState<StatusPhase>("idle");
  const [permissionGranted, setPermissionGranted] = useState(
    Platform.OS === "web"
  );

  const statusOpacity = useSharedValue(0);
  const statusAnimStyle = useAnimatedStyle(() => ({
    opacity: statusOpacity.value,
  }));

  useEffect(() => {
    if (Platform.OS === "web") return;
    Audio.requestPermissionsAsync().then(({ status }) => {
      setPermissionGranted(status === "granted");
      if (status !== "granted") {
        Alert.alert(
          "Microphone Required",
          "XLango needs microphone access. Please enable it in Settings.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    });
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    statusOpacity.value = withTiming(phase !== "idle" ? 1 : 0, {
      duration: phase !== "idle" ? 200 : 300,
    });
  }, [phase]);

  // ─── Start recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(
    async (speakerIdx: 0 | 1) => {
      try {
        if (Platform.OS === "web") {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          webStreamRef.current = stream;
          webChunksRef.current = [];
          const mr = new MediaRecorder(stream);
          mr.ondataavailable = (e) => {
            if (e.data.size > 0) webChunksRef.current.push(e.data);
          };
          mr.start();
          webRecorderRef.current = mr;
        } else {
          if (!permissionGranted) return;

          // Unload any playing sound so the audio session is free
          if (soundRef.current) {
            await soundRef.current.unloadAsync().catch(() => {});
            soundRef.current = null;
          }

          // Switch audio session to recording mode
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });

          // Give iOS a moment to reconfigure the audio session
          await new Promise<void>((r) => setTimeout(r, 80));

          // Step-by-step recording init (more reliable than createAsync)
          const recording = new Audio.Recording();
          await recording.prepareToRecordAsync(RECORDING_OPTIONS);
          await recording.startAsync();
          recordingRef.current = recording;

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        activeSpeakerRef.current = speakerIdx;
        setRecordingSpeaker(speakerIdx);
        setPhase("recording");
      } catch (err) {
        console.error("Start recording error:", err);
        setPhase("error");
        setTimeout(() => setPhase("idle"), 2000);
      }
    },
    [permissionGranted]
  );

  // ─── Stop recording + run pipeline ────────────────────────────────────────
  const stopAndProcess = useCallback(async () => {
    const speakerIdx = activeSpeakerRef.current;
    const hasWebRecorder = Platform.OS === "web" && !!webRecorderRef.current;
    const hasNativeRecording =
      Platform.OS !== "web" && !!recordingRef.current;
    if (speakerIdx === null || (!hasWebRecorder && !hasNativeRecording)) return;

    const speakers: [typeof speaker1, typeof speaker2] = [speaker1, speaker2];
    const thisSpeaker = speakers[speakerIdx];
    const otherSpeaker = speakers[1 - speakerIdx];
    const fromLang =
      thisSpeaker.lang === "auto" ? undefined : thisSpeaker.lang;
    const toLang = otherSpeaker.lang === "auto" ? "en" : otherSpeaker.lang;

    setRecordingSpeaker(null);
    setIsProcessing(true);
    activeSpeakerRef.current = null;

    try {
      // 1. Gather audio as base64
      let audioBase64: string;
      let mimeType: string;

      if (Platform.OS === "web") {
        const mr = webRecorderRef.current!;
        webRecorderRef.current = null;
        await new Promise<void>((resolve) => {
          mr.onstop = () => resolve();
          mr.stop();
        });
        webStreamRef.current?.getTracks().forEach((t) => t.stop());
        webStreamRef.current = null;
        const blob = new Blob(webChunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        audioBase64 = await blobToBase64(blob);
        mimeType = "audio/webm";
      } else {
        const recording = recordingRef.current!;
        recordingRef.current = null;
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (!uri) throw new Error("No recording URI");
        audioBase64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        mimeType = "audio/m4a";
      }

      // 2. Transcribe
      setPhase("transcribing");
      const transcribeBody: Record<string, string> = { audioBase64, mimeType };
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

      // 3. Translate
      setPhase("translating");
      const translateRes = await fetch(apiUrl("/umi/translate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fromLang: fromLang ?? "en", toLang }),
      });
      if (!translateRes.ok) throw new Error("Translation failed");
      const { translatedText } = (await translateRes.json()) as {
        translatedText: string;
      };

      // 4. Speak
      setPhase("speaking");
      const speakRes = await fetch(apiUrl("/umi/speak"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: translatedText, lang: toLang }),
      });
      if (!speakRes.ok) throw new Error("TTS failed");
      const { audioBase64: ttsBase64, mimeType: ttsMime } =
        (await speakRes.json()) as { audioBase64: string; mimeType: string };

      if (Platform.OS === "web") {
        const audio = new window.Audio(
          `data:${ttsMime};base64,${ttsBase64}`
        );
        await audio.play();
      } else {
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
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.isLoaded && s.didJustFinish)
            sound.unloadAsync().catch(() => {});
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // 5. Update transcript
      setTurns((prev) => [
        ...prev,
        {
          id: makeId(),
          speakerIdx,
          original: text,
          translated: translatedText,
          timestamp: Date.now(),
        },
      ]);
      setPhase("idle");
    } catch (err) {
      console.error("Session pipeline error:", err);
      setPhase("error");
      setTimeout(() => setPhase("idle"), 2500);
    } finally {
      activeSpeakerRef.current = null;
      recordingRef.current = null;
      webRecorderRef.current = null;
      setIsProcessing(false);
    }
  }, [speaker1, speaker2]);

  // ─── Toggle handler passed to each MicButton ──────────────────────────────
  const handleMicToggle = useCallback(
    (speakerIdx: 0 | 1) => {
      if (isProcessing) return;
      // If this speaker is already recording → stop
      if (activeSpeakerRef.current === speakerIdx) {
        stopAndProcess();
        return;
      }
      // If the OTHER speaker is recording → ignore (can't record both at once)
      if (activeSpeakerRef.current !== null) return;
      // Start recording for this speaker
      startRecording(speakerIdx);
    },
    [isProcessing, startRecording, stopAndProcess]
  );

  const handleEnd = useCallback(() => {
    // Stop any active recording before leaving
    if (webRecorderRef.current) {
      webRecorderRef.current.stop();
      webStreamRef.current?.getTracks().forEach((t) => t.stop());
    }
    recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    saveSession({
      id: sessionId.current,
      title: sessionTitle || undefined,
      speaker1,
      speaker2,
      turns,
      startedAt: sessionStart.current,
      endedAt: Date.now(),
    });
    router.back();
  }, [speaker1, speaker2, turns, sessionTitle, saveSession]);

  const s1Last = turns.filter((t) => t.speakerIdx === 0).at(-1);
  const s2Last = turns.filter((t) => t.speakerIdx === 1).at(-1);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const PHASE_LABELS: Record<StatusPhase, string> = {
    idle: "",
    recording: "Listening…",
    transcribing: "Transcribing…",
    translating: "Translating…",
    speaking: "Speaking…",
    error: "Error — try again",
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
      height: 44,
      backgroundColor: colors.navy,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: `${colors.primary}30`,
      position: "relative",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    statusBar: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    layoutToggle: {
      position: "absolute",
      right: 16,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
    },
    statusPill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.navy,
      borderWidth: 1,
      borderColor: `${colors.primary}60`,
    },
    statusText: { fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold" },
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
    micRow: { alignItems: "center" },
    micHint: {
      marginTop: 8,
      fontSize: 11,
      fontFamily: "PlusJakartaSans_500Medium",
      color: `${colors.foreground}50`,
      textAlign: "center",
    },
  });

  const renderHalf = (speakerIdx: 0 | 1, inverted: boolean) => {
    const sp = speakerIdx === 0 ? speaker1 : speaker2;
    const myLast = speakerIdx === 0 ? s1Last : s2Last;
    const theirLast = speakerIdx === 0 ? s2Last : s1Last;
    const isRec = speakerIdx === 0 ? isS1Recording : isS2Recording;
    // Disable the OTHER speaker's button while one is recording or processing
    const otherIsActive =
      (speakerIdx === 0 ? isS2Recording : isS1Recording) || isProcessing;

    const rotate = inverted && layoutMode === "face-to-face";

    return (
      <View
        style={[
          inverted ? styles.topHalf : styles.bottomHalf,
          rotate && { transform: [{ rotate: "180deg" }] },
        ]}
      >
        <View style={styles.speakerRow}>
          <View style={styles.speakerChip}>
            <Ionicons name="person" size={12} color={colors.primary} />
            <Text style={styles.speakerName}>{sp.name}</Text>
            <Text style={styles.langLabel}>{getLangLabel(sp.lang)}</Text>
          </View>
          {!inverted && (
            <TouchableOpacity
              style={styles.endBtn}
              onPress={handleEnd}
              testID="button-end-session"
            >
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
              Tap the mic to speak in {getLangLabel(sp.lang)}
            </Text>
          )}
        </View>

        <View style={styles.micRow}>
          <MicButton
            onPress={() => handleMicToggle(speakerIdx)}
            isRecording={isRec}
            isProcessing={isProcessing && !isRec}
            disabled={otherIsActive}
          />
          <Text style={styles.micHint}>
            {isRec ? "Tap to stop & translate" : "Tap to speak"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHalf(1, true)}

      <View style={styles.divider}>
        {/* Status pill — centred, fades in/out */}
        <Animated.View style={[styles.statusBar, statusAnimStyle]} pointerEvents="none">
          <View style={styles.statusPill}>
            <Text style={[styles.statusText, { color: PHASE_COLORS[phase] }]}>
              {PHASE_LABELS[phase]}
            </Text>
          </View>
        </Animated.View>

        {/* Layout toggle — always visible, right-aligned */}
        <TouchableOpacity
          style={styles.layoutToggle}
          onPress={() =>
            setLayoutMode(
              layoutMode === "face-to-face" ? "side-by-side" : "face-to-face"
            )
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={layoutMode === "face-to-face" ? "swap-vertical" : "people"}
            size={16}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {renderHalf(0, false)}
    </View>
  );
}

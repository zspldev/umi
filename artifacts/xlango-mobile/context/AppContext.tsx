import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type SpeakerGender = "male" | "female" | "unspecified";
export type LayoutMode = "face-to-face" | "side-by-side";

export interface SpeakerConfig {
  name: string;
  lang: string;
  gender: SpeakerGender;
}

export interface Turn {
  id: string;
  speakerIdx: 0 | 1;
  original: string;
  translated: string;
  timestamp: number;
}

export interface Session {
  id: string;
  title?: string;
  speaker1: SpeakerConfig;
  speaker2: SpeakerConfig;
  turns: Turn[];
  startedAt: number;
  endedAt?: number;
}

interface AppContextValue {
  speaker1: SpeakerConfig;
  speaker2: SpeakerConfig;
  sessionTitle: string;
  history: Session[];
  layoutMode: LayoutMode;
  setSpeaker1: (s: Partial<SpeakerConfig>) => void;
  setSpeaker2: (s: Partial<SpeakerConfig>) => void;
  setSessionTitle: (t: string) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  saveSession: (session: Session) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const DEFAULT_SPEAKER_1: SpeakerConfig = {
  name: "Speaker 1",
  lang: "en",
  gender: "unspecified",
};
const DEFAULT_SPEAKER_2: SpeakerConfig = {
  name: "Speaker 2",
  lang: "hi",
  gender: "unspecified",
};

const STORAGE_KEYS = {
  SPEAKER1: "@xlango/speaker1",
  SPEAKER2: "@xlango/speaker2",
  HISTORY: "@xlango/history",
  LAYOUT_MODE: "@xlango/layoutMode",
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [speaker1, setSpeaker1State] = useState<SpeakerConfig>(DEFAULT_SPEAKER_1);
  const [speaker2, setSpeaker2State] = useState<SpeakerConfig>(DEFAULT_SPEAKER_2);
  const [sessionTitle, setSessionTitle] = useState("");
  const [history, setHistory] = useState<Session[]>([]);
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>("face-to-face");

  useEffect(() => {
    (async () => {
      try {
        const [s1Raw, s2Raw, histRaw, layoutRaw] = await AsyncStorage.multiGet([
          STORAGE_KEYS.SPEAKER1,
          STORAGE_KEYS.SPEAKER2,
          STORAGE_KEYS.HISTORY,
          STORAGE_KEYS.LAYOUT_MODE,
        ]);
        if (s1Raw[1]) setSpeaker1State(JSON.parse(s1Raw[1]));
        if (s2Raw[1]) setSpeaker2State(JSON.parse(s2Raw[1]));
        if (histRaw[1]) setHistory(JSON.parse(histRaw[1]));
        if (layoutRaw[1]) setLayoutModeState(JSON.parse(layoutRaw[1]));
      } catch {}
    })();
  }, []);

  const setSpeaker1 = useCallback((update: Partial<SpeakerConfig>) => {
    setSpeaker1State((prev) => {
      const next = { ...prev, ...update };
      AsyncStorage.setItem(STORAGE_KEYS.SPEAKER1, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setSpeaker2 = useCallback((update: Partial<SpeakerConfig>) => {
    setSpeaker2State((prev) => {
      const next = { ...prev, ...update };
      AsyncStorage.setItem(STORAGE_KEYS.SPEAKER2, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
    AsyncStorage.setItem(STORAGE_KEYS.LAYOUT_MODE, JSON.stringify(mode)).catch(() => {});
  }, []);

  const saveSession = useCallback(async (session: Session) => {
    setHistory((prev) => {
      const filtered = prev.filter((s) => s.id !== session.id);
      const next = [session, ...filtered].slice(0, 50);
      AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((s) => s.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.HISTORY);
  }, []);

  return (
    <AppContext.Provider
      value={{
        speaker1,
        speaker2,
        sessionTitle,
        history,
        layoutMode,
        setSpeaker1,
        setSpeaker2,
        setSessionTitle,
        setLayoutMode,
        saveSession,
        deleteSession,
        clearHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

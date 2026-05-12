import { useState, useEffect, useCallback } from 'react';

export interface UmiTurn {
  id: string;
  speaker: 1 | 2;
  original: string;
  translated: string;
  timestamp: string;
}

export type SpeakerGender = 'male' | 'female' | 'unspecified';

export interface UmiSession {
  id: string;
  title?: string;
  createdAt: string;
  speakerOneName: string;
  speakerTwoName: string;
  speakerOneLang: string;
  speakerTwoLang: string;
  speakerOneGender?: SpeakerGender;
  speakerTwoGender?: SpeakerGender;
  mode?: 'interpret' | 'tutor';
  scenario?: string;
  turns: UmiTurn[];
}

const STORAGE_KEY = 'umi_sessions';

export function useSessionStore() {
  const [sessions, setSessions] = useState<UmiSession[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        setSessions(JSON.parse(data));
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((updater: (prev: UmiSession[]) => UmiSession[]) => {
    setSessions(prev => {
      const next = updater(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const createSession = useCallback((session: Omit<UmiSession, 'id' | 'createdAt' | 'turns'>) => {
    const newSession: UmiSession = {
      ...session,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      turns: [],
    };
    persist(prev => [newSession, ...prev]);
    return newSession.id;
  }, [persist]);

  const addTurn = useCallback((sessionId: string, turn: Omit<UmiTurn, 'id' | 'timestamp'>) => {
    const newTurn: UmiTurn = {
      ...turn,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    persist(prev =>
      prev.map(s => s.id === sessionId ? { ...s, turns: [...s.turns, newTurn] } : s)
    );
    return newTurn;
  }, [persist]);

  const getSession = useCallback((id: string) => {
    return sessions.find(s => s.id === id);
  }, [sessions]);

  const updateSession = useCallback((id: string, patch: Partial<Omit<UmiSession, 'id' | 'createdAt' | 'turns'>>) => {
    persist(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, [persist]);

  const deleteSession = useCallback((id: string) => {
    persist(prev => prev.filter(s => s.id !== id));
  }, [persist]);

  return {
    sessions,
    loaded,
    createSession,
    addTurn,
    updateSession,
    getSession,
    deleteSession,
  };
}

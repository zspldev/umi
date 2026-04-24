import { useState, useEffect, useCallback } from 'react';

export interface UmiTurn {
  id: string;
  speaker: 1 | 2;
  original: string;
  translated: string;
  timestamp: string;
}

export interface UmiSession {
  id: string;
  title?: string;
  createdAt: string;
  speakerOneName: string;
  speakerTwoName: string;
  speakerOneLang: string;
  speakerTwoLang: string;
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

  const saveSessions = useCallback((newSessions: UmiSession[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
    setSessions(newSessions);
  }, []);

  const createSession = useCallback((session: Omit<UmiSession, 'id' | 'createdAt' | 'turns'>) => {
    const newSession: UmiSession = {
      ...session,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      turns: []
    };
    saveSessions([newSession, ...sessions]);
    return newSession.id;
  }, [sessions, saveSessions]);

  const addTurn = useCallback((sessionId: string, turn: Omit<UmiTurn, 'id' | 'timestamp'>) => {
    const newTurn: UmiTurn = {
      ...turn,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    
    const updatedSessions = sessions.map(s => {
      if (s.id === sessionId) {
        return { ...s, turns: [...s.turns, newTurn] };
      }
      return s;
    });
    saveSessions(updatedSessions);
    return newTurn;
  }, [sessions, saveSessions]);

  const getSession = useCallback((id: string) => {
    return sessions.find(s => s.id === id);
  }, [sessions]);

  const deleteSession = useCallback((id: string) => {
    saveSessions(sessions.filter(s => s.id !== id));
  }, [sessions, saveSessions]);

  return {
    sessions,
    loaded,
    createSession,
    addTurn,
    getSession,
    deleteSession
  };
}

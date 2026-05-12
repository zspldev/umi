import { useRef, useState, useCallback, useEffect } from 'react';
import { trackingHeaders } from '../lib/device';

export type TutorPhase = 'idle' | 'connecting' | 'listening' | 'learner-speaking' | 'tutor-speaking';

const CONNECT_TIMEOUT_MS = 9000;

function int16ToBase64(pcm16: Int16Array): string {
  const uint8 = new Uint8Array(pcm16.buffer);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < uint8.length; i += chunk) {
    binary += String.fromCharCode(...uint8.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;
  return float32;
}

function reportUsage(sessionId: string | undefined, usage: {
  audioInputTokens: number; audioOutputTokens: number;
  textInputTokens: number;  textOutputTokens: number;
}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...trackingHeaders() };
  if (sessionId) headers['X-Session-Id'] = sessionId;
  fetch('/api/tutor/usage/realtime', {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId, ...usage }),
  }).catch(() => {});
}

export function useTutorSession(sessionId?: string) {
  const [phase, setPhase] = useState<TutorPhase>('idle');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const wsRef            = useRef<WebSocket | null>(null);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const workletNodeRef   = useRef<AudioWorkletNode | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const nextPlayRef      = useRef<number>(0);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const responseStartRef  = useRef<number | null>(null);
  const firstAudioRef     = useRef<boolean>(false);
  const tutorTextRef      = useRef<string>('');

  const onLearnerTurnRef  = useRef<((text: string) => void) | null>(null);
  const onTutorTurnRef    = useRef<((text: string) => void) | null>(null);
  const onErrorRef        = useRef<((msg: string) => void) | null>(null);

  const stopMic = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current) { clearTimeout(connectTimeoutRef.current); connectTimeoutRef.current = null; }
  }, []);

  const handleMessage = useCallback((data: string) => {
    let msg: any;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {
      case 'input_audio_buffer.speech_started':
        setPhase('learner-speaking');
        break;

      case 'input_audio_buffer.speech_stopped':
        // briefly show listening while server processes
        break;

      case 'conversation.item.input_audio_transcription.completed': {
        const text = (msg.transcript ?? '').trim();
        if (text) onLearnerTurnRef.current?.(text);
        break;
      }

      case 'response.audio.delta': {
        if (!audioCtxRef.current || !msg.delta) break;
        if (!firstAudioRef.current) {
          firstAudioRef.current = true;
          if (responseStartRef.current !== null) setLatencyMs(Date.now() - responseStartRef.current);
        }
        setPhase('tutor-speaking');
        const float32 = base64ToFloat32(msg.delta);
        if (float32.length === 0) break;
        const ctx = audioCtxRef.current;
        const buf = ctx.createBuffer(1, float32.length, 24000);
        buf.copyToChannel(float32 as Float32Array<ArrayBuffer>, 0);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        const startAt = Math.max(ctx.currentTime + 0.05, nextPlayRef.current);
        src.start(startAt);
        nextPlayRef.current = startAt + buf.duration;
        break;
      }

      case 'response.audio_transcript.delta':
        tutorTextRef.current += (msg.delta ?? '');
        break;

      case 'response.done': {
        const outputTranscript = msg.response?.output?.[0]?.content?.[0]?.transcript;
        const finalText = (outputTranscript || tutorTextRef.current).trim();
        if (finalText) onTutorTurnRef.current?.(finalText);
        tutorTextRef.current = '';
        firstAudioRef.current = false;
        responseStartRef.current = Date.now();

        // Report usage
        const usage = msg.response?.usage;
        if (usage) {
          reportUsage(sessionId, {
            audioInputTokens:  usage.input_token_details?.audio_tokens  ?? 0,
            audioOutputTokens: usage.output_token_details?.audio_tokens ?? 0,
            textInputTokens:   usage.input_token_details?.text_tokens   ?? 0,
            textOutputTokens:  usage.output_token_details?.text_tokens  ?? 0,
          });
        }

        // Return to listening after audio finishes playing
        const ctx = audioCtxRef.current;
        const delay = ctx ? Math.max(0, (nextPlayRef.current - ctx.currentTime) * 1000) + 200 : 200;
        if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
        playbackTimerRef.current = setTimeout(() => {
          playbackTimerRef.current = null;
          setPhase('listening');
        }, delay);
        break;
      }

      case 'error':
        onErrorRef.current?.(msg.error?.message ?? 'Session error');
        break;
    }
  }, [sessionId]);

  const startSession = useCallback(async (
    nativeLang: string,
    targetLang: string,
    scenarioRaw: string,
    onLearnerTurn: (text: string) => void,
    onTutorTurn: (text: string) => void,
    onError: (msg: string) => void,
  ) => {
    const [scenario, speed = 'normal'] = scenarioRaw.split('::');
    setPhase('connecting');
    tutorTextRef.current = '';
    nextPlayRef.current = 0;
    responseStartRef.current = null;
    firstAudioRef.current = false;
    onLearnerTurnRef.current = onLearnerTurn;
    onTutorTurnRef.current = onTutorTurn;
    onErrorRef.current = onError;
    clearConnectTimeout();

    // Hard timeout if connection never opens
    connectTimeoutRef.current = setTimeout(() => {
      connectTimeoutRef.current = null;
      stopMic();
      if (wsRef.current) {
        wsRef.current.onclose = null; wsRef.current.onerror = null;
        wsRef.current.onmessage = null; wsRef.current.close(); wsRef.current = null;
      }
      audioCtxRef.current?.close(); audioCtxRef.current = null;
      onErrorRef.current?.('Connection timed out — please try again');
      onErrorRef.current = null;
      setPhase('idle');
    }, CONNECT_TIMEOUT_MS);

    let clientSecret: string;
    try {
      const headers: Record<string, string> = { ...trackingHeaders() };
      if (sessionId) headers['X-Session-Id'] = sessionId;
      const res = await fetch(
        `/api/tutor/realtime-token?nativeLang=${nativeLang}&targetLang=${targetLang}&scenario=${scenario}&speed=${speed}`,
        { headers },
      );
      if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
      const body = await res.json();
      clientSecret = body.clientSecret;
    } catch (e) {
      clearConnectTimeout();
      onError(e instanceof Error ? e.message : 'Failed to connect');
      setPhase('idle');
      return;
    }

    const audioCtx = new AudioContext({ sampleRate: 24000 });
    audioCtxRef.current = audioCtx;

    const ws = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview',
      ['realtime', `openai-insecure-api-key.${clientSecret}`, 'openai-beta.realtime-v1'],
    );
    wsRef.current = ws;

    ws.onopen = async () => {
      clearConnectTimeout();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, sampleRate: 24000, echoCancellation: true, noiseSuppression: true },
        });
        streamRef.current = stream;
        await audioCtx.audioWorklet.addModule(`${import.meta.env.BASE_URL}audio-processor.js`);
        const source = audioCtx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(audioCtx, 'pcm16-processor');
        workletNodeRef.current = workletNode;

        workletNode.port.onmessage = (e: MessageEvent) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: int16ToBase64(new Int16Array(e.data.pcm16)),
          }));
        };

        source.connect(workletNode);
        setPhase('listening');
        responseStartRef.current = Date.now();
      } catch (e) {
        onErrorRef.current?.(e instanceof Error ? e.message : 'Microphone error');
        onErrorRef.current = null;
        ws.close();
        await audioCtx.close();
        setPhase('idle');
      }
    };

    ws.onmessage = (event) => handleMessage(event.data);

    ws.onerror = () => {
      clearConnectTimeout();
      onErrorRef.current?.('Connection error — please try again');
      onErrorRef.current = null;
      stopMic();
      setPhase('idle');
    };

    ws.onclose = () => { stopMic(); };
  }, [handleMessage, stopMic, clearConnectTimeout, sessionId]);

  const endSession = useCallback(() => {
    clearConnectTimeout();
    if (playbackTimerRef.current) { clearTimeout(playbackTimerRef.current); playbackTimerRef.current = null; }
    onLearnerTurnRef.current = null;
    onTutorTurnRef.current = null;
    onErrorRef.current = null;
    stopMic();
    if (wsRef.current) {
      wsRef.current.onclose = null; wsRef.current.onerror = null;
      wsRef.current.onmessage = null; wsRef.current.close(); wsRef.current = null;
    }
    audioCtxRef.current?.close(); audioCtxRef.current = null;
    nextPlayRef.current = 0;
    tutorTextRef.current = '';
    setPhase('idle');
  }, [stopMic, clearConnectTimeout]);

  useEffect(() => () => endSession(), [endSession]);

  return { phase, latencyMs, startSession, endSession };
}

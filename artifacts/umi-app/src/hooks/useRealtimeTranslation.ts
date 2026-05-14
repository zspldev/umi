import { useRef, useState, useCallback, useEffect } from 'react';
import { trackingHeaders, getDeviceId } from '../lib/device';

export type RealtimePhase = 'idle' | 'connecting' | 'recording' | 'processing' | 'playing';

export interface TurnResult {
  original: string;
  translated: string;
}

const SILENCE_TIMEOUT_MS = 4000;
const SPEECH_RMS_THRESHOLD = 0.008;
const CONNECT_TIMEOUT_MS = 9000;

function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768.0;
  }
  return float32;
}

function int16ToBase64(pcm16: Int16Array): string {
  const uint8 = new Uint8Array(pcm16.buffer);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < uint8.length; i += chunk) {
    binary += String.fromCharCode(...uint8.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Report realtime turn usage to the backend (fire-and-forget). */
function reportRealtimeUsage(sessionId: string | undefined, usage: {
  audioInputTokens: number;
  audioOutputTokens: number;
  textInputTokens: number;
  textOutputTokens: number;
}): void {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...trackingHeaders(),
  };
  if (sessionId) headers['X-Session-Id'] = sessionId;

  fetch('/api/umi/usage/realtime', {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId, ...usage }),
  }).catch(() => {});
}

export function useRealtimeTranslation(sessionId?: string) {
  const [phase, setPhase] = useState<RealtimePhase>('idle');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [canReplay, setCanReplay] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextPlayRef = useRef<number>(0);

  const translationRef = useRef<string>('');
  const originalRef = useRef<string | null>(null);
  const responseDoneRef = useRef<boolean>(false);
  const onCompleteRef = useRef<((r: TurnResult) => void) | null>(null);
  const onErrorRef = useRef<((msg: string) => void) | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechDetectedRef = useRef<boolean>(false);

  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const responseCreateTimeRef = useRef<number | null>(null);
  const firstAudioReceivedRef = useRef<boolean>(false);

  const audioChunksRef = useRef<Float32Array[]>([]);

  const stopMic = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

  const finalize = useCallback(() => {
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
    const cb = onCompleteRef.current;
    const original = originalRef.current ?? '';
    const translated = translationRef.current;
    onCompleteRef.current = null;
    onErrorRef.current = null;
    setCanReplay(audioChunksRef.current.length > 0);
    setPhase('idle');
    cb?.({ original, translated });
  }, []);

  const scheduleFinalize = useCallback(() => {
    if (!responseDoneRef.current) return;
    const ctx = audioCtxRef.current;
    const audioDelay = ctx ? Math.max(0, (nextPlayRef.current - ctx.currentTime) * 1000) + 150 : 150;

    if (originalRef.current !== null) {
      completeTimerRef.current = setTimeout(finalize, audioDelay);
    } else {
      completeTimerRef.current = setTimeout(() => {
        completeTimerRef.current = null;
        finalize();
      }, audioDelay + 2000);
    }
  }, [finalize]);

  const handleMessage = useCallback((data: string) => {
    let msg: any;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {
      case 'response.output_audio.delta': {
        if (!audioCtxRef.current) break;
        if (!firstAudioReceivedRef.current && responseCreateTimeRef.current !== null) {
          firstAudioReceivedRef.current = true;
          setLatencyMs(Date.now() - responseCreateTimeRef.current);
        }
        const float32 = base64ToFloat32(msg.delta);
        if (float32.length === 0) break;
        audioChunksRef.current.push(float32);
        const ctx = audioCtxRef.current;
        const buf = ctx.createBuffer(1, float32.length, 24000);
        buf.copyToChannel(float32 as Float32Array<ArrayBuffer>, 0);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        const startAt = Math.max(ctx.currentTime + 0.05, nextPlayRef.current);
        src.start(startAt);
        nextPlayRef.current = startAt + buf.duration;
        setPhase('playing');
        break;
      }
      case 'response.output_audio_transcript.delta':
        translationRef.current += (msg.delta ?? '');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        originalRef.current = msg.transcript ?? '';
        if (responseDoneRef.current) scheduleFinalize();
        break;

      case 'response.done': {
        const outputTranscript = msg.response?.output?.[0]?.content?.[0]?.transcript;
        if (outputTranscript) translationRef.current = outputTranscript;
        responseDoneRef.current = true;

        const usage = msg.response?.usage;
        if (usage) {
          reportRealtimeUsage(sessionId, {
            audioInputTokens: usage.input_token_details?.audio_tokens ?? 0,
            audioOutputTokens: usage.output_token_details?.audio_tokens ?? 0,
            textInputTokens: usage.input_token_details?.text_tokens ?? 0,
            textOutputTokens: usage.output_token_details?.text_tokens ?? 0,
          });
        }

        scheduleFinalize();
        break;
      }
      case 'error':
        onErrorRef.current?.(msg.error?.message ?? 'Realtime API error');
        onErrorRef.current = null;
        onCompleteRef.current = null;
        setPhase('idle');
        break;
    }
  }, [scheduleFinalize, sessionId]);

  const startTurn = useCallback(async (
    fromLang: string,
    toLang: string,
    onComplete: (r: TurnResult) => void,
    onError: (msg: string) => void,
    speakerGender?: string,
  ) => {
    setPhase('connecting');
    setCanReplay(false);
    translationRef.current = '';
    originalRef.current = null;
    responseDoneRef.current = false;
    nextPlayRef.current = 0;
    speechDetectedRef.current = false;
    responseCreateTimeRef.current = null;
    firstAudioReceivedRef.current = false;
    audioChunksRef.current = [];
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
    clearSilenceTimer();
    clearConnectTimeout();

    // Abort with a user-friendly error if the WebSocket never opens
    connectTimeoutRef.current = setTimeout(() => {
      connectTimeoutRef.current = null;
      stopMic();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      const errCb = onErrorRef.current;
      onCompleteRef.current = null;
      onErrorRef.current = null;
      setPhase('idle');
      errCb?.('Connection timed out — tap to try again');
    }, CONNECT_TIMEOUT_MS);

    let clientSecret: string;
    try {
      const genderParam = speakerGender && speakerGender !== 'unspecified' ? `&gender=${speakerGender}` : '';
      const headers: Record<string, string> = { ...trackingHeaders() };
      if (sessionId) headers['X-Session-Id'] = sessionId;

      const res = await fetch(`/api/umi/realtime-token?fromLang=${fromLang}&toLang=${toLang}${genderParam}`, {
        headers,
      });
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
      'wss://api.openai.com/v1/realtime?model=gpt-realtime-mini',
      ['realtime', `openai-insecure-api-key.${clientSecret}`],
    );
    wsRef.current = ws;

    ws.onopen = async () => {
      // Connection established — cancel the stuck-connecting timeout
      clearConnectTimeout();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, sampleRate: 24000, echoCancellation: true, noiseSuppression: true },
        });
        streamRef.current = stream;

        await audioCtx.audioWorklet.addModule(
          `${import.meta.env.BASE_URL}audio-processor.js`,
        );

        const source = audioCtx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(audioCtx, 'pcm16-processor');
        workletNodeRef.current = workletNode;

        workletNode.port.onmessage = (e: MessageEvent) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const pcm16 = new Int16Array(e.data.pcm16);
          ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: int16ToBase64(pcm16) }));

          const rms: number = e.data.rms ?? 0;
          if (rms > SPEECH_RMS_THRESHOLD) {
            speechDetectedRef.current = true;
            clearSilenceTimer();
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null;
            }, SILENCE_TIMEOUT_MS);
          }
        };

        source.connect(workletNode);
        setPhase('recording');

        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          if (!speechDetectedRef.current) {
            stopMic();
            if (wsRef.current) {
              wsRef.current.onclose = null;
              wsRef.current.onerror = null;
              wsRef.current.onmessage = null;
              wsRef.current.close();
              wsRef.current = null;
            }
            audioCtxRef.current?.close();
            audioCtxRef.current = null;
            const errCb = onErrorRef.current;
            onCompleteRef.current = null;
            onErrorRef.current = null;
            setPhase('idle');
            errCb?.('nothing-heard');
          }
        }, SILENCE_TIMEOUT_MS);

      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Microphone error';
        onErrorRef.current?.(msg);
        onErrorRef.current = null;
        onCompleteRef.current = null;
        ws.close();
        await audioCtx.close();
        setPhase('idle');
      }
    };

    ws.onmessage = (event) => handleMessage(event.data);

    ws.onerror = () => {
      clearConnectTimeout();
      onErrorRef.current?.('WebSocket connection error');
      onErrorRef.current = null;
      onCompleteRef.current = null;
      clearSilenceTimer();
      stopMic();
      setPhase('idle');
    };

    ws.onclose = () => {
      clearSilenceTimer();
      stopMic();
    };
  }, [handleMessage, stopMic, clearSilenceTimer, clearConnectTimeout, sessionId]);

  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    stopMic();
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      ws.send(JSON.stringify({ type: 'response.create' }));
      responseCreateTimeRef.current = Date.now();
    }
    setPhase('processing');
  }, [stopMic, clearSilenceTimer]);

  const replayAudio = useCallback(() => {
    const chunks = audioChunksRef.current;
    if (chunks.length === 0) return;

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const ctx = new AudioContext({ sampleRate: 24000 });
    const buffer = ctx.createBuffer(1, combined.length, 24000);
    buffer.copyToChannel(combined, 0);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => ctx.close();
    src.start(ctx.currentTime + 0.05);
  }, []);

  const cleanup = useCallback(() => {
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
    clearSilenceTimer();
    clearConnectTimeout();
    onCompleteRef.current = null;
    onErrorRef.current = null;
    stopMic();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    nextPlayRef.current = 0;
    translationRef.current = '';
    originalRef.current = null;
    responseDoneRef.current = false;
    speechDetectedRef.current = false;
    responseCreateTimeRef.current = null;
    firstAudioReceivedRef.current = false;
    audioChunksRef.current = [];
    setCanReplay(false);
    setPhase('idle');
  }, [stopMic, clearSilenceTimer, clearConnectTimeout]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { phase, latencyMs, canReplay, replayAudio, startTurn, stopRecording, cleanup };
}

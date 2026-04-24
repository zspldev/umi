import { useRef, useState, useCallback, useEffect } from 'react';

export type RealtimePhase = 'idle' | 'connecting' | 'recording' | 'processing' | 'playing';

export interface TurnResult {
  original: string;
  translated: string;
}

const SILENCE_TIMEOUT_MS = 4000;
const SPEECH_RMS_THRESHOLD = 0.008;

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

export function useRealtimeTranslation() {
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

  // #14 silence guard
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechDetectedRef = useRef<boolean>(false);

  // #16 latency tracking
  const responseCreateTimeRef = useRef<number | null>(null);
  const firstAudioReceivedRef = useRef<boolean>(false);

  // #5 replay: accumulate all audio chunks for the current turn
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
      case 'response.audio.delta': {
        if (!audioCtxRef.current) break;
        // #16 record latency on first audio chunk
        if (!firstAudioReceivedRef.current && responseCreateTimeRef.current !== null) {
          firstAudioReceivedRef.current = true;
          setLatencyMs(Date.now() - responseCreateTimeRef.current);
        }
        const float32 = base64ToFloat32(msg.delta);
        if (float32.length === 0) break;
        // #5 store for replay
        audioChunksRef.current.push(float32);
        const ctx = audioCtxRef.current;
        const buf = ctx.createBuffer(1, float32.length, 24000);
        buf.copyToChannel(float32, 0);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        const startAt = Math.max(ctx.currentTime + 0.05, nextPlayRef.current);
        src.start(startAt);
        nextPlayRef.current = startAt + buf.duration;
        setPhase('playing');
        break;
      }
      case 'response.audio_transcript.delta':
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
  }, [scheduleFinalize]);

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

    let clientSecret: string;
    try {
      const genderParam = speakerGender && speakerGender !== 'unspecified' ? `&gender=${speakerGender}` : '';
      const res = await fetch(`/api/umi/realtime-token?fromLang=${fromLang}&toLang=${toLang}${genderParam}`);
      if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
      const body = await res.json();
      clientSecret = body.clientSecret;
    } catch (e) {
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

          // #14 silence guard: reset timer whenever speech is detected
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

        // #14 hard timeout: if no speech at all after SILENCE_TIMEOUT_MS, cancel
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
  }, [handleMessage, stopMic, clearSilenceTimer]);

  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    stopMic();
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      ws.send(JSON.stringify({ type: 'response.create' }));
      // #16 record the moment we asked for a response
      responseCreateTimeRef.current = Date.now();
    }
    setPhase('processing');
  }, [stopMic, clearSilenceTimer]);

  // #5 replay: create a fresh AudioContext, play all stored chunks, then close it
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
  }, [stopMic, clearSilenceTimer]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { phase, latencyMs, canReplay, replayAudio, startTurn, stopRecording, cleanup };
}

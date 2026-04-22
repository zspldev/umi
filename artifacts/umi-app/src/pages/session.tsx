import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Mic, X, Loader2, ArrowRightLeft, Square } from 'lucide-react';
import { useSessionStore, UmiTurn } from '@/lib/store';
import { useVoiceRecorder } from '@workspace/integrations-openai-ai-react/audio';
import { useTranscribeAudio, useTranslateText, useSpeakText } from '@workspace/api-client-react';
import { toast } from 'sonner';

const langMap: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  es: 'Spanish',
  ja: 'Japanese',
  de: 'German'
};

export default function Session() {
  const [loc, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('id');
  
  const { getSession, addTurn, loaded } = useSessionStore();
  const session = sessionId ? getSession(sessionId) : null;

  const [activeSpeaker, setActiveSpeaker] = useState<1 | 2>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTurn, setLastTurn] = useState<UmiTurn | null>(null);

  const { state: recordingState, startRecording, stopRecording } = useVoiceRecorder();
  const isRecording = recordingState === "recording";
  const transcribeMutation = useTranscribeAudio();
  const translateMutation = useTranslateText();
  const speakMutation = useSpeakText();

  useEffect(() => {
    if (!loaded) return;
    if (!session) {
      setLocation('/');
    } else if (session.turns.length > 0) {
      setLastTurn(session.turns[session.turns.length - 1]);
    }
  }, [loaded, session, setLocation]);

  if (!loaded) return null;
  if (!session) return null;

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleRecordToggle = async () => {
    if (isRecording) {
      let blob: Blob;
      try {
        blob = await stopRecording();
      } catch (e) {
        toast.error("Could not stop recording.");
        return;
      }

      if (!blob || blob.size === 0) {
        toast.error("Recording was empty — please try again.");
        return;
      }

      setIsProcessing(true);
      try {
        const base64data = await blobToBase64(blob);
        const mimeType = blob.type || 'audio/webm';

        const activeLang = activeSpeaker === 1 ? session.speakerOneLang : session.speakerTwoLang;
        const targetLang = activeSpeaker === 1 ? session.speakerTwoLang : session.speakerOneLang;

        const transcribeRes = await transcribeMutation.mutateAsync({
          data: { audioBase64: base64data, mimeType, language: activeLang }
        });

        if (!transcribeRes.text) throw new Error("Transcription returned empty text");

        const translateRes = await translateMutation.mutateAsync({
          data: { text: transcribeRes.text, fromLang: activeLang, toLang: targetLang }
        });

        if (!translateRes.translatedText) throw new Error("Translation returned empty text");

        const speakRes = await speakMutation.mutateAsync({
          data: { text: translateRes.translatedText, lang: targetLang }
        });

        if (speakRes.audioBase64) {
          const audio = new Audio(`data:${speakRes.mimeType ?? 'audio/mpeg'};base64,${speakRes.audioBase64}`);
          audio.play().catch(() => {
            toast.error("Audio playback was blocked — tap the screen and try again.");
          });
        }

        const turn = addTurn(session.id, {
          speaker: activeSpeaker,
          original: transcribeRes.text,
          translated: translateRes.translatedText
        });

        setLastTurn(turn);
        setActiveSpeaker(activeSpeaker === 1 ? 2 : 1);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        toast.error(msg);
        console.error("Processing error", e);
      } finally {
        setIsProcessing(false);
      }
    } else {
      try {
        await startRecording();
      } catch (e) {
        toast.error("Microphone access denied. Please allow microphone permissions and try again.");
      }
    }
  };

  const isSpeaker1Active = activeSpeaker === 1;

  return (
    <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans relative overflow-hidden">
      
      <div className="absolute top-0 w-full z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/20 to-transparent">
        <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-semibold tracking-wide border border-white/10 flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          Live Session
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => setLocation(`/history/${session.id}`)}
          className="text-white hover:bg-white/20 rounded-full h-9 px-4 font-medium backdrop-blur-md bg-white/10 border border-white/10"
          data-testid="button-end-session"
        >
          End Session
          <X className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="flex-1 bg-secondary text-white p-6 pt-20 flex flex-col relative pb-10 transition-colors duration-500" style={{ opacity: isSpeaker1Active ? 1 : 0.5 }}>
        <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 z-10 bg-white shadow-xl rounded-full p-1.5 border border-muted/20 cursor-pointer" onClick={() => !isRecording && !isProcessing && setActiveSpeaker(activeSpeaker === 1 ? 2 : 1)} data-testid="button-switch-speaker">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ArrowRightLeft className="w-5 h-5 rotate-90" />
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Speaker 1 • {langMap[session.speakerOneLang]}</span>
            <span className="text-lg font-bold text-white">{session.speakerOneName}</span>
          </div>
          {isProcessing && activeSpeaker === 1 && (
            <div className="px-3 py-1 bg-white/10 rounded-full text-white/90 text-sm font-medium flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Processing...
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[90%]">
          {lastTurn && lastTurn.speaker === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
              <p className={`text-xl font-medium leading-snug text-white/60 ${['hi', 'mr'].includes(session.speakerOneLang) ? "font-devanagari" : ""}`}>
                {lastTurn.original}
              </p>
              <p className={`text-3xl font-medium leading-snug text-white ${['hi', 'mr'].includes(session.speakerTwoLang) ? "font-devanagari" : ""}`}>
                {lastTurn.translated}
              </p>
            </div>
          )}
          {lastTurn && lastTurn.speaker === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
               <p className={`text-3xl font-medium leading-snug text-white ${['hi', 'mr'].includes(session.speakerOneLang) ? "font-devanagari" : ""}`}>
                {lastTurn.translated}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-[#F8F9FA] text-secondary p-6 pt-10 flex flex-col relative pb-24 transition-colors duration-500" style={{ opacity: !isSpeaker1Active ? 1 : 0.5 }}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <span className="text-secondary/50 text-xs font-semibold uppercase tracking-wider mb-1">Speaker 2 • {langMap[session.speakerTwoLang]}</span>
            <span className="text-lg font-bold text-secondary">{session.speakerTwoName}</span>
          </div>
          {isProcessing && activeSpeaker === 2 && (
             <div className="px-3 py-1 bg-secondary/5 rounded-full text-secondary/70 text-sm font-medium flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Processing...
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[90%]">
          {lastTurn && lastTurn.speaker === 2 && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
              <p className={`text-xl font-medium leading-snug text-secondary/60 ${['hi', 'mr'].includes(session.speakerTwoLang) ? "font-devanagari" : ""}`}>
                {lastTurn.original}
              </p>
              <p className={`text-3xl font-medium leading-snug text-secondary ${['hi', 'mr'].includes(session.speakerOneLang) ? "font-devanagari" : ""}`}>
                {lastTurn.translated}
              </p>
            </div>
          )}
          {lastTurn && lastTurn.speaker === 1 && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
              <p className={`text-3xl font-medium leading-snug text-secondary ${['hi', 'mr'].includes(session.speakerTwoLang) ? "font-devanagari" : ""}`}>
                {lastTurn.translated}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 left-0 w-full flex justify-center z-20">
        <div className="relative">
          {isRecording && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary opacity-30 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-[-10px] rounded-full bg-primary opacity-20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
            </>
          )}
          
          <button 
            disabled={isProcessing}
            onClick={handleRecordToggle}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl shadow-primary/40 border-4 border-white transition-transform active:scale-95 z-10 ${isRecording ? 'bg-destructive shadow-destructive/40' : 'bg-primary'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            data-testid="button-record"
          >
            {isRecording ? <Square className="w-8 h-8 text-white fill-white" /> : <Mic className="w-8 h-8 text-white" />}
          </button>
          
          {!isRecording && !isProcessing && (
            <div className={`absolute -top-12 left-1/2 -translate-x-1/2 text-white text-sm font-semibold py-1.5 px-4 rounded-full shadow-lg whitespace-nowrap after:content-[''] after:absolute after:bottom-[-6px] after:left-1/2 after:-translate-x-1/2 after:border-[6px] after:border-transparent ${activeSpeaker === 1 ? 'bg-secondary after:border-t-secondary' : 'bg-primary after:border-t-primary'}`}>
              {activeSpeaker === 1 ? session.speakerOneName : session.speakerTwoName}'s turn
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

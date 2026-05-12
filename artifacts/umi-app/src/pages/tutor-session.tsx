import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { X, Loader2, Volume2, Mic, Waves } from 'lucide-react';
import { useSessionStore, UmiTurn } from '@/lib/store';
import { useTutorSession } from '@/hooks/useTutorSession';
import { toast } from 'sonner';

const langMap: Record<string, string> = {
  en: 'English', zh: 'Mandarin', hi: 'Hindi', es: 'Spanish',
  ar: 'Arabic', pt: 'Portuguese', fr: 'French', ru: 'Russian',
  ja: 'Japanese', de: 'German', mr: 'Marathi', ta: 'Tamil', te: 'Telugu',
};

function SignalBadge({ latencyMs }: { latencyMs: number | null }) {
  let color = 'bg-white/30'; let filledBars = 0; let label = '—';
  if (latencyMs !== null) {
    label = `${latencyMs}ms`;
    if (latencyMs < 500)       { color = 'bg-emerald-400'; filledBars = 3; }
    else if (latencyMs < 1000) { color = 'bg-yellow-400';  filledBars = 2; }
    else                       { color = 'bg-red-400';      filledBars = 1; }
  }
  return (
    <div className="flex items-end gap-[3px]" title={latencyMs !== null ? `${latencyMs}ms` : 'No data yet'}>
      {[0,1,2].map(i => (
        <div key={i} className={`w-[4px] rounded-sm transition-colors duration-500 ${i < filledBars ? color : 'bg-white/25'}`} style={{ height: `${8+i*4}px` }} />
      ))}
      <span className="text-[10px] font-semibold text-white/70 ml-1 tabular-nums">{label}</span>
    </div>
  );
}

export default function TutorSession() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('id');

  const { getSession, addTurn, loaded } = useSessionStore();
  const session = sessionId ? getSession(sessionId) : null;

  const [lastTutorTurn, setLastTutorTurn]   = useState<UmiTurn | null>(null);
  const [lastLearnerTurn, setLastLearnerTurn] = useState<UmiTurn | null>(null);
  const [started, setStarted] = useState(false);
  const [nudgeTutor, setNudgeTutor]   = useState(false);
  const [nudgeLearner, setNudgeLearner] = useState(false);

  const { phase, latencyMs, startSession, endSession } = useTutorSession(sessionId ?? undefined);

  useEffect(() => {
    if (!loaded) return;
    if (!session) setLocation('/');
  }, [loaded, session, setLocation]);

  const onTutorTurn = useCallback((text: string) => {
    if (!session) return;
    const turn = addTurn(session.id, { speaker: 2, original: text, translated: '' });
    setLastTutorTurn(turn);
    setNudgeTutor(true);
    setTimeout(() => setNudgeTutor(false), 2000);
  }, [session, addTurn]);

  const onLearnerTurn = useCallback((text: string) => {
    if (!session) return;
    const turn = addTurn(session.id, { speaker: 1, original: text, translated: '' });
    setLastLearnerTurn(turn);
    setNudgeLearner(true);
    navigator.vibrate?.([80, 40, 80]);
    setTimeout(() => setNudgeLearner(false), 2000);
  }, [session, addTurn]);

  const handleStart = () => {
    if (!session) return;
    setStarted(true);
    startSession(
      session.speakerOneLang,
      session.speakerTwoLang,
      session.scenario ?? 'greetings',
      onLearnerTurn,
      onTutorTurn,
      (msg) => toast.error(msg),
    );
  };

  const handleEnd = () => {
    endSession();
    setLocation(`/history/${session?.id}`);
  };

  if (!loaded || !session) return null;

  const tutorName   = session.speakerTwoName;
  const learnerName = session.speakerOneName;
  const targetLang  = session.speakerTwoLang;
  const nativeLang  = session.speakerOneLang;

  const isTutorSpeaking   = phase === 'tutor-speaking';
  const isLearnerSpeaking = phase === 'learner-speaking';
  const isConnecting      = phase === 'connecting';
  const isListening       = phase === 'listening';

  const tutorRing   = nudgeTutor   ? 'ring-4 ring-inset ring-primary/50'     : isTutorSpeaking   ? 'ring-4 ring-inset ring-primary/40'    : '';
  const learnerRing = nudgeLearner ? 'ring-4 ring-inset ring-primary/50'     : isLearnerSpeaking ? 'ring-4 ring-inset ring-destructive/50' : '';

  return (
    <div className="h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans relative overflow-hidden">

      {/* Header */}
      <div className="absolute top-0 w-full z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/20 to-transparent">
        <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-semibold tracking-wide border border-white/10 flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Learn
          <SignalBadge latencyMs={latencyMs} />
        </div>
        <Button
          size="sm" variant="ghost"
          onClick={handleEnd}
          className="text-white hover:bg-white/20 rounded-full h-9 px-4 font-medium backdrop-blur-md bg-white/10 border border-white/10"
        >
          End Session <X className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Tutor panel — navy, top */}
      <div
        className={`flex-1 bg-secondary text-white p-4 pt-16 flex flex-col relative pb-4 transition-all duration-300 ${tutorRing}`}
        style={{ opacity: !started ? 0.6 : 1 }}
      >
        <div className="flex justify-between items-start mb-1">
          <div className="flex flex-col">
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-0.5">
              Tutor · {langMap[targetLang] ?? targetLang}
            </span>
            <span className="text-base font-bold text-white">{tutorName}</span>
          </div>
          <div className="flex items-center gap-2">
            {isTutorSpeaking && (
              <div className="px-3 py-1.5 bg-primary/20 rounded-full text-white text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                Speaking…
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {lastTutorTurn ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <p dir="auto" className="text-xl font-medium leading-snug text-white">{lastTutorTurn.original}</p>
            </div>
          ) : started ? (
            <div className="flex items-center gap-2 text-white/40">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{tutorName} is greeting you…</span>
            </div>
          ) : (
            <p className="text-white/30 text-sm italic">
              {tutorName} will greet you in {langMap[targetLang] ?? targetLang} when you start.
            </p>
          )}
        </div>
      </div>

      {/* Learner panel — light, bottom */}
      <div
        className={`flex-1 bg-[#F8F9FA] text-secondary p-4 pt-8 pb-24 flex flex-col relative transition-all duration-300 ${learnerRing}`}
        style={{ opacity: !started ? 0.6 : 1 }}
      >
        <div className="flex justify-between items-start mb-1">
          <div className="flex flex-col">
            <span className="text-secondary/50 text-xs font-semibold uppercase tracking-wider mb-0.5">
              You · {langMap[nativeLang] ?? nativeLang}
            </span>
            <span className="text-base font-bold text-secondary">{learnerName}</span>
          </div>
          <div className="flex items-center gap-2">
            {isLearnerSpeaking && (
              <div className="px-3 py-1.5 bg-destructive/10 rounded-full text-destructive text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Listening…
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {lastLearnerTurn ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <p dir="auto" className="text-xl font-medium leading-snug text-secondary">{lastLearnerTurn.original}</p>
            </div>
          ) : started ? (
            <p className="text-secondary/30 text-sm italic">
              Speak in {langMap[targetLang] ?? targetLang} — {tutorName} is listening.
            </p>
          ) : (
            <p className="text-secondary/30 text-sm italic">
              Your words will appear here.
            </p>
          )}
        </div>
      </div>

      {/* Status bar / Start button */}
      <div className="absolute bottom-6 left-0 w-full flex justify-center z-20">
        <div className="relative flex justify-center w-[82%]">

          {/* Recording pulse rings */}
          {isLearnerSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full bg-destructive opacity-20 animate-ping" style={{ animationDuration: '1.4s' }} />
              <div className="absolute inset-[-8px] rounded-full bg-destructive opacity-12 animate-ping" style={{ animationDuration: '1.4s', animationDelay: '0.4s' }} />
            </>
          )}

          {!started ? (
            <button
              onClick={handleStart}
              className="w-full h-16 rounded-full flex items-center justify-center gap-3 shadow-xl border-4 border-white bg-primary shadow-primary/40 active:scale-[0.97] transition-all"
            >
              <Mic className="w-6 h-6 text-white flex-shrink-0" />
              <span className="text-white font-bold text-base">Start with {tutorName}</span>
            </button>
          ) : isConnecting ? (
            <div className="w-full h-16 rounded-full flex items-center justify-center gap-3 border-4 border-white bg-secondary/60 shadow-xl">
              <Loader2 className="w-6 h-6 text-white animate-spin flex-shrink-0" />
              <span className="text-white font-bold text-base">Connecting…</span>
            </div>
          ) : isLearnerSpeaking ? (
            <div className="w-full h-16 rounded-full flex items-center justify-center gap-3 border-4 border-white bg-destructive shadow-destructive/40 shadow-xl z-10">
              <span className="w-3 h-3 rounded-full bg-white animate-pulse flex-shrink-0" />
              <span className="text-white font-bold text-base">Listening…</span>
            </div>
          ) : isTutorSpeaking ? (
            <div className="w-full h-16 rounded-full flex items-center justify-center gap-3 border-4 border-white bg-primary/80 shadow-xl">
              <Waves className="w-6 h-6 text-white flex-shrink-0" />
              <span className="text-white font-bold text-base">{tutorName} is speaking…</span>
            </div>
          ) : (
            // listening — ambient always-on indicator
            <div className="w-full h-16 rounded-full flex items-center justify-center gap-3 border-4 border-white bg-primary/60 shadow-xl">
              <Mic className="w-6 h-6 text-white/80 flex-shrink-0" />
              <span className="text-white/90 font-bold text-base">Speak in {langMap[targetLang] ?? targetLang}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

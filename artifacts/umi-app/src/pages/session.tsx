import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Mic, X, Loader2, ArrowRightLeft, Square, Volume2, RotateCcw, Globe } from 'lucide-react';
import { useSessionStore, UmiTurn } from '@/lib/store';
import { useRealtimeTranslation } from '@/hooks/useRealtimeTranslation';
import { toast } from 'sonner';

const langMap: Record<string, string> = {
  auto: 'Auto',
  en: 'English',
  zh: 'Mandarin',
  hi: 'Hindi',
  es: 'Spanish',
  ar: 'Arabic',
  pt: 'Portuguese',
  fr: 'French',
  ru: 'Russian',
  ja: 'Japanese',
  de: 'German',
  mr: 'Marathi',
};

const ALL_LANGS = ['en', 'zh', 'hi', 'es', 'ar', 'pt', 'fr', 'ru', 'ja', 'de', 'mr'] as const;

function SignalBadge({ latencyMs }: { latencyMs: number | null }) {
  let color = 'bg-white/30';
  let filledBars = 0;
  let label = '—';

  if (latencyMs !== null) {
    label = `${latencyMs}ms`;
    if (latencyMs < 500) { color = 'bg-emerald-400'; filledBars = 3; }
    else if (latencyMs < 1000) { color = 'bg-yellow-400'; filledBars = 2; }
    else { color = 'bg-red-400'; filledBars = 1; }
  }

  return (
    <div className="flex items-end gap-[3px] cursor-default" title={latencyMs !== null ? `Response latency: ${latencyMs}ms` : 'No latency data yet'}>
      {[0, 1, 2].map(i => (
        <div key={i} className={`w-[4px] rounded-sm transition-colors duration-500 ${i < filledBars ? color : 'bg-white/25'}`} style={{ height: `${8 + i * 4}px` }} />
      ))}
      <span className="text-[10px] font-semibold text-white/70 ml-1 tabular-nums">{label}</span>
    </div>
  );
}

function LangOverride({
  langs, onSelect, onCancel, dark,
}: {
  langs: readonly string[];
  onSelect: (lang: string) => void;
  onCancel: () => void;
  dark: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
      {langs.map(lang => (
        <button
          key={lang}
          onClick={() => onSelect(lang)}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors
            ${dark
              ? 'bg-white/20 hover:bg-white/35 text-white'
              : 'bg-secondary/10 hover:bg-secondary/20 text-secondary'
            }`}
        >
          {langMap[lang]}
        </button>
      ))}
      <button
        onClick={onCancel}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
          ${dark ? 'text-white/40 hover:text-white/60' : 'text-secondary/40 hover:text-secondary/60'}`}
      >
        Cancel
      </button>
    </div>
  );
}

export default function Session() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('id');

  const { getSession, addTurn, updateSession, loaded } = useSessionStore();
  const session = sessionId ? getSession(sessionId) : null;
  const speakerGender = (spk: 1 | 2) =>
    spk === 1 ? (session?.speakerOneGender ?? 'unspecified') : (session?.speakerTwoGender ?? 'unspecified');

  const [activeSpeaker, setActiveSpeaker] = useState<1 | 2>(1);
  const [lastTurn, setLastTurn] = useState<UmiTurn | null>(null);
  const [nudge, setNudge] = useState(false);
  const prevLastTurnIdRef = useRef<string | null>(null);
  // which speaker's language override picker is open (null = none)
  const [langOverrideOpen, setLangOverrideOpen] = useState<1 | 2 | null>(null);

  const { phase, latencyMs, canReplay, replayAudio, startTurn, stopRecording, cleanup } = useRealtimeTranslation();
  const isRecording = phase === 'recording';
  const isBusy = phase !== 'idle' && phase !== 'recording';

  useEffect(() => {
    if (!loaded) return;
    if (!session) {
      setLocation('/');
    } else if (session.turns.length > 0) {
      setLastTurn(session.turns[session.turns.length - 1]);
    }
  }, [loaded, session, setLocation]);

  // nudge fires whenever a new turn lands
  useEffect(() => {
    if (!lastTurn) return;
    if (lastTurn.id === prevLastTurnIdRef.current) return;
    prevLastTurnIdRef.current = lastTurn.id;
    setNudge(true);
    navigator.vibrate?.([100, 50, 100]);
    const t = setTimeout(() => setNudge(false), 2000);
    return () => clearTimeout(t);
  }, [lastTurn]);

  // close language override when recording starts
  useEffect(() => {
    if (phase !== 'idle') setLangOverrideOpen(null);
  }, [phase]);

  if (!loaded) return null;
  if (!session) return null;

  const handleMicPress = () => {
    if (isRecording) { stopRecording(); return; }
    if (phase !== 'idle') return;

    const fromLang = activeSpeaker === 1 ? session.speakerOneLang : session.speakerTwoLang;
    const toLang   = activeSpeaker === 1 ? session.speakerTwoLang : session.speakerOneLang;

    startTurn(fromLang, toLang,
      ({ original, translated }) => {
        const turn = addTurn(session.id, { speaker: activeSpeaker, original, translated });
        setLastTurn(turn);
        setActiveSpeaker(activeSpeaker === 1 ? 2 : 1);
      },
      (msg) => {
        if (msg === 'nothing-heard') {
          toast('Nothing heard — tap the mic to try again', { icon: '🎙️', duration: 3000 });
        } else {
          toast.error(msg);
        }
      },
      speakerGender(activeSpeaker),
    );
  };

  const handleLangOverride = (speaker: 1 | 2, lang: string) => {
    if (!session) return;
    if (speaker === 1) updateSession(session.id, { speakerOneLang: lang });
    else updateSession(session.id, { speakerTwoLang: lang });
    setLangOverrideOpen(null);
  };

  const isSpeaker1Active = activeSpeaker === 1;
  const isProcessing = phase === 'processing';
  const isPlaying = phase === 'playing';
  const nudgeRing = nudge ? 'ring-4 ring-inset ring-primary/60' : '';

  return (
    <div className="h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans relative overflow-hidden">

      {/* Header */}
      <div className="absolute top-0 w-full z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/20 to-transparent">
        <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-semibold tracking-wide border border-white/10 flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          Live
          <SignalBadge latencyMs={latencyMs} />
        </div>
        <Button
          size="sm" variant="ghost"
          onClick={() => { cleanup(); setLocation(`/history/${session.id}`); }}
          className="text-white hover:bg-white/20 rounded-full h-9 px-4 font-medium backdrop-blur-md bg-white/10 border border-white/10"
          data-testid="button-end-session"
        >
          End Session <X className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Speaker 1 panel — navy, top */}
      <div
        className={`flex-1 bg-secondary text-white p-4 pt-16 flex flex-col relative pb-4 transition-all duration-500 ${isSpeaker1Active && nudge ? nudgeRing : ''}`}
        style={{ opacity: isSpeaker1Active ? 1 : 0.5 }}
      >
        {/* Switch button */}
        <div
          className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 z-10 bg-white shadow-xl rounded-full p-1.5 border border-muted/20 cursor-pointer"
          onClick={() => phase === 'idle' && setActiveSpeaker(activeSpeaker === 1 ? 2 : 1)}
          data-testid="button-switch-speaker"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ArrowRightLeft className="w-5 h-5 rotate-90" />
          </div>
        </div>

        {/* Speaker 1 info row */}
        <div className="flex justify-between items-start mb-1">
          <div className="flex flex-col">
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-0.5">
              Speaker 1 • {langMap[session.speakerOneLang] ?? session.speakerOneLang}
            </span>
            <span className="text-base font-bold text-white">{session.speakerOneName}</span>

            {/* Auto language override — Speaker 1 */}
            {session.speakerOneLang === 'auto' && phase === 'idle' && (
              langOverrideOpen === 1 ? (
                <LangOverride
                  langs={ALL_LANGS}
                  dark={true}
                  onSelect={lang => handleLangOverride(1, lang)}
                  onCancel={() => setLangOverrideOpen(null)}
                />
              ) : (
                <button
                  onClick={() => setLangOverrideOpen(1)}
                  className="mt-1.5 flex items-center gap-1 text-[11px] text-white/50 hover:text-white/75 transition-colors"
                  data-testid="button-lang-override-s1"
                >
                  <Globe className="w-3 h-3" />
                  Auto-detect · Lock language?
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSpeaker1Active && (isProcessing || isPlaying) && (
              <div className="px-3 py-1 bg-white/10 rounded-full text-white/90 text-sm font-medium flex items-center gap-2">
                {isPlaying ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isPlaying ? 'Playing…' : 'Processing…'}
              </div>
            )}
            {!isSpeaker1Active && phase === 'idle' && canReplay && lastTurn?.speaker === 1 && (
              <button onClick={replayAudio} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors" title="Replay translation" data-testid="button-replay-s1">
                <RotateCcw className="w-3.5 h-3.5 text-white/80" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[90%]">
          {lastTurn?.speaker === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-3">
              <p dir="auto" className={`text-xl font-medium leading-snug text-white ${['hi', 'mr'].includes(session.speakerOneLang) ? 'font-devanagari' : ''}`}>{lastTurn.original}</p>
              <p dir="auto" className={`text-xl italic font-medium leading-snug text-white/80 ${['hi', 'mr'].includes(session.speakerTwoLang) ? 'font-devanagari' : ''}`}>{lastTurn.translated}</p>
            </div>
          )}
          {lastTurn?.speaker === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-3">
              <p dir="auto" className={`text-xl italic font-medium leading-snug text-white/80 ${['hi', 'mr'].includes(session.speakerOneLang) ? 'font-devanagari' : ''}`}>{lastTurn.translated}</p>
            </div>
          )}
        </div>
      </div>

      {/* Speaker 2 panel — light, bottom */}
      <div
        className={`flex-1 bg-[#F8F9FA] text-secondary p-4 pt-8 flex flex-col relative pb-20 transition-all duration-500 ${!isSpeaker1Active && nudge ? 'ring-4 ring-inset ring-primary/40' : ''}`}
        style={{ opacity: !isSpeaker1Active ? 1 : 0.5 }}
      >
        {/* Speaker 2 info row */}
        <div className="flex justify-between items-start mb-1">
          <div className="flex flex-col">
            <span className="text-secondary/50 text-xs font-semibold uppercase tracking-wider mb-0.5">
              Speaker 2 • {langMap[session.speakerTwoLang] ?? session.speakerTwoLang}
            </span>
            <span className="text-base font-bold text-secondary">{session.speakerTwoName}</span>

            {/* Auto language override — Speaker 2 */}
            {session.speakerTwoLang === 'auto' && phase === 'idle' && (
              langOverrideOpen === 2 ? (
                <LangOverride
                  langs={ALL_LANGS}
                  dark={false}
                  onSelect={lang => handleLangOverride(2, lang)}
                  onCancel={() => setLangOverrideOpen(null)}
                />
              ) : (
                <button
                  onClick={() => setLangOverrideOpen(2)}
                  className="mt-1.5 flex items-center gap-1 text-[11px] text-secondary/40 hover:text-secondary/65 transition-colors"
                  data-testid="button-lang-override-s2"
                >
                  <Globe className="w-3 h-3" />
                  Auto-detect · Lock language?
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isSpeaker1Active && (isProcessing || isPlaying) && (
              <div className="px-3 py-1 bg-secondary/5 rounded-full text-secondary/70 text-sm font-medium flex items-center gap-1.5">
                {isPlaying ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isPlaying ? 'Playing…' : 'Processing…'}
              </div>
            )}
            {isSpeaker1Active && phase === 'idle' && canReplay && lastTurn?.speaker === 2 && (
              <button onClick={replayAudio} className="w-8 h-8 rounded-full bg-secondary/10 hover:bg-secondary/15 flex items-center justify-center transition-colors" title="Replay translation" data-testid="button-replay-s2">
                <RotateCcw className="w-3.5 h-3.5 text-secondary/60" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[90%]">
          {lastTurn?.speaker === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-3">
              <p dir="auto" className={`text-xl font-medium leading-snug text-secondary ${['hi', 'mr'].includes(session.speakerTwoLang) ? 'font-devanagari' : ''}`}>{lastTurn.original}</p>
              <p dir="auto" className={`text-xl italic font-medium leading-snug text-secondary/70 ${['hi', 'mr'].includes(session.speakerOneLang) ? 'font-devanagari' : ''}`}>{lastTurn.translated}</p>
            </div>
          )}
          {lastTurn?.speaker === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-3">
              <p dir="auto" className={`text-xl italic font-medium leading-snug text-secondary/70 ${['hi', 'mr'].includes(session.speakerTwoLang) ? 'font-devanagari' : ''}`}>{lastTurn.translated}</p>
            </div>
          )}
        </div>
      </div>

      {/* Mic button */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center z-20">
        <div className="relative">
          {isRecording && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary opacity-30 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-[-10px] rounded-full bg-primary opacity-20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
            </>
          )}
          <button
            disabled={isBusy && !isRecording}
            onClick={handleMicPress}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl shadow-primary/40 border-4 border-white transition-transform active:scale-95 z-10
              ${isRecording ? 'bg-destructive shadow-destructive/40' : isBusy ? 'bg-secondary/30 opacity-60 cursor-not-allowed' : 'bg-primary'}`}
            data-testid="button-record"
          >
            {isBusy && !isRecording ? <Loader2 className="w-8 h-8 text-white animate-spin" />
              : isRecording ? <Square className="w-8 h-8 text-white fill-white" />
              : <Mic className="w-8 h-8 text-white" />}
          </button>

          {phase === 'idle' && (
            <div className={`absolute -top-12 left-1/2 -translate-x-1/2 text-white text-sm font-semibold py-1.5 px-4 rounded-full shadow-lg whitespace-nowrap after:content-[''] after:absolute after:bottom-[-6px] after:left-1/2 after:-translate-x-1/2 after:border-[6px] after:border-transparent ${isSpeaker1Active ? 'bg-secondary after:border-t-secondary' : 'bg-primary after:border-t-primary'}`}>
              {isSpeaker1Active ? session.speakerOneName : session.speakerTwoName}'s turn
            </div>
          )}
          {phase === 'connecting' && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-white text-sm font-semibold py-1.5 px-4 rounded-full shadow-lg whitespace-nowrap bg-secondary/80">
              Connecting…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

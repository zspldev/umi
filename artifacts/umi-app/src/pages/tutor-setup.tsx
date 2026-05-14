import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { LANGUAGES } from '@workspace/languages';
import { getDisplayName } from '@/lib/device';

const SCENARIOS = [
  { id: 'greetings',  label: 'Greetings',   icon: '👋', sub: 'Introductions & small talk' },
  { id: 'restaurant', label: 'Restaurant',  icon: '🍽️', sub: 'Order food & pay the bill' },
  { id: 'transport',  label: 'Transport',   icon: '🚆', sub: 'Trains, taxis & directions' },
  { id: 'shopping',   label: 'Shopping',    icon: '🛍️', sub: 'Browse, ask prices & buy' },
  { id: 'emergency',  label: 'Emergency',   icon: '🆘', sub: 'Get help when things go wrong' },
];

const TUTOR_NAMES: Record<string, string> = {
  ja: 'Yuki', es: 'Elena', fr: 'Léa', hi: 'Arjun', zh: 'Wei',
  de: 'Lukas', ar: 'Layla', mr: 'Priya', ta: 'Kavya', te: 'Ravi',
  pt: 'Beatriz', ru: 'Natasha', en: 'Alex',
};

export type TutorSpeed = 'slow' | 'normal' | 'fast';

const SPEEDS: { id: TutorSpeed; label: string; sub: string }[] = [
  { id: 'slow',   label: 'Slow',   sub: 'Clear & deliberate' },
  { id: 'normal', label: 'Normal', sub: 'Natural pace' },
  { id: 'fast',   label: 'Fast',   sub: 'Challenge yourself' },
];

const LEARN_LANGS = LANGUAGES.filter(l => l.code !== 'auto');
const NATIVE_LANGS = LANGUAGES.filter(l => l.code !== 'auto');

export default function TutorSetup() {
  const [, setLocation] = useLocation();
  const { createSession } = useSessionStore();

  const displayName = getDisplayName();
  const [yourName, setYourName]   = useState(displayName && displayName !== 'Unknown' ? displayName : '');
  const [nativeLang, setNativeLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ja');
  const [scenario, setScenario]   = useState('greetings');
  const [speed, setSpeed]         = useState<TutorSpeed>('normal');

  const tutorName = TUTOR_NAMES[targetLang] ?? 'Kai';
  const targetLabel = LEARN_LANGS.find(l => l.code === targetLang)?.label ?? targetLang;

  const handleStart = () => {
    const id = createSession({
      title: `Learn ${targetLabel} · ${SCENARIOS.find(s => s.id === scenario)?.label ?? scenario}`,
      speakerOneName: yourName.trim() || 'You',
      speakerOneLang: nativeLang,
      speakerOneGender: 'unspecified',
      speakerTwoName: tutorName,
      speakerTwoLang: targetLang,
      speakerTwoGender: 'unspecified',
      mode: 'tutor',
      scenario: `${scenario}::${speed}`,
    });
    setLocation(`/tutor-session?id=${id}`);
  };

  return (
    <div className="h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[40%] bg-primary/10 rounded-[100%] blur-3xl pointer-events-none" />

      <div className="flex-1 flex flex-col p-5 pt-8 pb-4 relative z-10 overflow-y-auto">

        {/* Logo cluster */}
        <div className="flex flex-col items-center mb-5 text-center">
          <img src={`${import.meta.env.BASE_URL}xlango-mark.png`} alt="xlango" className="w-20 h-20 object-contain" style={{ marginBottom: -8 }} />
          <img src={`${import.meta.env.BASE_URL}xlango-wordmark.png`} alt="xlango" className="h-28 object-contain" style={{ marginBottom: 4 }} />
          <p className="text-secondary/60 font-medium tracking-wide uppercase text-xs">Live Language Tutor</p>
          {displayName && displayName !== 'Unknown' && (
            <p className="text-secondary/50 text-sm mt-1">Welcome back, <span className="font-semibold text-secondary/70">{displayName}</span></p>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex bg-white/60 backdrop-blur-sm rounded-xl p-1 gap-1 mb-4 shadow-sm">
          <button
            onClick={() => setLocation('/')}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all text-secondary/50 hover:text-secondary/70"
          >
            Interpret
          </button>
          <button
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all bg-primary text-white shadow"
          >
            Learn
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-4">

          {/* Your info */}
          <Card className="p-4 border-none shadow-md bg-white/80 backdrop-blur-xl rounded-2xl flex flex-col gap-3">
            {!(displayName && displayName !== 'Unknown') && (
              <div className="space-y-1.5">
                <Label htmlFor="your-name" className="text-xs font-medium text-secondary/80">Your Name <span className="text-secondary/40 font-normal">(optional)</span></Label>
                <Input
                  id="your-name"
                  value={yourName}
                  onChange={e => setYourName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="h-10 bg-white/50 text-sm"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-secondary/80">I speak</Label>
              <Select value={nativeLang} onValueChange={setNativeLang}>
                <SelectTrigger className="h-10 bg-white/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NATIVE_LANGS.map(l => (
                    <SelectItem key={l.code} value={l.code}>{l.label} ({l.native})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Target language */}
          <Card className="p-4 border-none shadow-md bg-white/80 backdrop-blur-xl rounded-2xl flex flex-col gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-secondary/80">I want to learn</Label>
              <Select value={targetLang} onValueChange={v => { if (v !== nativeLang) setTargetLang(v); }}>
                <SelectTrigger className="h-10 bg-white/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEARN_LANGS.filter(l => l.code !== nativeLang).map(l => (
                    <SelectItem key={l.code} value={l.code}>{l.label} ({l.native})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tutor preview */}
            <div className="flex items-center gap-3 bg-primary/5 rounded-xl px-3 py-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-base">
                {tutorName[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-secondary">{tutorName}</p>
                <p className="text-xs text-secondary/50">Your {targetLabel} tutor</p>
              </div>
            </div>
          </Card>

          {/* Speaking speed */}
          <Card className="p-4 border-none shadow-md bg-white/80 backdrop-blur-xl rounded-2xl flex flex-col gap-3">
            <Label className="text-xs font-medium text-secondary/80">Tutor Speaking Speed</Label>
            <div className="flex gap-2">
              {SPEEDS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSpeed(s.id)}
                  className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-xl border-2 transition-all
                    ${speed === s.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-white/60 hover:bg-white/90'
                    }`}
                >
                  <span className={`text-sm font-bold ${speed === s.id ? 'text-primary' : 'text-secondary'}`}>{s.label}</span>
                  <span className="text-[10px] text-secondary/40 mt-0.5">{s.sub}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Scenario picker */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-secondary/80 px-1">Choose a Scenario</Label>
            <div className="flex flex-col gap-2">
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                    ${scenario === s.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent bg-white/70 hover:bg-white/90'
                    }`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <p className={`text-sm font-semibold ${scenario === s.id ? 'text-primary' : 'text-secondary'}`}>{s.label}</p>
                    <p className="text-xs text-secondary/50">{s.sub}</p>
                  </div>
                  {scenario === s.id && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Button
            onClick={handleStart}
            className="w-full h-12 text-base font-bold rounded-2xl shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2 group"
          >
            Start Learning with {tutorName}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}

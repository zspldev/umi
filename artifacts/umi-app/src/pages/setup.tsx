import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { History, ArrowRight } from 'lucide-react';
import { useSessionStore, SpeakerGender } from '@/lib/store';
import { LANGUAGES } from '@workspace/languages';
import { getDisplayName } from '@/lib/device';
import { TUTOR_ENABLED } from '@/lib/features';

const GENDERS: { value: SpeakerGender; label: string }[] = [
  { value: 'male',        label: 'Male'   },
  { value: 'female',      label: 'Female' },
  { value: 'unspecified', label: '—'      },
];

function GenderToggle({ value, onChange, accent }: { value: SpeakerGender; onChange: (v: SpeakerGender) => void; accent: 'primary' | 'secondary' }) {
  return (
    <div className="flex gap-1.5">
      {GENDERS.map(g => (
        <button
          key={g.value}
          type="button"
          onClick={() => onChange(g.value)}
          className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-colors
            ${value === g.value
              ? accent === 'primary'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-secondary text-white shadow-sm'
              : 'bg-white/60 text-secondary/60 hover:bg-white/80 hover:text-secondary/80'
            }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

export default function Setup() {
  const [, setLocation] = useLocation();
  const { createSession } = useSessionStore();

  const displayName = getDisplayName();
  
  const [sessionTitle, setSessionTitle] = useState('');
  const [s1Name, setS1Name] = useState(displayName && displayName !== 'Unknown' ? displayName : 'Speaker 1');
  const [s1Lang, setS1Lang] = useState('en');
  const [s1Gender, setS1Gender] = useState<SpeakerGender>('unspecified');
  const [s2Name, setS2Name] = useState('Speaker 2');
  const [s2Lang, setS2Lang] = useState('hi');
  const [s2Gender, setS2Gender] = useState<SpeakerGender>('unspecified');

  const handleStart = () => {
    const id = createSession({
      title: sessionTitle.trim() || undefined,
      speakerOneName: s1Name,
      speakerOneLang: s1Lang,
      speakerOneGender: s1Gender,
      speakerTwoName: s2Name,
      speakerTwoLang: s2Lang,
      speakerTwoGender: s2Gender,
    });
    setLocation(`/session?id=${id}`);
  };

  return (
    <div className="h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[40%] bg-primary/10 rounded-[100%] blur-3xl pointer-events-none" />
      
      <div className="flex-1 flex flex-col p-5 pt-8 pb-4 relative z-10 overflow-y-auto">
        <div className="flex flex-col items-center mb-5 text-center">
          <img
            src={`${import.meta.env.BASE_URL}xlango-mark.png`}
            alt="xlango"
            className="w-20 h-20 object-contain"
            style={{ marginBottom: -8 }}
          />
          <img
            src={`${import.meta.env.BASE_URL}xlango-wordmark.png`}
            alt="xlango"
            className="h-28 object-contain"
            style={{ marginBottom: 4 }}
          />
          <p className="text-secondary/60 font-medium tracking-wide uppercase text-xs">Live Global Voice Interpreter</p>
          {displayName && displayName !== 'Unknown' && (
            <p className="text-secondary/50 text-sm mt-1">Welcome back, <span className="font-semibold text-secondary/70">{displayName}</span></p>
          )}
        </div>

        {/* Mode toggle — Learn tab hidden while TUTOR_ENABLED = false */}
        {TUTOR_ENABLED && (
          <div className="flex bg-white/60 backdrop-blur-sm rounded-xl p-1 gap-1 mb-4 shadow-sm">
            <button
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all bg-secondary text-white shadow"
            >
              Interpret
            </button>
            <button
              onClick={() => setLocation('/tutor-setup')}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all text-secondary/50 hover:text-secondary/70"
            >
              Learn
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col gap-4">
          <Card className="p-4 border-none shadow-md bg-white/80 backdrop-blur-xl rounded-2xl flex flex-col gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="session-title" className="text-xs font-medium text-secondary/80">Session Name <span className="text-secondary/40 font-normal">(optional)</span></Label>
              <Input
                id="session-title"
                value={sessionTitle}
                onChange={e => setSessionTitle(e.target.value)}
                placeholder="e.g. Doctor visit, Meeting with Priya"
                className="h-10 bg-white/50 text-sm"
                data-testid="input-session-title"
              />
            </div>
          </Card>

          <Card className="p-4 border-none shadow-md bg-white/80 backdrop-blur-xl rounded-2xl flex flex-col gap-3">
            <div className="flex items-center gap-3 border-b border-muted/50 pb-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">1</div>
              <h2 className="font-semibold text-base text-secondary">First Speaker</h2>
            </div>
            
            <div className="space-y-3">
              {!(displayName && displayName !== 'Unknown') && (
                <div className="space-y-1.5">
                  <Label htmlFor="user1-name" className="text-xs font-medium text-secondary/80">Your Name</Label>
                  <Input 
                    id="user1-name" 
                    value={s1Name}
                    onChange={e => setS1Name(e.target.value)}
                    className="h-10 bg-white/50 text-sm" 
                    data-testid="input-s1-name"
                  />
                </div>
              )}
              
              <div className="space-y-1.5">
                <Label htmlFor="user1-lang" className="text-xs font-medium text-secondary/80">Language</Label>
                <Select value={s1Lang} onValueChange={setS1Lang}>
                  <SelectTrigger id="user1-lang" className="h-10 bg-white/50 text-sm" data-testid="select-s1-lang">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.code === 'auto' ? 'Auto (Detect)' : `${l.label} (${l.native})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-secondary/80">Gender <span className="text-secondary/40 font-normal">(for grammar)</span></Label>
                <GenderToggle value={s1Gender} onChange={setS1Gender} accent="primary" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border-none shadow-md bg-white/80 backdrop-blur-xl rounded-2xl flex flex-col gap-3">
            <div className="flex items-center gap-3 border-b border-muted/50 pb-3">
              <div className="w-7 h-7 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-sm">2</div>
              <h2 className="font-semibold text-base text-secondary">Second Speaker</h2>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="user2-name" className="text-xs font-medium text-secondary/80">Their Name</Label>
                <Input 
                  id="user2-name" 
                  value={s2Name}
                  onChange={e => setS2Name(e.target.value)}
                  className="h-10 bg-white/50 text-sm" 
                  data-testid="input-s2-name"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="user2-lang" className="text-xs font-medium text-secondary/80">Language</Label>
                <Select value={s2Lang} onValueChange={setS2Lang}>
                  <SelectTrigger id="user2-lang" className="h-10 bg-white/50 text-sm" data-testid="select-s2-lang">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.code === 'auto' ? 'Auto (Detect)' : `${l.label} (${l.native})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-secondary/80">Gender <span className="text-secondary/40 font-normal">(for grammar)</span></Label>
                <GenderToggle value={s2Gender} onChange={setS2Gender} accent="secondary" />
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <Button 
            onClick={handleStart}
            className="w-full h-12 text-base font-bold rounded-2xl shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2 group"
            data-testid="button-start-session"
          >
            Start Session
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <Link href="/history" className="w-full">
            <Button variant="ghost" className="w-full h-10 text-secondary/70 font-medium hover:text-secondary hover:bg-secondary/5 rounded-xl text-sm" data-testid="link-history">
              <History className="w-4 h-4 mr-2" />
              View History
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setDisplayName, setTripCode, markOnboarded } from '@/lib/device';

interface Props {
  onDone: () => void;
}

export default function OnboardingModal({ onDone }: Props) {
  const [name, setName]         = useState('');
  const [tripInput, setTripInput] = useState('');
  const [error, setError]       = useState('');

  const handleJoin = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter your name to continue.'); return; }
    setDisplayName(trimmed);
    if (tripInput.trim()) setTripCode(tripInput.trim().toUpperCase());
    markOnboarded();
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-[390px] bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img
            src={`${import.meta.env.BASE_URL}xlango-mark.png`}
            alt="xlango"
            className="w-16 h-16 object-contain"
            style={{ marginBottom: -4 }}
          />
          <img
            src={`${import.meta.env.BASE_URL}xlango-wordmark.png`}
            alt="xlango"
            className="h-20 object-contain"
          />
        </div>

        <h2 className="text-xl font-bold text-secondary text-center mb-1">Welcome</h2>
        <p className="text-sm text-secondary/55 text-center mb-6">
          Just two quick things before you start.
        </p>

        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="onboard-name" className="text-sm font-semibold text-secondary">
              Your name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="onboard-name"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="e.g. Priya"
              className="h-12 text-base rounded-xl"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="onboard-trip" className="text-sm font-semibold text-secondary">
              Trip code <span className="text-secondary/40 font-normal">(optional)</span>
            </Label>
            <Input
              id="onboard-trip"
              value={tripInput}
              onChange={e => setTripInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="Ask your group admin"
              className="h-12 text-base rounded-xl uppercase tracking-widest"
            />
            <p className="text-xs text-secondary/40 pl-1">
              Links your sessions to your group — add it later in Settings if you don't have it yet.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <Button
            onClick={handleJoin}
            className="w-full h-13 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 text-white mt-2 h-12"
          >
            Let's go →
          </Button>
        </div>
      </div>
    </div>
  );
}

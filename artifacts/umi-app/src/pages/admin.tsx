import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RefreshCw, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { getTripCode } from '@/lib/device';
import { format } from 'date-fns';

const langMap: Record<string, string> = {
  en: 'EN', zh: 'ZH', hi: 'HI', es: 'ES', ar: 'AR', pt: 'PT',
  fr: 'FR', ru: 'RU', ja: 'JA', de: 'DE', mr: 'MR', ta: 'TA', te: 'TE',
};

interface Member {
  deviceId: string; displayName: string;
  sessionCount: number; totalCostUsd: number; lastActiveAt: string;
}
interface DashboardData {
  tripCode: string;
  summary: { memberCount: number; sessionCount: number; totalCostUsd: number };
  members: Member[];
  feedback: Array<{ device_id: string; rating: number; feedback_text: string | null; created_at: string }>;
}
interface MemberSession {
  id: string; from_lang: string; to_lang: string; app_source: string;
  started_at: string; total_cost_usd: number;
}

function PinGate({ onAuth }: { onAuth: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const digits = [1,2,3,4,5,6,7,8,9,'⌫',0,'→'];

  const tap = (d: number | string) => {
    if (d === '⌫') { setPin(p => p.slice(0,-1)); setError(''); }
    else if (d === '→') { if (pin.length >= 4) onAuth(pin); else setError('Enter full PIN'); }
    else if (pin.length < 6) setPin(p => p + d);
  };

  return (
    <div className="h-[100dvh] w-full max-w-[390px] mx-auto flex flex-col items-center justify-center gap-8 p-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-secondary text-center">Admin Dashboard</h1>
        <p className="text-sm text-secondary/50 text-center mt-1">Enter your PIN to continue</p>
      </div>

      {/* PIN dots */}
      <div className="flex gap-4">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${pin.length > i ? 'bg-primary border-primary' : 'border-secondary/30'}`} />
        ))}
      </div>

      {error && <p className="text-sm text-destructive font-medium -mt-4">{error}</p>}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {digits.map((d, i) => (
          <button
            key={i}
            onClick={() => tap(d as number | string)}
            className={`h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95
              ${d === '→' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white shadow-sm border border-muted/50 text-secondary hover:bg-secondary/5'}`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

function MemberCard({ member, pin, tripCode }: { member: Member; pin: string; tripCode: string }) {
  const [expanded, setExpanded] = useState(false);
  const [sessions, setSessions] = useState<MemberSession[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    if (sessions) { setExpanded(e => !e); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sessions?tripCode=${tripCode}&deviceId=${member.deviceId}`, {
        headers: { 'X-Admin-Pin': pin },
      });
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setExpanded(true);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-muted/40 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left active:bg-secondary/5 transition-colors"
        onClick={loadSessions}
      >
        <div className="w-10 h-10 rounded-full bg-primary/15 text-primary font-bold text-lg flex items-center justify-center flex-shrink-0">
          {member.displayName[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-secondary truncate">{member.displayName}</p>
          <p className="text-xs text-secondary/50">{member.sessionCount} sessions · Last active {format(new Date(member.lastActiveAt), 'MMM d, h:mm a')}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-secondary">${member.totalCostUsd.toFixed(3)}</p>
          {loading ? <RefreshCw className="w-4 h-4 text-secondary/40 animate-spin ml-auto mt-1" /> : expanded ? <ChevronUp className="w-4 h-4 text-secondary/40 ml-auto mt-1" /> : <ChevronDown className="w-4 h-4 text-secondary/40 ml-auto mt-1" />}
        </div>
      </button>

      {expanded && sessions && (
        <div className="border-t border-muted/40 px-4 pb-3 pt-2 flex flex-col gap-2">
          {sessions.length === 0 && <p className="text-sm text-secondary/40 py-2 text-center">No sessions yet</p>}
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-muted/30 last:border-0">
              <div>
                <p className="text-sm font-medium text-secondary">
                  {langMap[s.from_lang] ?? s.from_lang} → {langMap[s.to_lang] ?? s.to_lang}
                  <span className="ml-2 text-xs text-secondary/40 font-normal">{s.app_source}</span>
                </p>
                <p className="text-xs text-secondary/40">{format(new Date(s.started_at), 'MMM d, h:mm a')}</p>
              </div>
              <p className="text-sm font-semibold text-secondary">${Number(s.total_cost_usd).toFixed(3)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [pin, setPin]   = useState('');
  const [authed, setAuthed] = useState(false);
  const [tripCode, setTripCode] = useState(getTripCode());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [tab, setTab] = useState<'members' | 'feedback'>('members');

  const handleAuth = async (enteredPin: string) => {
    setError('');
    const tc = tripCode.trim().toUpperCase();
    if (!tc) { setError('Enter a trip code first'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboard?tripCode=${tc}`, {
        headers: { 'X-Admin-Pin': enteredPin },
      });
      if (res.status === 401) { setError('Wrong PIN — try again'); setLoading(false); return; }
      const json = await res.json();
      setPin(enteredPin);
      setData(json);
      setAuthed(true);
    } catch {
      setError('Connection error');
    } finally { setLoading(false); }
  };

  const refresh = async () => {
    if (!pin || !data) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboard?tripCode=${data.tripCode}`, {
        headers: { 'X-Admin-Pin': pin },
      });
      setData(await res.json());
    } finally { setLoading(false); }
  };

  if (!authed) {
    return (
      <div className="h-[100dvh] w-full max-w-[390px] mx-auto font-sans">
        <div className="p-4">
          <button onClick={() => setLocation('/')} className="flex items-center gap-1.5 text-secondary/60 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <div className="px-6 mb-4">
          <label className="text-xs font-semibold text-secondary/70 uppercase tracking-wide block mb-1.5">Trip Code</label>
          <Input
            value={tripCode}
            onChange={e => setTripCode(e.target.value.toUpperCase())}
            placeholder="e.g. MUMBAI25"
            className="h-11 rounded-xl uppercase tracking-widest text-base"
          />
        </div>
        {error && <p className="text-sm text-destructive font-medium text-center mb-4">{error}</p>}
        <PinGate onAuth={handleAuth} />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans overflow-hidden">

      {/* Header */}
      <div className="bg-secondary text-white pt-12 pb-5 px-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setLocation('/')} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <span className="font-bold text-white tracking-widest text-sm">{data?.tripCode}</span>
          <button onClick={refresh} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Members',  value: data?.summary.memberCount  ?? 0 },
            { label: 'Sessions', value: data?.summary.sessionCount ?? 0 },
            { label: 'Cost',     value: `$${(data?.summary.totalCostUsd ?? 0).toFixed(2)}` },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl px-3 py-2.5 text-center">
              <p className="text-white font-bold text-xl">{s.value}</p>
              <p className="text-white/60 text-[11px] font-semibold uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-muted/50 bg-white">
        {(['members', 'feedback'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors
              ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-secondary/50'}`}
          >
            {t}
            {t === 'feedback' && data?.feedback.length ? (
              <span className="ml-1.5 bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{data.feedback.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {tab === 'members' && (data?.members ?? []).map(m => (
          <MemberCard key={m.deviceId} member={m} pin={pin} tripCode={data!.tripCode} />
        ))}

        {tab === 'feedback' && (
          <>
            {(data?.feedback ?? []).length === 0 && (
              <p className="text-center text-secondary/40 text-sm pt-8">No feedback yet</p>
            )}
            {(data?.feedback ?? []).map((f, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-muted/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= f.rating ? 'text-primary fill-primary' : 'text-muted'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-secondary/40">{format(new Date(f.created_at), 'MMM d, h:mm a')}</span>
                </div>
                {f.feedback_text && <p className="text-sm text-secondary leading-relaxed">{f.feedback_text}</p>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

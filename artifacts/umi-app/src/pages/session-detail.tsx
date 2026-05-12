import { useState, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Trash2, Star, Mic, Square, Loader2 } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { trackingHeaders } from '@/lib/device';
import { format } from 'date-fns';

const langMap: Record<string, string> = {
  auto: 'Auto', en: 'English', zh: 'Mandarin', hi: 'Hindi', es: 'Spanish',
  ar: 'Arabic', pt: 'Portuguese', fr: 'French', ru: 'Russian',
  ja: 'Japanese', de: 'German', mr: 'Marathi', ta: 'Tamil', te: 'Telugu',
};

function FeedbackWidget({ sessionId }: { sessionId: string }) {
  const [rating, setRating]         = useState(0);
  const [hovered, setHovered]       = useState(0);
  const [text, setText]             = useState('');
  const [recording, setRecording]   = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        setTranscribing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const b64 = (reader.result as string).split(',')[1];
            const res = await fetch('/api/umi/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...trackingHeaders() },
              body: JSON.stringify({ audioBase64: b64, mimeType: mr.mimeType }),
            });
            const data = await res.json();
            if (data.text) setText(t => t ? `${t} ${data.text}` : data.text);
          };
        } finally { setTranscribing(false); }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch { /* mic denied — ignore */ }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...trackingHeaders() },
        body: JSON.stringify({ sessionId, rating, feedbackText: text.trim() || undefined }),
      });
      setSubmitted(true);
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="text-center py-4">
        <p className="text-2xl mb-1">🙏</p>
        <p className="text-sm font-semibold text-secondary">Thank you for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-secondary/70">How was this session?</p>

      {/* Stars */}
      <div className="flex gap-2">
        {[1,2,3,4,5].map(s => (
          <button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 transition-transform active:scale-90"
          >
            <Star className={`w-7 h-7 transition-colors ${s <= (hovered || rating) ? 'text-primary fill-primary' : 'text-muted stroke-secondary/30'}`} />
          </button>
        ))}
      </div>

      {/* Text + mic */}
      <div className="relative">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a note… (optional)"
          rows={2}
          className="w-full rounded-xl border border-muted/60 bg-white/70 px-3 py-2.5 text-sm text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 pr-12"
        />
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={transcribing}
          className={`absolute right-2.5 bottom-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all
            ${recording ? 'bg-destructive text-white animate-pulse' : 'bg-secondary/10 text-secondary hover:bg-secondary/20'}`}
        >
          {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : recording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-4 h-4" />}
        </button>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!rating || submitting}
        className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold disabled:opacity-40"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Feedback'}
      </Button>
    </div>
  );
}

export default function SessionDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { getSession, deleteSession, loaded } = useSessionStore();

  const session = params.id ? getSession(params.id) : undefined;

  if (!loaded) {
    return <div className="min-h-[100dvh] flex items-center justify-center" />;
  }

  if (!session) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center">
        <p>Session not found</p>
        <Button onClick={() => setLocation('/history')} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const date = new Date(session.createdAt);
  const displayTitle = session.title || `${session.speakerOneName} & ${session.speakerTwoName}`;

  const handleExport = () => {
    const text = session.turns.map(t => {
      const speakerName = t.speaker === 1 ? session.speakerOneName : session.speakerTwoName;
      return `[${speakerName}]: ${t.original}\n[Translation]: ${t.translated}\n`;
    }).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `session-${session.id}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    deleteSession(session.id);
    setLocation('/history');
  };

  return (
    <div className="h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans overflow-hidden">
      <div className="bg-secondary text-white pt-14 pb-6 px-6 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost" size="icon"
            onClick={() => setLocation('/history')}
            className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            data-testid="button-back-history"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium text-white/70">
            {format(date, "MMM d, yyyy")} • {format(date, "h:mm a")}
          </span>
          <div className="w-10" />
        </div>

        <div className="text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-white/90 text-sm font-semibold tracking-wide mb-2">
            {session.mode === 'tutor' ? '📚 Learn' : '🔄 Interpret'} · {langMap[session.speakerOneLang]} → {langMap[session.speakerTwoLang]}
          </div>
          <h1 className="text-2xl font-bold">{displayTitle}</h1>
          {session.title && (
            <p className="text-sm text-white/60 mt-1">{session.speakerOneName} & {session.speakerTwoName}</p>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 pb-4">
        {session.turns.map((turn) => {
          const isSpeakerOne = turn.speaker === 1;
          const speakerName = isSpeakerOne ? session.speakerOneName : session.speakerTwoName;
          const lang = isSpeakerOne ? session.speakerOneLang : session.speakerTwoLang;

          return (
            <div key={turn.id} className={`flex flex-col max-w-[85%] ${!isSpeakerOne ? 'self-end items-end' : 'self-start items-start'}`}>
              <span className="text-xs font-semibold text-secondary/50 mb-1 px-1">{speakerName}</span>
              <div className={`p-4 rounded-2xl ${!isSpeakerOne ? 'bg-primary text-white rounded-tr-sm' : 'bg-white shadow-sm border border-muted/50 text-secondary rounded-tl-sm'}`}>
                <p dir="auto" className={`text-base font-medium mb-2 pb-2 border-b ${!isSpeakerOne ? 'border-white/20' : 'border-muted'} ${['hi','mr'].includes(lang) ? 'font-devanagari' : ''}`}>
                  {turn.original}
                </p>
                {turn.translated ? (
                  <p dir="auto" className={`text-base italic font-medium ${!isSpeakerOne ? 'text-white/80' : 'text-secondary/70'} ${['hi','mr'].includes(isSpeakerOne ? session.speakerTwoLang : session.speakerOneLang) ? 'font-devanagari' : ''}`}>
                    {turn.translated}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 bg-white border-t border-muted/50 p-5 flex flex-col gap-4 pb-8">
        <FeedbackWidget sessionId={session.id} />
        <div className="flex gap-2 pt-1">
          <Button onClick={handleExport} className="flex-1 h-11 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-semibold text-sm" data-testid="button-export">
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          <Button onClick={handleDelete} variant="ghost" className="flex-1 h-11 rounded-xl text-destructive hover:bg-destructive/10 font-semibold text-sm" data-testid="button-delete-session">
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

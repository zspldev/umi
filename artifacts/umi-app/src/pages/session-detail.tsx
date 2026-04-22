import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { format } from 'date-fns';

const langMap: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  es: 'Spanish',
  ja: 'Japanese',
  de: 'German'
};

export default function SessionDetail() {
  const params = useParams();
  const [loc, setLocation] = useLocation();
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

  const handleExport = () => {
    const text = session.turns.map(t => {
      const speakerName = t.speaker === 1 ? session.speakerOneName : session.speakerTwoName;
      return `[${speakerName}]: ${t.original}\n[Translation]: ${t.translated}\n`;
    }).join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${session.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    deleteSession(session.id);
    setLocation('/history');
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans">
      <div className="bg-secondary text-white pt-14 pb-6 px-6 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
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
            {langMap[session.speakerOneLang]} → {langMap[session.speakerTwoLang]}
          </div>
          <h1 className="text-2xl font-bold">{session.speakerOneName} & {session.speakerTwoName}</h1>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 pb-40">
        {session.turns.map((turn) => {
          const isSpeakerOne = turn.speaker === 1;
          const speakerName = isSpeakerOne ? session.speakerOneName : session.speakerTwoName;
          const lang = isSpeakerOne ? session.speakerOneLang : session.speakerTwoLang;
          
          return (
            <div key={turn.id} className={`flex flex-col max-w-[85%] ${!isSpeakerOne ? 'self-end items-end' : 'self-start items-start'}`}>
              <span className="text-xs font-semibold text-secondary/50 mb-1 px-1">
                {speakerName}
              </span>
              <div className={`p-4 rounded-2xl ${!isSpeakerOne ? 'bg-primary text-white rounded-tr-sm' : 'bg-white shadow-sm border border-muted/50 text-secondary rounded-tl-sm'}`}>
                <p dir="auto" className={`text-sm opacity-70 mb-2 pb-2 border-b ${!isSpeakerOne ? 'border-white/20' : 'border-muted'} ${['hi', 'mr'].includes(lang) ? "font-devanagari" : ""}`}>
                  {turn.original}
                </p>
                <p dir="auto" className={`text-base font-medium ${['hi', 'mr'].includes(isSpeakerOne ? session.speakerTwoLang : session.speakerOneLang) ? "font-devanagari" : ""}`}>
                  {turn.translated}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-0 w-full bg-white border-t border-muted/50 p-6 flex flex-col gap-3 z-20 pb-8">
        <Button onClick={handleExport} className="w-full h-12 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-semibold" data-testid="button-export">
          <Download className="w-4 h-4 mr-2" />
          Export as Text
        </Button>
        <Button onClick={handleDelete} variant="ghost" className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/10 font-semibold" data-testid="button-delete-session">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Session
        </Button>
      </div>
    </div>
  );
}

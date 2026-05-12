import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Trash2, MessageSquare, Clock, Globe, Archive } from 'lucide-react';
import { useSessionStore } from '@/lib/store';
import { format } from 'date-fns';

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

export default function History() {
  const [, setLocation] = useLocation();
  const { sessions, deleteSession } = useSessionStore();

  return (
    <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans">
      <div className="pt-14 pb-4 px-6 bg-white border-b border-muted/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            className="w-10 h-10 rounded-full bg-secondary/5 text-secondary hover:bg-secondary/10"
            data-testid="button-back-setup"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-secondary">Session History</h1>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto pb-10">
        {sessions.length === 0 ? (
          <div className="text-center mt-20">
            <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-semibold text-secondary">No sessions yet</h2>
            <p className="text-sm text-muted-foreground">Start a session to see it here.</p>
          </div>
        ) : (
          sessions.map(session => {
            const date = new Date(session.createdAt);
            const displayTitle = session.title || `${session.speakerOneName} & ${session.speakerTwoName}`;
            const isLearn = session.mode === 'tutor';
            return (
              <Card
                key={session.id}
                className="p-5 border-none shadow-sm bg-white rounded-2xl flex flex-col gap-4 relative group hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-primary/20"
                onClick={() => setLocation(`/history/${session.id}`)}
                data-testid={`card-session-${session.id}`}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-20"
                  data-testid={`button-delete-${session.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-secondary/50 uppercase tracking-wide flex-1">
                    <Clock className="w-3.5 h-3.5" />
                    {format(date, "MMM d, yyyy")} • {format(date, "h:mm a")}
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    isLearn
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary/10 text-secondary'
                  }`}>
                    {isLearn ? '📚 Learn' : '🔄 Interpret'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-primary font-medium text-sm">
                    <Globe className="w-4 h-4" />
                    {langMap[session.speakerOneLang] ?? session.speakerOneLang} → {langMap[session.speakerTwoLang] ?? session.speakerTwoLang}
                  </div>
                  <h3 className="text-lg font-bold text-secondary pr-10">{displayTitle}</h3>
                  {session.title && (
                    <p className="text-sm text-secondary/50">{session.speakerOneName} & {session.speakerTwoName}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-muted/50">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary/5 text-secondary/70">
                    <MessageSquare className="w-3 h-3" />
                  </div>
                  <span className="text-sm font-medium text-secondary/70">{session.turns.length} turns recorded</span>
                </div>
              </Card>
            );
          })
        )}

        <div className="mt-8 text-center px-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary/5 text-secondary/40 mb-3">
            <Archive className="w-6 h-6" />
          </div>
          <p className="text-sm text-secondary/50 font-medium">
            Sessions are stored securely on this device only.
          </p>
        </div>
      </div>
    </div>
  );
}

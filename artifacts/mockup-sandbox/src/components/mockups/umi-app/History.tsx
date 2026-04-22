import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Trash2, MessageSquare, Clock, Globe } from 'lucide-react';

export function History() {
  const sessions = [
    {
      id: 1,
      date: "April 22, 2026",
      time: "3:45 PM",
      langs: "Hindi → English",
      speakers: "Arjun & Sarah",
      turns: 8
    },
    {
      id: 2,
      date: "April 20, 2026",
      time: "11:30 AM",
      langs: "Japanese → English",
      speakers: "Kenji & Sarah",
      turns: 24
    },
    {
      id: 3,
      date: "April 18, 2026",
      time: "6:15 PM",
      langs: "Spanish → English",
      speakers: "Mateo & Sarah",
      turns: 12
    }
  ];

  return (
    <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans">
      
      {/* Header */}
      <div className="pt-14 pb-4 px-6 bg-white border-b border-muted/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-secondary/5 text-secondary hover:bg-secondary/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-secondary">Session History</h1>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto pb-10">
        {sessions.map(session => (
          <Card key={session.id} className="p-5 border-none shadow-sm bg-white rounded-2xl flex flex-col gap-4 relative group hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-primary/20">
            
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 w-8 h-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2 text-xs font-semibold text-secondary/50 uppercase tracking-wide">
              <Clock className="w-3.5 h-3.5" />
              {session.date} • {session.time}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Globe className="w-4 h-4" />
                {session.langs}
              </div>
              <h3 className="text-lg font-bold text-secondary">
                {session.speakers}
              </h3>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-muted/50">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary/5 text-secondary/70">
                <MessageSquare className="w-3 h-3" />
              </div>
              <span className="text-sm font-medium text-secondary/70">{session.turns} turns recorded</span>
            </div>
          </Card>
        ))}

        <div className="mt-8 text-center px-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary/5 text-secondary/40 mb-3">
            <History className="w-6 h-6" />
          </div>
          <p className="text-sm text-secondary/50 font-medium">
            Sessions are stored securely on this device only.
          </p>
        </div>
      </div>

    </div>
  );
}
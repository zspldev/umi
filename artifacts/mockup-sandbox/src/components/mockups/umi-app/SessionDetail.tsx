import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';

export function SessionDetail() {
  const turns = [
    {
      id: 1,
      speaker: "Arjun",
      lang: "hi",
      original: "नमस्ते, मुझे डॉक्टर से मिलना है। मेरी 3 बजे की अपॉइंटमेंट है।",
      translated: "Hello, I need to see the doctor. I have an appointment at 3 PM.",
      isMe: false
    },
    {
      id: 2,
      speaker: "Sarah",
      lang: "en",
      original: "Hello Arjun. Yes, I see your name here. Please take a seat, the doctor will be with you shortly.",
      translated: "नमस्ते अर्जुन। हाँ, मैं यहाँ आपका नाम देख सकती हूँ। कृपया बैठ जाएँ, डॉक्टर जल्द ही आपसे मिलेंगे।",
      isMe: true
    },
    {
      id: 3,
      speaker: "Arjun",
      lang: "hi",
      original: "धन्यवाद। क्या मुझे कोई फॉर्म भरना होगा?",
      translated: "Thank you. Do I need to fill out any forms?",
      isMe: false
    },
    {
      id: 4,
      speaker: "Sarah",
      lang: "en",
      original: "Yes, just this brief medical history form.",
      translated: "हाँ, बस यह संक्षिप्त चिकित्सा इतिहास फॉर्म।",
      isMe: true
    }
  ];

  return (
    <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans">
      
      {/* Header */}
      <div className="bg-secondary text-white pt-14 pb-6 px-6 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium text-white/70">April 22, 2026 • 3:45 PM</span>
          <div className="w-10" /> {/* spacer for alignment */}
        </div>

        <div className="text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-white/90 text-sm font-semibold tracking-wide mb-2">
            Hindi → English
          </div>
          <h1 className="text-2xl font-bold">Arjun & Sarah</h1>
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 pb-32">
        {turns.map((turn) => (
          <div key={turn.id} className={`flex flex-col max-w-[85%] ${turn.isMe ? 'self-end items-end' : 'self-start items-start'}`}>
            <span className="text-xs font-semibold text-secondary/50 mb-1 px-1">
              {turn.speaker}
            </span>
            <div className={`p-4 rounded-2xl ${turn.isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-white shadow-sm border border-muted/50 text-secondary rounded-tl-sm'}`}>
              <p className={`text-sm opacity-70 mb-2 pb-2 border-b ${turn.isMe ? 'border-white/20' : 'border-muted'} ${turn.lang === 'hi' && !turn.isMe ? "font-['Noto_Sans_Devanagari']" : ""}`}>
                {turn.original}
              </p>
              <p className={`text-base font-medium ${turn.lang === 'en' && !turn.isMe ? "font-['Noto_Sans_Devanagari']" : ""}`}>
                {turn.translated}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="absolute bottom-0 w-full bg-white border-t border-muted/50 p-6 flex flex-col gap-3 z-20 pb-8">
        <Button className="w-full h-12 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-semibold">
          <Download className="w-4 h-4 mr-2" />
          Export as Text
        </Button>
        <Button variant="ghost" className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/10 font-semibold">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Session
        </Button>
      </div>

    </div>
  );
}
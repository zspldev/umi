import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, X, Volume2, Loader2, ArrowRightLeft } from 'lucide-react';

export function Interpreter() {
  return (
    <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans relative overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-0 w-full z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/20 to-transparent">
        <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-semibold tracking-wide border border-white/10 flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          Live Session
        </div>
        <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 rounded-full h-9 px-4 font-medium backdrop-blur-md bg-white/10 border border-white/10">
          End Session
          <X className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Speaker 1 Panel (Top) - Dark Navy */}
      <div className="flex-1 bg-secondary text-white p-6 pt-20 flex flex-col relative pb-10">
        <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 z-10 bg-white shadow-xl rounded-full p-1.5 border border-muted/20">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ArrowRightLeft className="w-5 h-5 rotate-90" />
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Speaker 1 • Hindi</span>
            <span className="text-lg font-bold text-white">Arjun</span>
          </div>
          <div className="px-3 py-1 bg-white/10 rounded-full text-white/90 text-sm font-medium flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Transcribing...
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[90%]">
          <p className="text-3xl font-medium leading-snug text-white opacity-90 font-['Noto_Sans_Devanagari'] animate-in fade-in slide-in-from-bottom-2 duration-500">
            नमस्ते, आप कैसे हैं?
          </p>
        </div>
      </div>

      {/* Speaker 2 Panel (Bottom) - Light Theme */}
      <div className="flex-1 bg-[#F8F9FA] text-secondary p-6 pt-10 flex flex-col relative pb-24">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <span className="text-secondary/50 text-xs font-semibold uppercase tracking-wider mb-1">Speaker 2 • English</span>
            <span className="text-lg font-bold text-secondary">Sarah</span>
          </div>
          <div className="px-3 py-1 bg-secondary/5 rounded-full text-secondary/70 text-sm font-medium flex items-center gap-1.5">
            <Volume2 className="w-4 h-4" />
            Ready
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[90%]">
          <p className="text-2xl font-medium leading-snug text-secondary/80">
            Hello, how are you?
          </p>
        </div>
      </div>

      {/* Record Button Container */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center z-20">
        <div className="relative">
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full bg-primary opacity-30 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-[-10px] rounded-full bg-primary opacity-20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
          
          <button className="relative w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-xl shadow-primary/40 border-4 border-white transition-transform active:scale-95 z-10">
            <Mic className="w-8 h-8 text-white" />
          </button>
          
          {/* Turn indicator bubble */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-secondary text-white text-sm font-semibold py-1.5 px-4 rounded-full shadow-lg whitespace-nowrap after:content-[''] after:absolute after:bottom-[-6px] after:left-1/2 after:-translate-x-1/2 after:border-[6px] after:border-transparent after:border-t-secondary">
            Your turn
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Globe2, History, ArrowRight } from 'lucide-react';
import { useSessionStore } from '@/lib/store';

export default function Setup() {
  const [loc, setLocation] = useLocation();
  const { createSession } = useSessionStore();
  
  const [s1Name, setS1Name] = useState('Speaker 1');
  const [s1Lang, setS1Lang] = useState('en');
  const [s2Name, setS2Name] = useState('Speaker 2');
  const [s2Lang, setS2Lang] = useState('hi');

  const handleStart = () => {
    const id = createSession({
      speakerOneName: s1Name,
      speakerOneLang: s1Lang,
      speakerTwoName: s2Name,
      speakerTwoLang: s2Lang
    });
    setLocation(`/session?id=${id}`);
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[40%] bg-primary/10 rounded-[100%] blur-3xl pointer-events-none" />
      
      <div className="flex-1 flex flex-col p-6 pt-16 pb-8 relative z-10 overflow-y-auto">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-6 text-white">
            <Globe2 className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-secondary mb-2">UMI</h1>
          <p className="text-secondary/70 font-medium tracking-wide uppercase text-sm">Universal Interpreter</p>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <Card className="p-5 border-none shadow-md bg-white/80 backdrop-blur-xl rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-muted/50 pb-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">1</div>
              <h2 className="font-semibold text-lg text-secondary">First Speaker</h2>
            </div>
            
            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label htmlFor="user1-name" className="text-sm font-medium text-secondary/80">Your Name</Label>
                <Input 
                  id="user1-name" 
                  value={s1Name}
                  onChange={e => setS1Name(e.target.value)}
                  className="h-12 bg-white/50 text-base" 
                  data-testid="input-s1-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user1-lang" className="text-sm font-medium text-secondary/80">Language</Label>
                <Select value={s1Lang} onValueChange={setS1Lang}>
                  <SelectTrigger id="user1-lang" className="h-12 bg-white/50 text-base" data-testid="select-s1-lang">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi (हिंदी)</SelectItem>
                    <SelectItem value="mr">Marathi (मराठी)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-none shadow-md bg-white/80 backdrop-blur-xl rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-muted/50 pb-4">
              <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold">2</div>
              <h2 className="font-semibold text-lg text-secondary">Second Speaker</h2>
            </div>
            
            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label htmlFor="user2-name" className="text-sm font-medium text-secondary/80">Their Name</Label>
                <Input 
                  id="user2-name" 
                  value={s2Name}
                  onChange={e => setS2Name(e.target.value)}
                  className="h-12 bg-white/50 text-base" 
                  data-testid="input-s2-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user2-lang" className="text-sm font-medium text-secondary/80">Language</Label>
                <Select value={s2Lang} onValueChange={setS2Lang}>
                  <SelectTrigger id="user2-lang" className="h-12 bg-white/50 text-base" data-testid="select-s2-lang">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi (हिंदी)</SelectItem>
                    <SelectItem value="mr">Marathi (मराठी)</SelectItem>
                    <SelectItem value="es">Spanish (Español)</SelectItem>
                    <SelectItem value="ja">Japanese (日本語)</SelectItem>
                    <SelectItem value="de">German (Deutsch)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-10 flex flex-col gap-4">
          <Button 
            onClick={handleStart}
            className="w-full h-16 text-lg font-bold rounded-2xl shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2 group"
            data-testid="button-start-session"
          >
            Start Session
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <Link href="/history" className="w-full">
            <Button variant="ghost" className="w-full h-12 text-secondary/70 font-medium hover:text-secondary hover:bg-secondary/5 rounded-xl" data-testid="link-history">
              <History className="w-4 h-4 mr-2" />
              View History
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Globe2, History, ArrowRight } from 'lucide-react';

export function Setup() {
  return (
    <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-background flex flex-col font-sans relative overflow-hidden">
      {/* Decorative background element */}
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
                <Input id="user1-name" defaultValue="Speaker 1" className="h-12 bg-white/50 text-base" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user1-lang" className="text-sm font-medium text-secondary/80">Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger id="user1-lang" className="h-12 bg-white/50 text-base">
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
                <Input id="user2-name" defaultValue="Speaker 2" className="h-12 bg-white/50 text-base" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user2-lang" className="text-sm font-medium text-secondary/80">Language</Label>
                <Select defaultValue="hi">
                  <SelectTrigger id="user2-lang" className="h-12 bg-white/50 text-base">
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
          <Button className="w-full h-16 text-lg font-bold rounded-2xl shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2 group">
            Start Session
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <Button variant="ghost" className="w-full h-12 text-secondary/70 font-medium hover:text-secondary hover:bg-secondary/5 rounded-xl">
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
        </div>
      </div>
    </div>
  );
}
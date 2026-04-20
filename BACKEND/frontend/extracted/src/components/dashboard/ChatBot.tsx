import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, Send, User, Bot, RefreshCw, Trash2, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: "Hello! I am AURIX AI, your cybersecurity assistant. How can I help you secure your system today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key is not configured. Please set VITE_GEMINI_API_KEY in the environment.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Construct history for multi-turn chat
      const history = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history,
          { role: 'user', parts: [{ text: input }] }
        ],
        config: {
          systemInstruction: "You are AURIX AI, a specialized cybersecurity assistant for the AURIX platform. Help users analyze threats, understand system logs, and make clear, responsible security decisions. Be technical but accessible, prioritize safety, and explain platform features such as Recycle Bin or Threat Analysis in the context of AURIX.",
          temperature: 0.7,
        }
      });

      const botMessage: ChatMessage = {
        role: 'model',
        text: response.text || "I'm sorry, I couldn't process that request.",
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: "Error connecting to AI core. Please check your connection and try again.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BrainCircuit className="text-primary" />
            AI Insights Chat
          </h2>
          <p className="text-muted-foreground">Interact with AURIX AI for real-time security analysis.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setMessages([{
            role: 'model',
            text: "Hello! I am AURIX AI, your cybersecurity assistant. How can I help you secure your system today?",
            timestamp: new Date().toISOString()
          }])}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reset Chat
        </Button>
      </div>

      <Card className="flex-1 glass border-white/5 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`space-y-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-none shadow-[0_0_20px_rgba(0,242,255,0.2)]' 
                          : 'glass border-white/10 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Bot className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="p-4 rounded-2xl glass border-white/10 rounded-tl-none flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-white/5 bg-white/5">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-3"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AURIX AI about threats, logs, or security tips..."
                className="flex-1 bg-white/5 border-white/10 focus:border-primary/50"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="gap-2 px-6"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </Button>
            </form>
            <div className="mt-4 flex items-center gap-4 text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                Gemini 3.1 Flash
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI Core Active
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

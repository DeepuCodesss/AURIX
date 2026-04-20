import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Key, AlertCircle, Fingerprint } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
  onSignUp: () => void;
  registeredUsers: { email: string; password: string }[];
}

export const Login: React.FC<LoginProps> = ({ onLogin, onSignUp, registeredUsers }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Strict validation: Only allow explicitly registered users, OR the default terminal root operator if nothing is registered.
    const isValid = registeredUsers.some(u => u.email === email && u.password === password);
    const isRootFallback = (registeredUsers.length === 0) && (email === 'commander@aurix.ai');

    if (!isValid && !isRootFallback) {
      setError('ACCESS DENIED: Credentials not found in the AURIX command registry.');
      return;
    }

    setIsAuthenticating(true);
    setTimeout(() => {
      onLogin(email);
    }, 1500);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@200;300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .quantum-gradient {
            background: linear-gradient(135deg, #83aeff 0%, #c180ff 100%);
        }
        .quantum-gradient-text {
            background: linear-gradient(135deg, #83aeff 0%, #c180ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            color: transparent;
        }
        .glass-panel {
            background: rgba(44, 44, 45, 0.6);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(72, 72, 73, 0.15);
        }
        .grid-bg-aurix {
            background-image: radial-gradient(circle at 2px 2px, rgba(72, 72, 73, 0.1) 1px, transparent 0);
            background-size: 40px 40px;
        }
      `}</style>
      
      <div 
         className="bg-[#0e0e0f] text-[#ffffff] min-h-screen flex flex-col overflow-x-hidden selection:bg-primary/30" 
         style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {/* Ambient Glow Effects */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none grid-bg-aurix z-0"></div>
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#83aeff]/5 rounded-full blur-[120px] z-0"></div>
        <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#c180ff]/10 rounded-full blur-[100px] z-0"></div>
        <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#00f1fe]/10 rounded-full blur-[100px] z-0 opacity-50"></div>

        {/* Top Navigation Anchor */}
        <header className="w-full z-50 flex justify-center items-center py-6 px-8 bg-gradient-to-b from-[#0e0e0f] to-transparent">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#4D8AF0] text-3xl">shield</span>
            <h1 className="font-black tracking-widest text-[#4D8AF0] uppercase text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AURIX</h1>
          </div>
        </header>

        {/* Main Content Canvas */}
        <main className="relative z-10 w-full max-w-[1200px] mx-auto px-6 py-12 flex-grow flex flex-col md:flex-row items-center justify-between gap-12 lg:gap-24">
          
          {/* Left Side: Editorial Authority */}
          <div className="hidden md:flex flex-col max-w-lg space-y-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#262627] rounded-full border border-[#484849]/15">
                <span className="w-1.5 h-1.5 rounded-full bg-[#99f7ff] shadow-[0_0_8px_rgba(153,247,255,0.8)]"></span>
                <span className="text-[#99f7ff] text-[10px] uppercase tracking-tighter" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>System Core v4.2.0 Active</span>
              </span>
              
              <h2 className="text-6xl lg:text-7xl font-bold tracking-tighter leading-tight text-[#ffffff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  THE <br/> <span className="quantum-gradient-text">AURIX</span> <br/> COMMAND.
              </h2>
              
              <p className="text-[#adaaab] text-lg leading-relaxed max-w-sm">
                  Access the sovereign perimeter of your digital ecosystem. Authenticate to enter the AURIX command center.
              </p>
            </div>
            
            <div className="flex gap-12 pt-8">
              <div className="flex flex-col">
                <span className="font-bold text-3xl text-[#ffffff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>99.9%</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Threat Mitigation</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-3xl text-[#ffffff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>0ms</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Latency Overhead</span>
              </div>
            </div>
          </div>
          
          {/* Right Side: Secure Login Form */}
          <div className="w-full max-w-md">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8 }}
               className="glass-panel p-8 md:p-10 rounded-xl relative overflow-hidden"
            >
              {/* Decorative Corner Element */}
              <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-20">
                <div className="absolute top-4 right-4 border-t-2 border-r-2 border-[#83aeff] w-4 h-4"></div>
              </div>
              
              <div className="space-y-2 mb-8 relative">
                <h3 className="text-2xl font-bold text-[#ffffff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Secure Login</h3>
                <p className="text-[#adaaab] text-sm">Enter your credentials to bypass the sentinel.</p>
              </div>
              
              <form className="space-y-6" onSubmit={handleLogin}>
                {error && (
                  <div className="bg-[#ff716c]/10 border border-[#ff716c]/30 text-[#ff716c] p-3 rounded text-[11px] uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-[#adaaab] ml-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }} htmlFor="email">Email</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#767576] text-sm group-focus-within:text-[#83aeff] transition-colors">alternate_email</span>
                    <input 
                      required
                      className="w-full bg-[#000000] border-none rounded-sm py-4 pl-12 pr-4 text-[#ffffff] placeholder:text-[#767576]/40 focus:ring-0 border-b-2 border-transparent focus:border-[#83aeff] transition-all text-sm outline-none" 
                      id="email" 
                      placeholder="commander@aurix.ai" 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] uppercase tracking-widest text-[#adaaab] ml-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }} htmlFor="password">Password</label>
                    <button type="button" onClick={() => alert('Password reset protocol initiated. Please check your recovery email.')} className="text-[10px] uppercase tracking-widest text-[#83aeff] hover:text-[#c180ff] transition-colors duration-300" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Forgot Password?</button>
                  </div>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#767576] text-sm group-focus-within:text-[#83aeff] transition-colors">lock</span>
                    <input 
                      required
                      className="w-full bg-[#000000] border-none rounded-sm py-4 pl-12 pr-4 text-[#ffffff] placeholder:text-[#767576]/40 focus:ring-0 border-b-2 border-transparent focus:border-[#83aeff] transition-all text-sm outline-none tracking-widest" 
                      id="password" 
                      placeholder="••••••••••••" 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <button 
                   className="w-full quantum-gradient text-[#002d64] font-bold py-4 flex items-center justify-center gap-2 rounded-lg uppercase tracking-widest text-sm shadow-[0_10px_20px_rgba(131,174,255,0.2)] hover:shadow-[0_10px_25px_rgba(193,128,255,0.3)] transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50" 
                   style={{ fontFamily: "'Space Grotesk', sans-serif" }} 
                   type="submit"
                   disabled={isAuthenticating}
                >
                   {isAuthenticating ? "AUTHENTICATING..." : "Sign In"}
                </button>
              </form>
              
              <div className="mt-8 pt-8 border-t border-[#484849]/15 flex flex-col items-center gap-4">
                <p className="text-[#adaaab] text-xs">Don't have an account? <button type="button" onClick={onSignUp} className="text-[#c180ff] font-bold hover:underline">Sign Up</button></p>
                
                {/* SSO Options */}
                <div className="flex gap-4 w-full">
                  <button type="button" onClick={onSignUp} className="flex-1 flex items-center justify-center py-2 px-4 rounded border border-[#484849]/30 hover:bg-[#201f21] transition-colors text-[#ffffff] text-xs uppercase tracking-tighter" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <span className="material-symbols-outlined mr-2 scale-75">key</span> SSO
                  </button>
                  <button type="button" onClick={onSignUp} className="flex-1 flex items-center justify-center py-2 px-4 rounded border border-[#484849]/30 hover:bg-[#201f21] transition-colors text-[#ffffff] text-xs uppercase tracking-tighter" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <span className="material-symbols-outlined mr-2 scale-75">fingerprint</span> Biometric
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Visual Element: Large Background Icon */}
        <div className="fixed -bottom-40 -left-40 opacity-5 pointer-events-none select-none z-0">
          <span className="material-symbols-outlined text-[600px]">security</span>
        </div>

        {/* Footer Content */}
        <footer className="w-full z-50 flex flex-col md:flex-row justify-between items-center px-12 py-8 bg-transparent mt-auto">
          <div className="text-[10px] uppercase tracking-widest text-[#767576] mb-4 md:mb-0">
             © 2026 AURIX. AI CYBER DEFENSE.
          </div>
          <div className="flex gap-8">
            <a className="text-[10px] uppercase tracking-widest text-[#767576] hover:text-[#83aeff] transition-colors" href="#">Privacy Protocol</a>
            <a className="text-[10px] uppercase tracking-widest text-[#767576] hover:text-[#83aeff] transition-colors" href="#">Terms of Engagement</a>
            <a className="text-[10px] uppercase tracking-widest text-[#767576] hover:text-[#83aeff] transition-colors" href="#">System Status</a>
          </div>
        </footer>
      </div>
    </>
  );
};

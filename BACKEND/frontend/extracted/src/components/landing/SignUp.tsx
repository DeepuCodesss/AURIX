import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, PersonStanding, Mail, Lock, KeyRound, ArrowRight } from 'lucide-react';

interface SignUpProps {
  onSignIn: () => void;
  onSignUpComplete: (user: { email: string; password: string }) => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onSignIn, onSignUpComplete }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsRegistering(true);
    setTimeout(() => {
      onSignUpComplete({ email, password });
    }, 1500);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@200;300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
        }
        .glass-card {
            background: rgba(32, 31, 33, 0.6);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(72, 72, 73, 0.15);
        }
        .quantum-gradient {
            background: linear-gradient(135deg, #83aeff 0%, #c180ff 100%);
        }
        .input-glow:focus {
            box-shadow: 0 1px 0 0 #83aeff;
        }
      `}</style>

      <div 
         className="bg-[#0e0e0f] text-[#ffffff] min-h-screen flex flex-col relative overflow-x-hidden selection:bg-primary/30" 
         style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {/* Background Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#83aeff]/5 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#c180ff]/5 rounded-full blur-[120px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] grayscale pointer-events-none" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC_MQMCCxeErLQgjMlljC4RSlCKxLdv2_kHD3fpCtsSzrx-FcsxR5faNtze-lRMebsVNJVI6Y6sWa8rUolSVZXBecHWaUssTQSyvO-WkgFrEsD8P8Jk4f0YhXO8ReyA8vSpidEpG6hllB4o8ufrkfJtvFrVa4YdUQs_cvdt8K3HGhVzxRToiWI0-pIDkvrcrba5QegQ-DaLYw7CHQ3ddAuXhET-_vZ4RlkxqFndNqGE5yYKdmN310hoVVtT_ZVHQaA5kxknUo6povAC')" }}></div>
        </div>

        {/* Top Navigation Anchor */}
        <header className="w-full z-50 bg-gradient-to-b from-[#0e0e0f] to-transparent">
          <div className="flex justify-center items-center w-full py-6 px-8">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#4D8AF0] text-3xl">shield</span>
              <h1 className="font-black tracking-widest text-[#4D8AF0] uppercase text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AURIX</h1>
            </div>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center py-12 px-6 z-10 w-full">
          <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mx-auto">
            
            {/* Left Side: Editorial Content */}
            <div className="hidden lg:block space-y-8 pr-12 border-r border-[#484849]/10">
              <div className="space-y-4">
                <span className="text-[#99f7ff] text-xs tracking-[0.3em] uppercase block" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Secure Enrollment Protocol</span>
                <h2 className="text-6xl font-bold leading-[0.9] tracking-tighter text-[#ffffff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  INITIATE <br/>
                  THE AURIX <br/>
                  <span className="text-[#83aeff]">CORE.</span>
                </h2>
              </div>
              <p className="text-[#adaaab] text-lg leading-relaxed max-w-md">
                Join the decentralized vanguard. Protect your digital sovereignty with AURIX's impenetrable encryption layers and real-time threat intelligence.
              </p>
              
              <div className="grid grid-cols-2 gap-6 pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#99f7ff]">
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>End-to-End</span>
                  </div>
                  <div className="h-[1px] w-full bg-[#484849]/20"></div>
                  <p className="text-[10px] text-[#adaaab] uppercase">Quantum resistant</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#83aeff]">
                    <span className="material-symbols-outlined text-sm">visibility_off</span>
                    <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Zero Knowledge</span>
                  </div>
                  <div className="h-[1px] w-full bg-[#484849]/20"></div>
                  <p className="text-[10px] text-[#adaaab] uppercase">Strict Privacy Protocol</p>
                </div>
              </div>
            </div>
            
            {/* Right Side: Registration Card */}
            <div className="flex justify-center w-full">
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ duration: 0.5 }}
                 className="glass-card w-full max-w-[480px] p-10 rounded-xl space-y-8 shadow-2xl relative overflow-hidden"
              >
                <div className="space-y-2 relative z-10">
                  <h3 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create Identity</h3>
                  <p className="text-[#adaaab] text-sm font-light">Register your credentials to access the secure terminal.</p>
                </div>
                
                <form className="space-y-6 relative z-10" onSubmit={handleSignUp}>
                  {error && (
                    <div className="bg-[#ff716c]/10 border border-[#ff716c]/30 text-[#ff716c] p-3 rounded text-[11px] uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
                       <span className="material-symbols-outlined text-sm">warning</span>
                       {error}
                    </div>
                  )}
                  <div className="space-y-4">
                    
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-[#adaaab] ml-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }} htmlFor="name">Full Name</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#767576] text-lg">person</span>
                        <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#000000] border-none rounded-sm py-4 pl-12 pr-4 text-sm tracking-tight text-[#ffffff] placeholder:text-[#767576]/40 focus:ring-0 input-glow transition-all outline-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }} id="name" placeholder="ALEXANDER VANCE" type="text" />
                      </div>
                    </div>
                    
                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-[#adaaab] ml-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }} htmlFor="email">Email</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#767576] text-lg">alternate_email</span>
                        <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#000000] border-none rounded-sm py-4 pl-12 pr-4 text-sm tracking-tight text-[#ffffff] placeholder:text-[#767576]/40 focus:ring-0 input-glow transition-all outline-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }} id="email" placeholder="operator@aurix.ai" type="email" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Password */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-[#adaaab] ml-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }} htmlFor="password">Password</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#767576] text-lg">lock</span>
                          <input required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#000000] border-none rounded-sm py-4 pl-12 pr-4 text-sm tracking-widest text-[#ffffff] placeholder:text-[#767576]/40 placeholder:tracking-normal focus:ring-0 input-glow transition-all outline-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }} id="password" placeholder="••••••••" type="password" />
                        </div>
                      </div>
                      
                      {/* Confirm Password */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-[#adaaab] ml-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }} htmlFor="confirm_password">Confirm</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#767576] text-lg">lock_reset</span>
                          <input required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-[#000000] border-none rounded-sm py-4 pl-12 pr-4 text-sm tracking-widest text-[#ffffff] placeholder:text-[#767576]/40 placeholder:tracking-normal focus:ring-0 input-glow transition-all outline-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }} id="confirm_password" placeholder="••••••••" type="password" />
                        </div>
                      </div>
                    </div>
                    
                  </div>
                  
                  {/* Checkbox */}
                  <div className="flex items-start gap-3 px-1 mt-2">
                    <div className="flex items-center h-5">
                      <input required className="w-4 h-4 rounded-sm bg-[#000000] border-[#484849] text-[#83aeff] focus:ring-0 focus:ring-offset-0 transition-colors" id="terms" type="checkbox" />
                    </div>
                    <label className="text-[11px] text-[#adaaab] uppercase tracking-wider leading-tight" htmlFor="terms">
                      I agree to the <a className="text-[#99f7ff] hover:underline decoration-[#99f7ff]/30 underline-offset-4" href="#">Terms of Engagement</a> and autonomous privacy protocol.
                    </label>
                  </div>
                  
                  {/* CTA Button */}
                  <button 
                     className="quantum-gradient w-full py-4 rounded-lg text-[#002d64] font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#83aeff]/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50" 
                     style={{ fontFamily: "'Space Grotesk', sans-serif" }} 
                     type="submit"
                     disabled={isRegistering}
                  >
                     {isRegistering ? "Registering..." : <>Create Account <span className="material-symbols-outlined text-base">arrow_forward</span></>}
                  </button>
                  
                  {/* Footer Link */}
                  <div className="text-center pt-2">
                    <p className="text-[11px] text-[#adaaab] uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Already have an account? 
                      <button type="button" onClick={onSignIn} className="text-[#c180ff] hover:text-[#e5c6ff] transition-colors font-bold ml-1">Sign In</button>
                    </p>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        </main>

        {/* Decorative Image */}
        <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] opacity-20 pointer-events-none z-0">
          <img alt="Cybersecurity Interface Abstract" className="w-full h-full object-contain mix-blend-screen" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeQXpUqP7OA5fwm6kG9xOVMtIcaKL4OzsNisVPFYrORLUwzdFAOQ8CPF7scc9c2XQJG3hSApMOpsy98RTNPz9ESAM2UjLYn_P8WqiMBr6BDJPzdSggOk0vJNx7RpDuao6w2E8y7Ode4T6V-e4Lkmjyv92IcAQcbIa7GaeaqbvwKGPyQytUfp8X6cJeIzHjjxnSffH3NJA_b9yEjS7Ew_0Cgj1ccSNL5AgwknTwfWIxsOsAPMqIQIZhT8_sSFQ4xyeJJnJ0URN-K2lQ" />
        </div>

        {/* Footer */}
        <footer className="w-full z-50 bg-transparent mt-auto">
          <div className="flex flex-col md:flex-row justify-between items-center w-full px-12 py-8">
            <span className="text-[10px] uppercase tracking-widest text-[#767576]" style={{ fontFamily: "'Manrope', sans-serif" }}>© 2026 AURIX. AI CYBER DEFENSE.</span>
            <div className="flex gap-8 mt-4 md:mt-0">
              <a className="text-[10px] uppercase tracking-widest text-[#767576] hover:text-[#83aeff] transition-colors" style={{ fontFamily: "'Manrope', sans-serif" }} href="#">Privacy Protocol</a>
              <a className="text-[10px] uppercase tracking-widest text-[#767576] hover:text-[#83aeff] transition-colors" style={{ fontFamily: "'Manrope', sans-serif" }} href="#">Terms of Engagement</a>
              <a className="text-[10px] uppercase tracking-widest text-[#767576] hover:text-[#83aeff] transition-colors" style={{ fontFamily: "'Manrope', sans-serif" }} href="#">System Status</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

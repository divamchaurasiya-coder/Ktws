import { useState, FormEvent, useEffect } from 'react';
import { api } from '../lib/api';
import { LogIn, DatabaseZap } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; msg: string }>({ connected: true, msg: '' });

  useEffect(() => {
    const checkDb = async () => {
      try {
        const health = await api.auth.health();
        console.log('Backend Diagnostic:', health);
        
        if (!health.db) {
          setDbStatus({ 
            connected: false, 
            msg: 'Offline'
          });
          setError('Database connection is not yet configured. Please set up environment variables.');
        } else {
          setDbStatus({ connected: true, msg: 'Online' });
        }
      } catch (err) {
        console.error('Health Check Failed:', err);
        setDbStatus({ connected: false, msg: 'Unreachable' });
        setError('Cannot connect to the backend server. Please check your internet or deployment.');
      }
    };
    checkDb();
  }, []);

  const handleTroubleshoot = () => {
    window.open('/api/troubleshoot', '_blank');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await api.auth.login({ email, password });
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-[44px] shadow-2xl p-8 border-8 border-[#1A1A1A]">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#4F46E5] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#4F46E5]/30">
              <LogIn className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tighter">KTWS Library</h1>
            <p className="text-[#64748B] text-sm mt-1">Sign in to manage library</p>
            {!dbStatus.connected && (
              <div className="mt-4 px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border border-orange-200">
                <DatabaseZap size={12} />
                DB: {dbStatus.msg}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-[#F8FAFC] border border-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] transition-all text-[#1A1A1A]"
                placeholder="teacher@school.com"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-[#F8FAFC] border border-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] transition-all text-[#1A1A1A]"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-bold border border-red-100 italic flex flex-col gap-2">
                <span>{error}</span>
                <button 
                  type="button"
                  onClick={handleTroubleshoot}
                  className="text-[10px] font-black uppercase tracking-widest text-[#4F46E5] hover:underline text-left"
                >
                  Troubleshoot Connection Details →
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-[#4F46E5]/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Login to Dashboard'
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
            <p className="text-gray-400 text-xs italic">
              Default password: admin123 | admin@ktws.com
            </p>
            <p className="mt-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              Built by Parth and KTWS
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

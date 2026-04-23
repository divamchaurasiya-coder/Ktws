import { useState, FormEvent } from 'react';
import { api } from '../lib/api';
import Scanner from '../components/Scanner';
import { RotateCcw, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ReturnView() {
  const [step, setStep] = useState(1); // 1: Scan Book, 2: Scan Student, 3: Confirm
  const [barcode, setBarcode] = useState('');
  const [studentQR, setStudentQR] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleBookScan = (data: string) => {
    setBarcode(data);
    setStep(2);
  };

  const handleStudentScan = (data: string) => {
    setStudentQR(data);
    setStep(3);
  };

  const handleReturn = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.transactions.return({ barcode, studentQR });
      setMessage({ type: 'success', text: res.message });
      setStep(4);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleManualBook = (e: FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) setStep(2);
  };

  const handleManualStudent = (e: FormEvent) => {
    e.preventDefault();
    if (studentQR.trim()) setStep(3);
  };

  const reset = () => {
    setStep(1);
    setBarcode('');
    setStudentQR('');
    setMessage(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900 leading-none">Return Book</h2>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`w-2 h-2 rounded-full transition-colors ${step >= s ? 'bg-orange-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto text-orange-600">
                <RotateCcw size={32} />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Step 1: Scan Book</h3>
              <p className="text-xs text-gray-500">Scan the barcode of the returning book</p>
            </div>
            <Scanner onScan={handleBookScan} label="Scanning Book Barcode..." />

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-300 tracking-[0.3em]"><span className="bg-gray-50 px-4">OR ENTER MANUALLY</span></div>
            </div>

            <form onSubmit={handleManualBook} className="space-y-3">
              <input 
                type="text" 
                placeholder="Type Book ISBN / Barcode..." 
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 outline-none shadow-xs"
              />
              <button 
                type="submit"
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-xs active:scale-95 transition-transform"
              >
                Continue to Student Record
              </button>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto text-purple-600 shadow-lg shadow-purple-100/50">
                <User size={32} />
              </div>
              <h3 className="text-sm font-black text-[#1A1A1A] tracking-tight">Step 2: Scan Student</h3>
              <p className="text-[11px] text-[#64748B] font-bold uppercase tracking-widest leading-none">Scanning for returning personnel</p>
            </div>
            
            <Scanner onScan={handleStudentScan} label="Scanning Student QR..." />

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-300 tracking-[0.3em]"><span className="bg-gray-50 px-4">OR ENTER MANUALLY</span></div>
            </div>

            <form onSubmit={handleManualStudent} className="space-y-3">
              <input 
                type="text" 
                placeholder="Type Student Enrollment ID..." 
                value={studentQR}
                onChange={e => setStudentQR(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-600 outline-none shadow-xs"
              />
              <button 
                type="submit"
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-xs active:scale-95 transition-transform"
              >
                Review Return Details
              </button>
            </form>

            <button 
              onClick={() => setStep(1)}
              className="w-full text-[10px] uppercase font-black text-[#94A3B8] tracking-[0.2em] pt-4"
            >
              ← Back to Book Identification
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 text-center mb-4">Process Return</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-orange-600 shadow-xs">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Book Barcode</p>
                    <p className="text-sm font-bold text-gray-900">{barcode}</p>
                  </div>
                </div>

                <div className="flex justify-center py-2 text-gray-300">
                  <ArrowRight size={24} />
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-purple-600 shadow-xs">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student QR</p>
                    <p className="text-sm font-bold text-gray-900">{studentQR}</p>
                  </div>
                </div>
              </div>

              {message?.type === 'error' && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium border border-red-100 flex gap-2 items-center">
                  <AlertCircle size={14} />
                  {message.text}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button 
                  onClick={reset}
                  className="py-3 text-xs font-bold text-gray-500 rounded-xl border border-gray-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReturn}
                  disabled={loading}
                  className="py-3 text-xs font-bold text-white bg-orange-600 rounded-xl shadow-lg shadow-orange-100 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Return Book'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 space-y-6"
          >
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle2 size={48} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-gray-900">Return Successful!</h3>
              <p className="text-sm text-gray-500 max-w-[200px] mx-auto">{message?.text}</p>
            </div>
            <button 
              onClick={reset}
              className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs shadow-xl"
            >
              Process Another
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

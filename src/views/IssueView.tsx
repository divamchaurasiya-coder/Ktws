import { useState } from 'react';
import { api } from '../lib/api';
import Scanner from '../components/Scanner';
import { Book, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function IssueView() {
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

  const handleIssue = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.transactions.issue({ barcode, studentQR });
      setMessage({ type: 'success', text: res.message });
      setStep(4); // Success State
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-lg font-bold text-gray-900 leading-none">Issue Book</h2>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`w-2 h-2 rounded-full transition-colors ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`}
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
              <div className="w-16 h-16 bg-[#EEF2FF] rounded-2xl flex items-center justify-center mx-auto text-[#4F46E5] shadow-sm">
                <Book size={32} />
              </div>
              <h3 className="text-sm font-bold text-[#1A1A1A]">Step 1: Scan Book</h3>
              <p className="text-xs text-[#64748B]">Scan the barcode on the back of the book</p>
            </div>
            <Scanner onScan={handleBookScan} label="Scanning Book Barcode..." />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-[#F8FAFC] rounded-2xl flex items-center justify-center mx-auto text-[#64748B] shadow-sm">
                <User size={32} />
              </div>
              <h3 className="text-sm font-bold text-[#1A1A1A]">Step 2: Scan Student</h3>
              <p className="text-xs text-[#64748B]">Scan the student's ID card QR code</p>
            </div>
            <Scanner onScan={handleStudentScan} label="Scanning Student QR..." />
            <button 
              onClick={() => setStep(1)}
              className="w-full text-[10px] uppercase font-bold text-[#94A3B8] tracking-widest text-center"
            >
              Back to Book Scan
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
            <div className="bg-white rounded-[24px] border border-[#F1F5F9] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#1A1A1A] text-center mb-4 uppercase tracking-wider">Confirm Details</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#4F46E5] shadow-xs">
                    <Book size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Book Barcode</p>
                    <p className="text-sm font-bold text-[#1A1A1A]">{barcode}</p>
                  </div>
                </div>

                <div className="flex justify-center py-1 text-[#E2E8F0]">
                  <ArrowRight size={24} />
                </div>

                <div className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#4F46E5] shadow-xs">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Student QR</p>
                    <p className="text-sm font-bold text-[#1A1A1A]">{studentQR}</p>
                  </div>
                </div>
              </div>

              {message?.type === 'error' && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 flex gap-2 items-center italic">
                  <AlertCircle size={14} />
                  {message.text}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button 
                  onClick={reset}
                  className="py-4 text-xs font-bold text-[#64748B] rounded-2xl border border-[#F1F5F9] active:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleIssue}
                  disabled={loading}
                  className="py-4 text-xs font-bold text-white bg-[#4F46E5] rounded-2xl shadow-lg shadow-[#4F46E5]/30 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Issue Book'}
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
              <h3 className="text-xl font-bold text-gray-900">Success!</h3>
              <p className="text-sm text-gray-500 max-w-[200px] mx-auto">{message?.text}</p>
            </div>
            <button 
              onClick={reset}
              className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs shadow-xl"
            >
              Issue Another
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

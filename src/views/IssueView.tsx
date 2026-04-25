import { useState, FormEvent, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import Scanner from '../components/Scanner';
import { Book, User, ArrowRight, CheckCircle2, AlertCircle, Search, Plus, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function IssueView() {
  const [step, setStep] = useState(1); // 1: Scan Book, 2: Scan Student, 3: Confirm
  const [barcode, setBarcode] = useState('');
  const [studentQR, setStudentQR] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingBook, setAddingBook] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; bookNotFound?: boolean } | null>(null);

  // Suggestions State
  const [bookSuggestions, setBookSuggestions] = useState<any[]>([]);
  const [studentSuggestions, setStudentSuggestions] = useState<any[]>([]);
  const [showBookSug, setShowBookSug] = useState(false);
  const [showStudentSug, setShowStudentSug] = useState(false);

  // Search Timers
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchBookSuggestions = async (q: string) => {
    if (q.length < 2) {
      setBookSuggestions([]);
      return;
    }
    try {
      const data = await api.books.search(q);
      setBookSuggestions(data);
      setShowBookSug(true);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudentSuggestions = async (q: string) => {
    if (q.length < 2) {
      setStudentSuggestions([]);
      return;
    }
    try {
      const data = await api.students.search(q);
      setStudentSuggestions(data);
      setShowStudentSug(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookChange = (q: string) => {
    setBarcode(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchBookSuggestions(q), 300);
  };

  const handleStudentChange = (q: string) => {
    setStudentQR(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchStudentSuggestions(q), 300);
  };

  const selectBook = (book: any) => {
    setBarcode(book.barcode);
    setShowBookSug(false);
    setStep(2);
  };

  const selectStudent = (student: any) => {
    setStudentQR(student.qr_code);
    setShowStudentSug(false);
    setStep(3);
  };

  const handleBookScan = (data: string) => {
    setBarcode(data);
    setStep(2);
  };

  const handleStudentScan = (data: string) => {
    setStudentQR(data);
    setStep(3);
  };

  const handleManualBook = (e: FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) setStep(2);
  };

  const handleManualStudent = (e: FormEvent) => {
    e.preventDefault();
    if (studentQR.trim()) setStep(3);
  };

  const handleIssue = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await api.transactions.issue({ barcode, studentQR });
      setMessage({ type: 'success', text: 'Book issued successfully! The student has 7 days to return it.' });
      setStep(4); // Success State
    } catch (err: any) {
      const isNotFound = err.message.toLowerCase().includes('not found') && err.message.toLowerCase().includes('book');
      setMessage({ 
        type: 'error', 
        text: err.message,
        bookNotFound: isNotFound
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSave = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      title: formData.get('title'),
      author: formData.get('author'),
      barcode: barcode,
      total_copies: 1,
      available_copies: 1,
      status: 'available'
    };

    setAddingBook(true);
    try {
      await api.books.create(data);
      setShowManualForm(false);
      setMessage({ type: 'success', text: 'Book added! Proceeding to issue...' });
      setTimeout(handleIssue, 1000);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to save: ${err.message}` });
    } finally {
      setAddingBook(false);
    }
  };

  const handleQuickAdd = async () => {
    setAddingBook(true);
    try {
      await api.books.scan(barcode);
      setMessage({ type: 'success', text: 'Book added to system! You can now issue it.' });
      // Retry issue automatically after a short delay
      setTimeout(handleIssue, 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to auto-fetch: ${err.message}. Please add manually in Books section.` });
    } finally {
      setAddingBook(false);
    }
  };

  const reset = () => {
    setStep(1);
    setBarcode('');
    setStudentQR('');
    setMessage(null);
    setShowManualForm(false);
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
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#F1F5F9]"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#F0F2F5] px-4 font-black text-[#94A3B8] tracking-widest">or</span></div>
            </div>

            <div className="relative">
              <form onSubmit={handleManualBook} className="bg-white p-6 rounded-[32px] border border-[#F1F5F9] shadow-sm space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Manual ISBN or Title Entry</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        value={barcode}
                        onChange={e => handleBookChange(e.target.value)}
                        placeholder="Type Code or Title..."
                        className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden text-sm"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={!barcode.trim()}
                      className="px-6 bg-[#4F46E5] text-white rounded-2xl font-bold text-xs disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </form>

              {/* Book Suggestions */}
              {showBookSug && bookSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 bottom-full mb-2 bg-white border border-[#F1F5F9] rounded-[24px] shadow-2xl z-50 overflow-hidden divide-y divide-[#F1F5F9]">
                  {bookSuggestions.map((book) => (
                    <button 
                      key={book.id}
                      onClick={() => selectBook(book)}
                      className="w-full text-left p-4 hover:bg-[#F8FAFC] flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 shrink-0">
                        <Book size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#1A1A1A] truncate">{book.title}</p>
                        <p className="text-[10px] text-[#64748B] flex items-center gap-2">
                          <span className="font-mono">{book.barcode}</span>
                          <span>•</span>
                          <span>{book.author}</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#F1F5F9]"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#F0F2F5] px-4 font-black text-[#94A3B8] tracking-widest">or</span></div>
            </div>

            <div className="relative">
              <form onSubmit={handleManualStudent} className="bg-white p-6 rounded-[32px] border border-[#F1F5F9] shadow-sm space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Manual ID or Name Entry</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={studentQR}
                      onChange={e => handleStudentChange(e.target.value)}
                      placeholder="Type Code or Name..."
                      className="flex-1 px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden text-sm"
                    />
                    <button 
                      type="submit" 
                      disabled={!studentQR.trim()}
                      className="px-6 bg-[#4F46E5] text-white rounded-2xl font-bold text-xs disabled:opacity-50"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </form>

              {/* Student Suggestions */}
              {showStudentSug && studentSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 bottom-full mb-2 bg-white border border-[#F1F5F9] rounded-[24px] shadow-2xl z-50 overflow-hidden divide-y divide-[#F1F5F9]">
                  {studentSuggestions.map((st) => (
                    <button 
                      key={st.id}
                      onClick={() => selectStudent(st)}
                      className="w-full text-left p-4 hover:bg-[#F8FAFC] flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
                        <User size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#1A1A1A] truncate">{st.name}</p>
                        <p className="text-[10px] text-[#64748B] flex items-center gap-2">
                          <span className="font-mono">{st.qr_code}</span>
                          <span>•</span>
                          <span>Class {st.class}-{st.section}</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-4 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#4F46E5] shadow-xs self-start sm:self-center">
                    <Book size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Book Barcode</p>
                    <p className="text-sm font-bold text-[#1A1A1A] truncate">{barcode}</p>
                  </div>
                </div>

                <div className="flex justify-center py-1 text-[#E2E8F0]">
                  <ArrowRight size={24} className="rotate-90 sm:rotate-0" />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-4 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#4F46E5] shadow-xs self-start sm:self-center">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Student QR</p>
                    <p className="text-sm font-bold text-[#1A1A1A] truncate">{studentQR}</p>
                  </div>
                </div>
              </div>

              {message?.type === 'error' && (
                <div className="flex flex-col gap-3">
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 flex gap-2 items-center italic">
                    <AlertCircle size={14} />
                    {message.text}
                  </div>
                  {message.bookNotFound && !showManualForm && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={handleQuickAdd}
                        disabled={addingBook}
                        className="w-full py-3 bg-green-50 text-green-700 border border-green-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                      >
                        {addingBook ? (
                          <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Scan size={14} />
                        )}
                        Auto-Add
                      </button>
                      <button
                        onClick={() => setShowManualForm(true)}
                        className="w-full py-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus size={14} />
                        Manually Add
                      </button>
                    </div>
                  )}

                  {showManualForm && (
                    <form onSubmit={handleManualSave} className="space-y-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                          <Plus size={12} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Manual Book Entry</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Title</label>
                          <input 
                            name="title" 
                            required 
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Book Name"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Author</label>
                          <input 
                            name="author" 
                            required 
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Author Name"
                          />
                        </div>
                        <button 
                          disabled={addingBook}
                          className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {addingBook ? "Saving..." : "Save & Continue"}
                        </button>
                      </div>
                    </form>
                  )}
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

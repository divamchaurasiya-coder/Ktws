import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { History, Search, Filter, BookOpen, User, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export default function TransactionsView() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'issued' | 'overdue'>('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const data = await api.transactions.list();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReturn = async (barcode: string, studentQR: string) => {
    if (!confirm('Mark this book as returned?')) return;
    try {
      await api.transactions.return({ barcode, studentQR });
      await fetchTransactions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.book_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.book_barcode?.includes(searchTerm);
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && t.status === filter;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="text-blue-600" />
            Issue Records
          </h1>
          <p className="text-gray-500 text-sm">Active records of issued books. Returned books are automatically cleared.</p>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by book, student, or barcode..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'issued', 'overdue'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4F46E5] mb-4"></div>
            <p className="text-gray-500 font-medium">Loading history...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <History className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-medium font-sans">No records found</p>
          </div>
        ) : (
          <div>
            {/* Desktop View Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="pb-4 font-bold text-[#64748B] tracking-tight uppercase text-[10px] pl-2">Status</th>
                    <th className="pb-4 font-bold text-[#64748B] tracking-tight uppercase text-[10px]">Student</th>
                    <th className="pb-4 font-bold text-[#64748B] tracking-tight uppercase text-[10px]">Book Info</th>
                    <th className="pb-4 font-bold text-[#64748B] tracking-tight uppercase text-[10px]">Timeline & Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTransactions.map((t, idx) => (
                    <motion.tr 
                      key={t.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group hover:bg-gray-50/50 transition-all"
                    >
                      <td className="py-5 pl-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          t.status === 'overdue'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          <Clock size={12} />
                          {t.status}
                        </span>
                      </td>
                      <td className="py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] font-black shadow-sm">
                            {t.student_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1A1A1A]">{t.student_name}</p>
                            <p className="text-[10px] text-[#94A3B8] font-black uppercase tracking-tight">Class {t.student_class} • ID: {t.student_qr}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-[#64748B] border border-gray-100">
                            <BookOpen size={18} />
                          </div>
                          <div className="max-w-[200px]">
                            <p className="text-sm font-bold text-[#1A1A1A] truncate">{t.book_title}</p>
                            <p className="text-[10px] text-[#94A3B8] font-mono font-bold tracking-tighter uppercase">{t.book_barcode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="flex items-center justify-between gap-8">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[10px] text-[#64748B] font-bold">
                              <Calendar size={12} />
                              <span>{format(new Date(t.issue_date), 'MMM dd, yyyy')}</span>
                            </div>
                            <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-tight ${t.status === 'overdue' ? 'text-red-500' : 'text-orange-500'}`}>
                              <Clock size={12} />
                              <span>Due {format(new Date(t.due_date), 'MMM dd, yyyy')}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleQuickReturn(t.book_barcode, t.student_qr)}
                            className="px-4 py-2 bg-white border border-[#E2E8F0] hover:border-[#4F46E5] text-[#4F46E5] text-[10px] font-black uppercase tracking-[0.1em] rounded-lg transition-all active:scale-95 shadow-sm"
                          >
                            Return
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="md:hidden space-y-4">
              {filteredTransactions.map((t, idx) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white border border-[#F1F5F9] rounded-[24px] p-5 shadow-xs relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-widest ${
                    t.status === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {t.status}
                  </div>

                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-12 h-12 rounded-[14px] bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] font-black text-xl shadow-xs shrink-0">
                      {t.student_name?.charAt(0)}
                    </div>
                    <div className="min-w-0 pr-12">
                      <h3 className="text-base font-black text-[#1A1A1A] leading-tight mb-1 truncate">{t.student_name}</h3>
                      <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-wider">Class {t.student_class} • {t.student_qr}</p>
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] rounded-2xl p-4 mb-5 border border-[#F1F5F9]">
                    <div className="flex items-start gap-3">
                      <BookOpen size={16} className="text-[#64748B] mt-1 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1A1A1A] leading-snug line-clamp-2 mb-1">{t.book_title}</p>
                        <p className="text-[10px] font-mono font-black text-[#94A3B8] tracking-tight">{t.book_barcode}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[10px] font-black text-[#64748B] uppercase tracking-tight">
                        <Calendar size={12} />
                        <span>Issued: {format(new Date(t.issue_date), 'MMM dd')}</span>
                      </div>
                      <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-tight ${t.status === 'overdue' ? 'text-red-500' : 'text-orange-500'}`}>
                        <Clock size={12} />
                        <span>Due: {format(new Date(t.due_date), 'MMM dd')}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleQuickReturn(t.book_barcode, t.student_qr)}
                      className="px-6 py-3 bg-[#4F46E5] text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#4F46E5]/20 active:scale-95 transition-all"
                    >
                      Return
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

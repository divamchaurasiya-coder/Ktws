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

  const handleSync = async () => {
    setLoading(true);
    try {
      await api.transactions.syncOverdue();
      await fetchTransactions();
      alert('Overdue sync completed and notifications sent!');
    } catch (err: any) {
      alert('Sync failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (phone: string, studentName: string, bookTitle: string, fine: number, isOverdue: boolean) => {
    if (!phone) {
      alert('No parent phone number on file for this student.');
      return;
    }
    
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    
    let message = '';
    if (isOverdue) {
      message = `Hello, this is the School Library. Your child ${studentName} has not returned the book "${bookTitle}". It is currently overdue with a fine of ₹${fine}. Please return it soon.`;
    } else {
      message = `Hello, this is the School Library. Just a reminder that ${studentName} has the book "${bookTitle}" issued. Please ensure it is returned by the due date.`;
    }
    
    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
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
          <p className="text-gray-500 text-sm">Active records of issued books. Fines are calculated daily at ₹10/day.</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
        >
          <Clock size={16} />
          {loading ? 'Syncing...' : 'Run Overdue Sync'}
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search records..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
            {(['all', 'issued', 'overdue'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 ${
                  filter === f 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Loading history...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <History className="mx-auto text-gray-300 mb-4" size={40} />
            <p className="text-gray-400 text-xs font-black uppercase tracking-widest">No matching records</p>
          </div>
        ) : (
          <div>
            {/* Desktop View Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="pb-4 font-bold text-[#64748B] tracking-tight uppercase text-[10px] pl-2">Status</th>
                    <th className="pb-4 font-bold text-[#64748B] tracking-tight uppercase text-[10px]">Student & Parent</th>
                    <th className="pb-4 font-bold text-[#64748B] tracking-tight uppercase text-[10px]">Book Info</th>
                    <th className="pb-4 font-bold text-[#64748B] tracking-tight uppercase text-[10px]">Fine</th>
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
                            : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          <Clock size={12} />
                          {t.status}
                        </span>
                      </td>
                      <td className="py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black shadow-sm">
                            {t.student_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1A1A1A]">{t.student_name}</p>
                            <p className="text-[10px] text-[#94A3B8] font-black uppercase tracking-tight">Parent: {t.student_parent_phone || 'None'}</p>
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
                        <div className={`text-sm font-black ${t.fine_amount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          ₹{t.fine_amount || 0}
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
                          <div className="flex items-center gap-2">
                            {t.student_parent_phone && (
                              <button 
                                onClick={() => openWhatsApp(t.student_parent_phone, t.student_name, t.book_title, t.fine_amount || 0, t.status === 'overdue')}
                                className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm border border-green-100"
                                title="Send WhatsApp Reminder"
                              >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.517 1.947.887 3.145.887 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.729-5.767-5.729zm3.39 8.163c-.147.411-.85.753-1.157.78-.308.028-.616.147-1.785-.311-1.168-.459-1.921-1.644-1.979-1.721-.059-.077-.471-.628-.471-1.21s.303-.859.412-.977c.108-.117.235-.147.313-.147l.225.003c.083 0 .196-.032.298.22.103.253.353.858.384.921.031.063.051.137.009.221-.042.084-.063.136-.126.209-.063.073-.133.163-.19.221-.064.066-.131.138-.056.266.075.127.333.55.714.89.49.437.904.572 1.031.635.127.064.201.053.276-.032.075-.084.321-.373.407-.5.084-.127.17-.105.285-.064.117.042.743.351.871.415s.213.095.244.148c.032.053.032.307-.116.718z"></path></svg>
                              </button>
                            )}
                            <button 
                              onClick={() => handleQuickReturn(t.book_barcode, t.student_qr)}
                              className="px-4 py-2 bg-white border border-[#E2E8F0] hover:border-blue-600 text-blue-600 text-[10px] font-black uppercase tracking-[0.1em] rounded-lg transition-all active:scale-95 shadow-sm"
                            >
                              Return
                            </button>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {filteredTransactions.map((t, idx) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] ${
                      t.status === 'overdue'
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      <Clock size={10} />
                      {t.status}
                    </span>
                    <div className="flex gap-2">
                       {t.student_parent_phone && (
                        <button 
                          onClick={() => openWhatsApp(t.student_parent_phone, t.student_name, t.book_title, t.fine_amount || 0, t.status === 'overdue')}
                          className="p-2 text-green-600 bg-green-50 rounded-xl hover:bg-green-600 hover:text-white transition-colors border border-green-100"
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.517 1.947.887 3.145.887 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.729-5.767-5.729zm3.39 8.163c-.147.411-.85.753-1.157.78-.308.028-.616.147-1.785-.311-1.168-.459-1.921-1.644-1.979-1.721-.059-.077-.471-.628-.471-1.21s.303-.859.412-.977c.108-.117.235-.147.313-.147l.225.003c.083 0 .196-.032.298.22.103.253.353.858.384.921.031.063.051.137.009.221-.042.084-.063.136-.126.209-.063.073-.133.163-.19.221-.064.066-.131.138-.056.266.075.127.333.55.714.89.49.437.904.572 1.031.635.127.064.201.053.276-.032.075-.084.321-.373.407-.5.084-.127.17-.105.285-.064.117.042.743.351.871.415s.213.095.244.148c.032.053.032.307-.116.718z"></path></svg>
                        </button>
                      )}
                      <button 
                        onClick={() => handleQuickReturn(t.book_barcode, t.student_qr)}
                        className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-colors"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0">
                      {t.student_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-gray-900 leading-tight mb-0.5 truncate">{t.student_name}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Class {t.student_class}</p>
                      <p className="text-[9px] font-black text-blue-600 tracking-tight">WhatsApp: {t.student_parent_phone || 'No Phone'}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-3 mb-4 flex items-start gap-3">
                    <BookOpen size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-gray-800 leading-snug line-clamp-2">{t.book_title}</h4>
                        <span className={`text-xs font-black shrink-0 ${t.fine_amount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          ₹{t.fine_amount || 0}
                        </span>
                      </div>
                      <p className="text-[9px] font-mono font-black text-gray-400 tracking-tighter mt-0.5">{t.book_barcode}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-4">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Issued</p>
                        <p className="text-[10px] font-bold text-gray-600">{format(new Date(t.issue_date), 'MMM dd')}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Due</p>
                        <p className={`text-[10px] font-bold ${t.status === 'overdue' ? 'text-red-500' : 'text-orange-600'}`}>
                          {format(new Date(t.due_date), 'MMM dd')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                      <History size={12} />
                      <span>{t.status === 'overdue' ? 'Urgent' : 'Active'}</span>
                    </div>
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

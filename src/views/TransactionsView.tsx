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
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Loading history...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <History className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-medium">No records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-4 font-semibold text-gray-900 pl-2 text-sm">Status</th>
                  <th className="pb-4 font-semibold text-gray-900 text-sm">Student</th>
                  <th className="pb-4 font-semibold text-gray-900 text-sm">Book</th>
                  <th className="pb-4 font-semibold text-gray-900 text-sm">Timeline</th>
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
                    <td className="py-4 pl-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'overdue'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        <Clock size={12} />
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{t.student_name}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{t.student_class}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                          <BookOpen size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">{t.book_title}</p>
                          <p className="text-[10px] text-gray-500 font-mono tracking-tighter">{t.book_barcode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <Calendar size={12} />
                          <span>Issued: {format(new Date(t.issue_date), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-[10px] text-orange-600 font-medium whitespace-nowrap">
                            <Clock size={12} />
                            <span>Due: {format(new Date(t.due_date), 'MMM dd, yyyy')}</span>
                          </div>
                          <button 
                            onClick={() => handleQuickReturn(t.book_barcode, t.student_qr)}
                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline whitespace-nowrap"
                          >
                            Return Now
                          </button>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

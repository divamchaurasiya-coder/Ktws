import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Book, CheckCircle, Clock, Users, ArrowRight, Scan, X } from 'lucide-react';
import { format } from 'date-fns';
import Scanner from '../components/Scanner';

export default function HomeView() {
  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickScan, setShowQuickScan] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stats, me] = await Promise.all([
        api.dashboard.getStats(),
        api.auth.me()
      ]);
      setData(stats);
      setUser(me.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickScan = async (code: string) => {
    setLookupError('');
    try {
      const book = await api.books.lookup(code);
      setLookupResult(book);
    } catch (err: any) {
      setLookupError('Book not found in catalog');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4F46E5]"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Books', value: data?.stats.totalBooks, bg: 'bg-[#EEF2FF]', text: 'text-[#4F46E5]' },
    { label: 'Books Issued', value: data?.stats.issuedBooks, bg: 'bg-[#ECFDF5]', text: 'text-[#10B981]' },
    { label: 'Overdue', value: data?.stats.overdueBooks, bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]' },
    { label: 'Students', value: data?.stats.activeStudents, bg: 'bg-[#F8FAFC]', text: 'text-[#64748B]' },
  ];

  return (
    <div className="space-y-6 pt-4">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tighter">Hello, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-[#64748B] text-sm mt-1">Ready to manage the library today?</p>
      </div>

      {/* Scan Hero */}
      <button 
        onClick={() => setShowQuickScan(true)}
        className="w-full text-left bg-[#4F46E5] rounded-[24px] p-5 text-white flex justify-between items-center shadow-lg shadow-[#4F46E5]/30 active:scale-[0.98] transition-transform"
      >
        <div>
          <h3 className="text-lg font-bold">Quick Lookup</h3>
          <p className="text-white/80 text-[12px] mt-1">Scan QR or ISBN for instant info</p>
        </div>
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#4F46E5] shadow-md">
          <Scan size={24} strokeWidth={2.5} />
        </div>
      </button>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card, i) => (
          <div key={i} className={`${card.bg} p-4 rounded-[20px] border border-white/50 shadow-xs`}>
            <p className="text-[11px] uppercase font-bold text-[#64748B] tracking-widest mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Scan Modal */}
      {showQuickScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[44px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-[#1A1A1A]">Instant Book Scan</h3>
              <button 
                onClick={() => {
                  setShowQuickScan(false);
                  setLookupResult(null);
                  setLookupError('');
                }} 
                className="p-2 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {!lookupResult ? (
                <div className="space-y-4">
                  <Scanner onScan={handleQuickScan} label="Scan QR or ISBN" />
                  {lookupError && (
                    <p className="text-center text-red-500 text-xs font-bold italic">{lookupError}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="w-20 h-28 bg-[#EEF2FF] rounded-xl flex items-center justify-center mx-auto text-[#4F46E5] border border-[#E0E7FF] shadow-sm">
                    <Book size={40} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1A1A1A]">{lookupResult.title}</h4>
                    <p className="text-sm text-[#64748B]">{lookupResult.author}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                      <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-widest">Available</p>
                      <p className="text-sm font-bold text-[#4F46E5]">{lookupResult.available_copies} / {lookupResult.total_copies}</p>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                      <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-widest">Barcode</p>
                      <p className="text-sm font-bold text-gray-900 font-mono tracking-tighter">{lookupResult.barcode}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setLookupResult(null);
                      setLookupError('');
                    }}
                    className="w-full py-4 bg-[#4F46E5] text-white rounded-2xl font-bold text-sm shadow-lg shadow-[#4F46E5]/30"
                  >
                    Scan Another
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="activity-section">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-[#1A1A1A]">Recent Activity</h4>
          <span className="text-xs font-bold text-[#4F46E5]">View All</span>
        </div>
        
        <div className="space-y-3">
          {data?.recentActivity.length > 0 ? (
            data.recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-center gap-3 pb-3 border-b border-[#F1F5F9]">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                  activity.status === 'returned' ? 'bg-[#DCFCE7] text-[#10B981]' : 
                  activity.status === 'overdue' ? 'bg-[#FEE2E2] text-[#EF4444]' : 
                  'bg-[#E0E7FF] text-[#4F46E5]'
                }`}>
                  {activity.status === 'returned' ? '↩️' : activity.status === 'overdue' ? '⚠️' : '📖'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A1A1A] truncate">{activity.book_title}</p>
                  <p className="text-[11px] text-[#94A3B8]">
                    {activity.status === 'returned' ? 'Returned by' : 'Issued to'} {activity.student_name} • {format(new Date(activity.issue_date), 'h:mm a')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 text-xs italic bg-white rounded-2xl border border-dashed border-gray-200">
              No recent activity recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

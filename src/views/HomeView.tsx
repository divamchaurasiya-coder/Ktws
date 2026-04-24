import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Book, CheckCircle, Clock, Users, ArrowRight, Scan, X } from 'lucide-react';
import { format } from 'date-fns';
import Scanner from '../components/Scanner';

export default function HomeView({ onViewTransactions }: { onViewTransactions?: () => void }) {
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
      const result = await api.dashboard.lookup(code);
      setLookupResult(result);
    } catch (err: any) {
      setLookupError('No record found for this code');
    }
  };

  const openWhatsApp = (phone: string, studentName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const msg = `Hello, this is the School Library. We are contacting you regarding ${studentName}'s library account.`;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
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
                  <Scanner onScan={handleQuickScan} label="Scan QR or Barcode" />
                  {lookupError && (
                    <p className="text-center text-red-500 text-xs font-bold italic">{lookupError}</p>
                  )}
                  <p className="text-center text-gray-400 text-[10px] uppercase font-bold tracking-widest px-4">
                    Scan a Student QR or a Book Barcode
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {lookupResult.type === 'book' ? (
                    <div className="space-y-6 text-center">
                      <div className="w-20 h-28 bg-[#EEF2FF] rounded-xl flex items-center justify-center mx-auto text-[#4F46E5] border border-[#E0E7FF] shadow-sm">
                        <Book size={40} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-[#1A1A1A]">{lookupResult.data.title}</h4>
                        <p className="text-sm text-[#64748B]">{lookupResult.data.author}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                          <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-widest">Available</p>
                          <p className="text-sm font-bold text-[#4F46E5]">{lookupResult.data.available_copies} / {lookupResult.data.total_copies}</p>
                        </div>
                        <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                          <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-widest">Barcode</p>
                          <p className="text-sm font-bold text-gray-900 font-mono tracking-tighter">{lookupResult.data.barcode}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-3xl border border-gray-100">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-gray-100">
                          {lookupResult.data.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-gray-900 leading-tight">{lookupResult.data.name}</h4>
                          <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
                            {lookupResult.data.class}-{lookupResult.data.section} • {lookupResult.data.qr_code}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Holdings</p>
                        {lookupResult.data.active_books && lookupResult.data.active_books.length > 0 ? (
                          lookupResult.data.active_books.map((b: any) => (
                            <div key={b.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-800 truncate">{b.books?.title}</p>
                                <p className={`text-[9px] font-black uppercase tracking-tighter mt-1 ${b.status === 'overdue' ? 'text-red-500' : 'text-gray-400'}`}>
                                  {b.status} • Due {format(new Date(b.due_date), 'MMM dd')}
                                </p>
                              </div>
                              <div className="text-right ml-2 shrink-0">
                                <p className="text-[10px] font-black text-red-600">₹{b.fine_amount || 0}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 bg-white border border-dashed border-gray-200 rounded-2xl text-center">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">No issued books</p>
                          </div>
                        )}
                      </div>

                      {lookupResult.data.parent_phone && (
                        <button 
                          onClick={() => openWhatsApp(lookupResult.data.parent_phone, lookupResult.data.name)}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-green-50 text-green-600 border border-green-100 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all shadow-xs"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.517 1.947.887 3.145.887 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.729-5.767-5.729zm3.39 8.163c-.147.411-.85.753-1.157.78-.308.028-.616.147-1.785-.311-1.168-.459-1.921-1.644-1.979-1.721-.059-.077-.471-.628-.471-1.21s.303-.859.412-.977c.108-.117.235-.147.313-.147l.225.003c.083 0 .196-.032.298.22.103.253.353.858.384.921.031.063.051.137.009.221-.042.084-.063.136-.126.209-.063.073-.133.163-.19.221-.064.066-.131.138-.056.266.075.127.333.55.714.89.49.437.904.572 1.031.635.127.064.201.053.276-.032.075-.084.321-.373.407-.5.084-.127.17-.105.285-.064.117.042.743.351.871.415s.213.095.244.148c.032.053.032.307-.116.718z"></path></svg>
                          WhatsApp Parent
                        </button>
                      )}
                    </div>
                  )}

                  <button 
                    onClick={() => {
                      setLookupResult(null);
                      setLookupError('');
                    }}
                    className="w-full py-4 bg-[#4F46E5] text-white rounded-2xl font-bold text-sm shadow-lg shadow-[#4F46E5]/30 mt-4"
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
          <button 
            onClick={() => onViewTransactions?.()}
            className="text-xs font-bold text-[#4F46E5] hover:underline"
          >
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          {data?.recentActivity.length > 0 ? (
            data.recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-center gap-3 pb-3 border-b border-[#F1F5F9]">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                  activity.status === 'overdue' ? 'bg-[#FEE2E2] text-[#EF4444]' : 
                  'bg-[#E0E7FF] text-[#4F46E5]'
                }`}>
                  {activity.status === 'overdue' ? '⚠️' : '📖'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A1A1A] truncate">{activity.book_title}</p>
                  <p className="text-[11px] text-[#94A3B8]">
                    Issued to {activity.student_name} • {format(new Date(activity.issue_date), 'h:mm a')}
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

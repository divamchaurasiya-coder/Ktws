import { useState, useEffect, FormEvent } from 'react';
import { api } from '../lib/api';
import { BookOpen, Plus, X, Search, Barcode as BarcodeIcon, History, User, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import Barcode from 'react-barcode';

export default function BooksView() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({ title: '', author: '', barcode: '', total_copies: 1 });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const data = await api.books.list();
      setBooks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = async (book: any) => {
    setDetailLoading(true);
    setSelectedBook(book);
    try {
      const detail = await api.books.getDetail(book.id);
      setSelectedBook(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.books.create(formData);
      await fetchBooks();
      setShowAdd(false);
      setFormData({ title: '', author: '', barcode: '', total_copies: 1 });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    setFormLoading(true);
    try {
      await api.books.update(selectedBook.id, editData);
      await fetchBooks();
      setSelectedBook({ ...selectedBook, ...editData });
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const startEditing = () => {
    setEditData({
      title: selectedBook.title,
      author: selectedBook.author,
      total_copies: selectedBook.total_copies,
      available_copies: selectedBook.available_copies,
      status: selectedBook.status || 'Available'
    });
    setIsEditing(true);
  };

  const filtered = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase()) ||
    b.barcode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tighter">Library Catalog</h2>
        <button 
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#4F46E5]/30 active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
        <input 
          type="text"
          placeholder="Search title, author or barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-[#F1F5F9] rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] shadow-xs"
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center animate-pulse text-[#94A3B8] text-xs">Loading catalog...</div>
        ) : filtered.length > 0 ? (
          filtered.map(book => (
            <motion.div 
              key={book.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleBookClick(book)}
              className="bg-white p-4 rounded-2xl border border-[#F1F5F9] shadow-xs flex items-start gap-4 active:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="w-12 h-16 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#4F46E5] shrink-0 border border-[#E0E7FF]">
                <BookOpen size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1A1A1A] truncate">{book.title}</p>
                <p className="text-[11px] text-[#64748B] font-medium truncate mb-2 leading-none">{book.author}</p>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 bg-[#F1F5F9] rounded-full text-[9px] font-bold text-[#64748B] flex items-center gap-1 uppercase tracking-wider">
                    <BarcodeIcon size={10} /> {book.barcode}
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${book.available_copies > 0 ? 'bg-[#DCFCE7] text-[#10B981]' : 'bg-[#FEE2E2] text-[#EF4444]'}`}>
                    {book.available_copies} / {book.total_copies} AVBL
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-10 text-center text-gray-400 text-xs italic bg-white rounded-2xl border border-dashed border-gray-200">No books in catalog</div>
        )}
      </div>

      {/* Book Detail Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" 
            onClick={() => { setSelectedBook(null); setIsEditing(false); }} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white rounded-t-[44px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[85vh]"
          >
            <div className="overflow-y-auto p-6 sm:p-10 custom-scrollbar">
              {!isEditing ? (
                <>
                  <div className="flex flex-col items-center mb-10">
                    <div className="w-24 h-32 bg-blue-50 rounded-[32px] flex items-center justify-center text-blue-600 mb-8 shadow-xl shadow-blue-600/10 border-4 border-white rotate-2 transition-transform hover:rotate-0">
                      <BookOpen size={48} />
                    </div>
                    <div className="text-center px-4">
                      <h3 className="text-2xl font-black text-gray-900 leading-tight mb-2 uppercase tracking-tight">{selectedBook.title}</h3>
                      <p className="text-xs text-gray-400 font-black uppercase tracking-[0.3em]">{selectedBook.author}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 w-full mb-8">
                    <div className="bg-gray-50 p-5 rounded-[32px] border border-gray-100/50 flex flex-col items-center text-center">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <CheckCircle2 size={16} className="text-green-600" />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Available</p>
                      <p className="text-2xl font-black text-gray-900">{selectedBook.available_copies}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-[32px] border border-gray-100/50 flex flex-col items-center text-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                        <BookOpen size={16} className="text-blue-600" />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Copies</p>
                      <p className="text-2xl font-black text-gray-900">{selectedBook.total_copies}</p>
                    </div>
                  </div>

                  <div className="w-full bg-white p-6 rounded-[32px] flex flex-col items-center justify-center border border-gray-100 shadow-sm mb-10 overflow-hidden">
                    <Barcode 
                      value={selectedBook.barcode} 
                      width={1.5} 
                      height={60} 
                      fontSize={12} 
                      background="transparent"
                      lineColor="#1e293b"
                    />
                    <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Scan Book Barcode</p>
                  </div>
                  
                  {/* Recent Activity for Book */}
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <History size={14} className="text-blue-600" />
                        Circulation History
                      </h4>
                    </div>
                    
                    <div className="space-y-3">
                      {detailLoading ? (
                        <div className="py-10 text-center flex flex-col items-center gap-2 bg-gray-50 rounded-[32px]">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accessing records...</p>
                        </div>
                      ) : selectedBook.history?.length > 0 ? (
                        selectedBook.history.map((t: any) => (
                          <div key={t.id} className="p-4 bg-white border border-gray-100 rounded-3xl flex items-center justify-between hover:border-blue-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                                <User size={18} />
                              </div>
                              <div>
                                <p className="text-xs font-black text-gray-900 leading-tight mb-0.5">{t.student_name}</p>
                                <div className="flex items-center gap-3">
                                  <p className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                    <Calendar size={10} /> {format(new Date(t.issue_date), 'MMM dd')}
                                  </p>
                                  {t.return_date && (
                                    <p className="text-[9px] font-bold text-green-500 uppercase flex items-center gap-1">
                                      <CheckCircle2 size={10} /> Returned
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            {!t.return_date && (
                              <div className="text-right">
                                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">DUE BY</span>
                                <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">
                                  {format(new Date(t.due_date), 'MMM dd')}
                                </span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                          <History className="mx-auto text-gray-300 mb-2" size={32} />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Circulation Found</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full mt-10">
                    <button 
                      onClick={() => { setSelectedBook(null); setIsEditing(false); }}
                      className="py-5 border border-gray-100 text-gray-500 font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all text-[10px]"
                    >
                      Close Details
                    </button>
                    <button 
                      onClick={startEditing}
                      className="py-5 bg-gray-900 text-white font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg shadow-gray-200 text-[10px]"
                    >
                      Edit Status
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleUpdate} className="w-full space-y-6 pt-4">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 leading-tight">Edit Information</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Refine book metadata</p>
                    </div>
                    <button type="button" onClick={() => setIsEditing(false)} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 transition-colors hover:bg-gray-100"><X size={20} /></button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Book Title</label>
                      <input 
                        required
                        value={editData.title}
                        onChange={e => setEditData({...editData, title: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Author Name</label>
                      <input 
                        required
                        value={editData.author}
                        onChange={e => setEditData({...editData, author: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Total Stock</label>
                        <input 
                          type="number"
                          min="0"
                          value={editData.total_copies}
                          onChange={e => setEditData({...editData, total_copies: parseInt(e.target.value) || 0})}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Currently Avbl</label>
                        <input 
                          type="number"
                          min="0"
                          max={editData.total_copies}
                          value={editData.available_copies}
                          onChange={e => setEditData({...editData, available_copies: parseInt(e.target.value) || 0})}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Circulation Status</label>
                      <select 
                        value={editData.status}
                        onChange={e => setEditData({...editData, status: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-black uppercase tracking-widest appearance-none shadow-xs"
                      >
                        <option value="Available">✓ Available</option>
                        <option value="Issued">➜ Issued Out</option>
                        <option value="Maintenance">🛠 Maintenance</option>
                        <option value="Lost">✖ Lost / Missing</option>
                        <option value="Archived">📁 Archived</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6">
                    <button 
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="py-5 border border-gray-100 text-gray-400 font-black uppercase tracking-widest rounded-2xl text-[10px]"
                    >
                      Cancel Changes
                    </button>
                    <button 
                      type="submit"
                      disabled={formLoading}
                      className="py-5 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-600/20 disabled:opacity-50 text-[10px]"
                    >
                      {formLoading ? 'Synchronizing...' : 'Apply Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
            onClick={() => setShowAdd(false)} 
          />
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-md bg-white rounded-t-[44px] sm:rounded-3xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">Add New Book</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Register new catalog item</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Book Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold" placeholder="The Great Gatsby" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Author / Writer</label>
                <input required value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold" placeholder="F. Scott Fitzgerald" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Unique Barcode</label>
                  <div className="flex gap-2">
                    <input 
                      required 
                      value={formData.barcode} 
                      onChange={e => setFormData({...formData, barcode: e.target.value.toUpperCase()})} 
                      className="flex-1 px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-mono font-black" 
                      placeholder="ISBN or ID" 
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const randomId = 'BK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                        setFormData({...formData, barcode: randomId});
                      }}
                      className="px-4 py-4 bg-white border border-gray-200 rounded-2xl text-blue-600 hover:bg-blue-50 transition-colors shadow-xs"
                      title="Generate Random ID"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Copies</label>
                  <input required type="number" min="1" value={formData.total_copies} onChange={e => setFormData({...formData, total_copies: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold" />
                </div>
              </div>

              {formData.barcode && (
                <div className="p-4 bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center overflow-hidden">
                  <Barcode 
                    value={formData.barcode} 
                    width={1.2} 
                    height={40} 
                    fontSize={10}
                    background="transparent"
                  />
                </div>
              )}
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <p className="text-[10px] text-blue-600 font-bold text-center leading-relaxed">
                  Scanning this book's barcode later will instantly show this catalog entry.
                </p>
              </div>
              <button disabled={formLoading} className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl mt-4 shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all text-[11px]">
                {formLoading ? 'Indexing Catalog...' : 'Validate & Add Item'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

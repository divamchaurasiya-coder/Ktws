import { useState, useEffect, FormEvent } from 'react';
import { api } from '../lib/api';
import { BookOpen, Plus, X, Search, Barcode } from 'lucide-react';

export default function BooksView() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<any>(null);
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
            <div 
              key={book.id} 
              onClick={() => setSelectedBook(book)}
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
                    <Barcode size={10} /> {book.barcode}
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${book.available_copies > 0 ? 'bg-[#DCFCE7] text-[#10B981]' : 'bg-[#FEE2E2] text-[#EF4444]'}`}>
                    {book.available_copies} / {book.total_copies} AVBL
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-gray-400 text-xs italic bg-white rounded-2xl border border-dashed border-gray-200">No books in catalog</div>
        )}
      </div>

      {/* Book Detail Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => { setSelectedBook(null); setIsEditing(false); }} />
          <div className="relative w-full max-w-md bg-white rounded-t-[44px] sm:rounded-[40px] shadow-2xl p-8 sm:p-10 flex flex-col items-center">
            
            {!isEditing ? (
              <>
                <div className="w-20 h-28 bg-[#EEF2FF] rounded-[24px] flex items-center justify-center text-[#4F46E5] mb-6 shadow-lg shadow-[#4F46E5]/10 border-4 border-white">
                  <BookOpen size={40} />
                </div>
                
                <h3 className="text-xl font-black text-[#1A1A1A] text-center leading-tight mb-2 px-4">{selectedBook.title}</h3>
                <p className="text-sm text-[#64748B] font-bold uppercase tracking-widest mb-8">{selectedBook.author}</p>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="bg-[#F8FAFC] p-4 rounded-3xl border border-[#F1F5F9] text-center">
                    <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Available</p>
                    <p className="text-xl font-black text-[#10B981]">{selectedBook.available_copies}</p>
                  </div>
                  <div className="bg-[#F8FAFC] p-4 rounded-3xl border border-[#F1F5F9] text-center">
                    <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Total</p>
                    <p className="text-xl font-black text-[#4F46E5]">{selectedBook.total_copies}</p>
                  </div>
                </div>

                <div className="w-full bg-[#EEF2FF] p-5 rounded-[24px] flex flex-col items-center gap-2 mb-10">
                  <p className="text-[10px] font-black text-[#4F46E5]/60 uppercase tracking-[0.2em]">ISBN Barcode</p>
                  <div className="flex items-center gap-3">
                    <Barcode size={24} className="text-[#4F46E5]" />
                    <span className="text-lg font-black text-[#4F46E5] tracking-tight">{selectedBook.barcode}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => { setSelectedBook(null); setIsEditing(false); }}
                    className="py-5 bg-white border border-[#F1F5F9] text-[#64748B] font-bold rounded-2xl active:scale-95 transition-transform"
                  >
                    Close
                  </button>
                  <button 
                    onClick={startEditing}
                    className="py-5 bg-[#4F46E5] text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-[#4F46E5]/20"
                  >
                    Edit Status
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleUpdate} className="w-full space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-black text-[#1A1A1A]">Edit Information</h3>
                  <button type="button" onClick={() => setIsEditing(false)} className="text-[#64748B]"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Book Title</label>
                    <input 
                      required
                      value={editData.title}
                      onChange={e => setEditData({...editData, title: e.target.value})}
                      className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Author</label>
                    <input 
                      required
                      value={editData.author}
                      onChange={e => setEditData({...editData, author: e.target.value})}
                      className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden text-sm font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Total Copies</label>
                      <input 
                        type="number"
                        min="0"
                        value={editData.total_copies}
                        onChange={e => setEditData({...editData, total_copies: parseInt(e.target.value)})}
                        className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Available</label>
                      <input 
                        type="number"
                        min="0"
                        max={editData.total_copies}
                        value={editData.available_copies}
                        onChange={e => setEditData({...editData, available_copies: parseInt(e.target.value)})}
                        className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Book Status</label>
                    <select 
                      value={editData.status}
                      onChange={e => setEditData({...editData, status: e.target.value})}
                      className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden text-sm font-bold appearance-none"
                    >
                      <option value="Available">Available</option>
                      <option value="Issued">Issued</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Lost">Lost</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="py-5 border border-[#F1F5F9] text-[#64748B] font-bold rounded-2xl"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={formLoading}
                    className="py-5 bg-[#4F46E5] text-white font-bold rounded-2xl shadow-lg shadow-[#4F46E5]/30 disabled:opacity-50"
                  >
                    {formLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-[44px] sm:rounded-3xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Add New Book</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 text-gray-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Book Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Author Name</label>
                <input required value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">ISBN / Barcode</label>
                  <input required value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden" placeholder="ISBN or Code" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Total Copies</label>
                  <input required type="number" min="1" value={formData.total_copies} onChange={e => setFormData({...formData, total_copies: parseInt(e.target.value)})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden" />
                </div>
              </div>
              <p className="text-[10px] text-[#94A3B8] italic text-center px-4">Scanning a book QR/ISBN later from home will show this info instantly.</p>
              <button disabled={formLoading} className="w-full py-5 bg-[#4F46E5] text-white font-bold rounded-2xl mt-4 shadow-lg shadow-[#4F46E5]/30">
                {formLoading ? 'Saving...' : 'Add to Catalog'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

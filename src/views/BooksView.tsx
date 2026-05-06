import { useState, useEffect, FormEvent, useRef } from 'react';
import { api } from '../lib/api';
import { BookOpen, Map as MapIcon, Plus, X, Search, Barcode as BarcodeIcon, History, User, Calendar, CheckCircle2, Clock, Scan, FileDown, FileUp, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import Barcode from 'react-barcode';
import Scanner from '../components/Scanner';
import { generateBookReport } from '../lib/reportGenerator';
import ExcelJS from 'exceljs';

export default function BooksView() {
  const [books, setBooks] = useState<any[]>([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showSmartAdd, setShowSmartAdd] = useState(false);
  const [smartScanLoading, setSmartScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [selectedBook, setSelectedBookState] = useState<any>(null);

  const setSelectedBook = (book: any, pushState = true) => {
    setSelectedBookState(book);
    if (book && pushState) {
      window.history.pushState({ modal: 'book-detail', id: book.barcode }, '', window.location.hash);
    }
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!event.state || (event.state.modal !== 'book-detail' && event.state.modal !== 'book-edit')) {
        setSelectedBookState(null);
        setIsEditing(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({ 
    title: '', 
    author: '', 
    barcode: '', 
    total_copies: 1,
    edition: '1st',
    vol: '-',
    publisher: '',
    published_year: '',
    category: 'General',
    source: 'Vendor',
    bill_no: '-',
    cost: '0.00',
    location_code: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    fetchBooks(1, true);
  }, [debouncedSearch]);

  const fetchBooks = async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      let data;
      if (debouncedSearch) {
        data = await api.books.search(debouncedSearch);
        setBooks(data);
        setHasMore(false);
        setTotalBooks(data.length);
      } else {
        const response = await api.books.list(pageNum, 20);
        const { data: newBooks, total } = response;
        
        if (reset) {
          setBooks(newBooks);
        } else {
          setBooks(prev => [...prev, ...newBooks]);
        }
        
        setTotalBooks(total);
        setHasMore(books.length + newBooks.length < total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchBooks(nextPage);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const statsData = await api.dashboard.getStats();
      const allBooks = await api.books.list(); // Ensure we have the latest list
      
      const reportStats = {
        totalBooks: statsData.stats.totalBooks,
        issuedBooks: statsData.stats.issuedBooks,
        availableBooks: statsData.stats.totalBooks - statsData.stats.issuedBooks,
        overdueBooks: statsData.stats.overdueBooks,
        totalCategories: new Set(allBooks.map(b => b.category || 'General')).size
      };

      await generateBookReport(allBooks, reportStats);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      
      if (!worksheet) throw new Error('Could not read worksheet');

      const importedBooks: any[] = [];
      
      // Columns: A: SR, B: DATE, C: ACC. NO., D: AUTHOR, E: TITLE, F: EDITION, G: VOL, H: PUBLISHER, I: YEAR, J: SOURCE, K: BILL NO, L: COST, M: CLASS NO, N: REMARKS
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber < 12) return;

        const barcode = row.getCell(3).value?.toString();
        const author = row.getCell(4).value?.toString();
        const title = (row.getCell(5).value as any)?.richText ? (row.getCell(5).value as any).richText.map((rt: any) => rt.text).join('') : row.getCell(5).value?.toString();
        const edition = row.getCell(6).value?.toString() || '1st';
        const vol = row.getCell(7).value?.toString() || '-';
        const publisher = row.getCell(8).value?.toString() || 'N/A';
        const year = row.getCell(9).value?.toString() || '-';
        const source = row.getCell(10).value?.toString() || 'Vendor';
        const bill = row.getCell(11).value?.toString() || '-';
        const cost = row.getCell(12).value?.toString() || '0.00';
        const category = row.getCell(13).value?.toString() || 'General';

        if (title && author) {
          importedBooks.push({
            barcode: barcode || `BC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            title,
            author,
            category,
            total_copies: 1,
            available_copies: 1,
            status: 'Available',
            edition,
            vol,
            publisher,
            published_year: year,
            source,
            bill_no: bill,
            cost
          });
        }
      });

      if (importedBooks.length === 0) {
        throw new Error('No valid book records found in the Excel file.');
      }

      let successCount = 0;
      for (const book of importedBooks) {
        try {
          await api.books.create(book);
          successCount++;
        } catch (err) {
          console.warn(`Failed to import book: ${book.title}`, err);
        }
      }

      alert(`Successfully imported ${successCount} out of ${importedBooks.length} books.`);
      fetchBooks();
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      setFormData({ 
        title: '', 
        author: '', 
        barcode: '', 
        total_copies: 1,
        edition: '1st',
        vol: '-',
        publisher: '',
        published_year: '',
        category: 'General',
        source: 'Vendor',
        bill_no: '-',
        cost: '0.00',
        location_code: ''
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const findEmptySlot = async () => {
    try {
      const locations = await api.books.getLocations();
      const racks = ['A', 'B', 'C', 'D'];
      const slots = Array.from({ length: 10 }, (_, i) => i + 1);

      for (const r of racks) {
        for (const s of slots) {
          const code = `${r}-${s.toString().padStart(2, '0')}`;
          if (!locations[code]) return code;
        }
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
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

  const handleDelete = async () => {
    if (!selectedBook) return;
    if (!window.confirm(`Are you absolutely sure you want to delete "${selectedBook.title}"? This will remove all copies and circulation history.`)) return;
    
    setDetailLoading(true);
    try {
      await api.books.delete(selectedBook.id);
      await fetchBooks();
      setSelectedBook(null);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDetailLoading(true);
    }
  };

  const handleSmartScan = async (barcode: string) => {
    setSmartScanLoading(true);
    setManualMode(false);
    try {
      const result = await api.books.scan(barcode);
      setScanResult(result);
      if (result.status === 'updated') {
        await fetchBooks();
        setTimeout(() => {
          setShowSmartAdd(false);
          setScanResult(null);
        }, 2000);
      }
    } catch (err: any) {
      if (err.status === 404) {
        setManualBarcode(barcode);
        setManualMode(true);
      } else {
        alert(err.message || 'Error scanning book');
      }
    } finally {
      setSmartScanLoading(false);
    }
  };

  const handleManualSave = async (e: FormEvent) => {
    e.preventDefault();
    const data = {
      title: formData.title,
      author: formData.author,
      barcode: manualBarcode,
      total_copies: 1,
      available_copies: 1,
      status: 'Available',
      edition: formData.edition || '1st',
      vol: formData.vol || '-',
      publisher: formData.publisher || 'N/A',
      published_year: formData.published_year || '-',
      category: formData.category || 'General',
      source: formData.source || 'Vendor',
      bill_no: formData.bill_no || '-',
      cost: formData.cost || '0.00',
      location_code: formData.location_code || ''
    };

    try {
      setSmartScanLoading(true);
      await api.books.create(data);
      await fetchBooks();
      setScanResult({ status: 'created', message: 'Manually added', data });
      setManualMode(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSmartScanLoading(false);
    }
  };

  const adjustCopies = async (book: any, delta: number) => {
    const newTotal = Math.max(0, book.total_copies + delta);
    const newAvbl = Math.max(0, book.available_copies + delta);
    
    // Safety: don't let it go below 0 or remove a book that is currently issued (if avbl is 0 and we decrement total)
    if (delta < 0 && book.available_copies <= 0) {
      alert("Cannot remove a copy because all copies are currently issued out.");
      return;
    }

    try {
      setDetailLoading(true);
      const updated = await api.books.update(book.id, {
        total_copies: newTotal,
        available_copies: newAvbl
      });
      setSelectedBook({ ...selectedBook, ...updated });
      await fetchBooks();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const startEditing = () => {
    setEditData({
      title: selectedBook.title,
      author: selectedBook.author,
      total_copies: selectedBook.total_copies,
      available_copies: selectedBook.available_copies,
      status: selectedBook.status || 'Available',
      edition: selectedBook.edition || '1st',
      vol: selectedBook.vol || '-',
      publisher: selectedBook.publisher || 'N/A',
      published_year: selectedBook.published_year || '-',
      category: selectedBook.category || 'General',
      source: selectedBook.source || 'Vendor',
      bill_no: selectedBook.bill_no || '-',
      cost: selectedBook.cost || '0.00',
      location_code: selectedBook.location_code || ''
    });
    setIsEditing(true);
  };

  const filtered = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase()) ||
    b.barcode.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (search && filtered.length === 1 && !selectedBook) {
      handleBookClick(filtered[0]);
    }
  }, [search, filtered.length]);

  return (
    <div className="space-y-6 pt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tighter">Library Catalog</h2>
        <div className="flex gap-2">
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx"
            className="hidden"
          />
          <button 
            onClick={handleImportClick}
            disabled={importing}
            className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform disabled:opacity-50"
            title="Import Excel Report"
          >
            {importing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileUp size={20} />
            )}
          </button>
          <button 
            onClick={handleExport}
            disabled={exporting}
            className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30 active:scale-95 transition-transform disabled:opacity-50"
            title="Export Excel Report"
          >
            {exporting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileDown size={20} />
            )}
          </button>
          <button 
            onClick={() => setShowSmartAdd(true)}
            className="w-10 h-10 bg-[#10B981] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#10B981]/30 active:scale-95 transition-transform"
            title="Smart Add (Scan Barcode)"
          >
            <Scan size={20} />
          </button>
          <button 
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#4F46E5]/30 active:scale-95 transition-transform"
            title="Manual Add"
          >
            <Plus size={24} />
          </button>
        </div>
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
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-[#F1F5F9] shadow-xs flex items-start gap-4 animate-pulse">
              <div className="w-12 h-16 bg-gray-100 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-50 rounded w-1/2" />
                <div className="flex gap-2 pt-2">
                  <div className="h-4 bg-gray-50 rounded-full w-16" />
                  <div className="h-4 bg-gray-50 rounded-full w-20" />
                </div>
              </div>
            </div>
          ))
        ) : books.length > 0 ? (
          <>
            {books.map(book => (
              <motion.div 
                key={book.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleBookClick(book)}
                className="bg-white p-4 rounded-2xl border border-[#F1F5F9] shadow-xs flex items-start gap-4 active:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div className="w-12 h-16 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#4F46E5] shrink-0 border border-[#E0E7FF] group-hover:scale-105 transition-transform">
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
            ))}
            
            {hasMore && !debouncedSearch && (
              <button 
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-4 bg-white rounded-2xl border border-dashed border-gray-200 text-xs font-bold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
              >
                {loadingMore ? (
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  'LOAD MORE BOOKS'
                )}
              </button>
            )}
          </>
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

                  {selectedBook.location_code && (
                    <div className="mb-8 p-6 bg-indigo-600 rounded-[32px] text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em] mb-1">SHELF LOCATION</p>
                          <p className="text-3xl font-black tracking-tighter">BIN {selectedBook.location_code}</p>
                        </div>
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                          <MapIcon size={28} />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 w-full mb-8">
                    <div className="bg-gray-50 p-5 rounded-[32px] border border-gray-100/50 flex flex-col items-center text-center relative group">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <CheckCircle2 size={16} className="text-green-600" />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Available</p>
                      <p className="text-2xl font-black text-gray-900">{selectedBook.available_copies}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-[32px] border border-gray-100/50 flex flex-col items-center text-center relative group">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                        <BookOpen size={16} className="text-blue-600" />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Copies</p>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => adjustCopies(selectedBook, -1)}
                          className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-red-500 hover:bg-red-50 active:scale-90 transition-all shadow-xs"
                          title="Remove Copy"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                        <p className="text-2xl font-black text-gray-900">{selectedBook.total_copies}</p>
                        <button 
                          onClick={() => adjustCopies(selectedBook, 1)}
                          className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-green-500 hover:bg-green-50 active:scale-90 transition-all shadow-xs"
                          title="Add Copy"
                        >
                          <Plus size={12} strokeWidth={3} />
                        </button>
                      </div>
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
                    <button 
                      onClick={handleDelete}
                      className="col-span-2 py-4 bg-red-50 text-red-600 font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all border border-red-100 text-[10px] flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} /> Remove Book from Catalog
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
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Edition</label>
                        <input value={editData.edition} onChange={e => setEditData({...editData, edition: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Volume (Vol)</label>
                        <input value={editData.vol} onChange={e => setEditData({...editData, vol: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Publisher</label>
                        <input value={editData.publisher} onChange={e => setEditData({...editData, publisher: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Year</label>
                        <input value={editData.published_year} onChange={e => setEditData({...editData, published_year: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Category / Class No.</label>
                        <input value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Source / Vendor</label>
                        <input value={editData.source} onChange={e => setEditData({...editData, source: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Bill No. & Date</label>
                        <input value={editData.bill_no} onChange={e => setEditData({...editData, bill_no: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cost</label>
                        <input value={editData.cost} onChange={e => setEditData({...editData, cost: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Shelf Location (A-01)</label>
                        <div className="flex gap-2">
                          <input value={editData.location_code} onChange={e => setEditData({...editData, location_code: e.target.value.toUpperCase()})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs" placeholder="A-01" />
                          <button 
                            type="button"
                            onClick={async () => {
                              const slot = await findEmptySlot();
                              if (slot) setEditData({...editData, location_code: slot});
                              else alert('No empty slots found!');
                            }}
                            className="bg-gray-100 text-gray-500 px-3 rounded-2xl font-bold text-xs hover:bg-gray-200"
                            title="Auto Find"
                          >
                            <Scan size={14} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Total Stock</label>
                        <input 
                          type="number"
                          min="0"
                          value={editData.total_copies}
                          onChange={e => {
                            const newTotal = parseInt(e.target.value) || 0;
                            const diff = newTotal - editData.total_copies;
                            setEditData({
                              ...editData, 
                              total_copies: newTotal,
                              available_copies: Math.max(0, editData.available_copies + diff)
                            });
                          }}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Currently Avbl (Auto)</label>
                        <input 
                          type="number"
                          readOnly
                          value={editData.available_copies}
                          className="w-full px-5 py-4 bg-gray-100 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-none text-gray-400 cursor-not-allowed"
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
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Publisher</label>
                  <input value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold" placeholder="HarperCollins" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Year</label>
                  <input value={formData.published_year} onChange={e => setFormData({...formData, published_year: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold" placeholder="2023" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Edition</label>
                  <input value={formData.edition} onChange={e => setFormData({...formData, edition: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold" placeholder="1st" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Volume (Vol)</label>
                  <input value={formData.vol} onChange={e => setFormData({...formData, vol: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold" placeholder="-" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Category / Class No.</label>
                  <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold" placeholder="DDC Code or Name" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Source / Vendor</label>
                  <input value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold" placeholder="Vendor Name" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Bill No. & Date</label>
                  <input value={formData.bill_no} onChange={e => setFormData({...formData, bill_no: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold" placeholder="BN-1234/2023" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cost</label>
                  <input value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold" placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Shelf Location (A-01)</label>
                  <div className="flex gap-2">
                    <input 
                      value={formData.location_code} 
                      onChange={e => setFormData({...formData, location_code: e.target.value.toUpperCase()})} 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold" 
                      placeholder="A-01" 
                    />
                    <button 
                      type="button"
                      onClick={async () => {
                        const slot = await findEmptySlot();
                        if (slot) setFormData({...formData, location_code: slot});
                        else alert('No empty slots found!');
                      }}
                      className="bg-gray-100 text-gray-500 px-3 rounded-2xl font-bold text-xs hover:bg-gray-200"
                    >
                      <Scan size={14} />
                    </button>
                  </div>
                </div>
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
      {/* Smart Scan Modal */}
      {showSmartAdd && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" 
            onClick={() => { setShowSmartAdd(false); setScanResult(null); }} 
          />
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-md bg-white rounded-t-[44px] sm:rounded-3xl shadow-2xl p-8 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">Smart Scan Add</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Instant barcode recognition</p>
              </div>
              <button onClick={() => { setShowSmartAdd(false); setScanResult(null); }} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><X size={24} /></button>
            </div>

            {!scanResult ? (
              <div className="space-y-6">
                {!manualMode ? (
                  <>
                    <Scanner onScan={handleSmartScan} label="Scan Book Barcode/ISBN" />
                    {smartScanLoading && (
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">Searching Databases...</p>
                      </div>
                    )}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                      <BookOpen className="text-blue-500 shrink-0" size={18} />
                      <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                        Point your camera at the ISBN barcode. We'll try Google Books and Open Library first.
                      </p>
                    </div>
                  </>
                ) : (
                  <form onSubmit={handleManualSave} className="space-y-4 animate-in slide-in-from-right duration-300">
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-2">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Not Found Online</p>
                      <p className="text-[11px] text-amber-600 font-bold mt-1">Barcode: {manualBarcode}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Book Title</label>
                      <input name="title" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="Enter title" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Edition</label>
                      <input name="edition" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="1st" defaultValue="1st" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Publisher</label>
                      <input name="publisher" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="Publisher Name" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Year</label>
                      <input name="published_year" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="2023" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Category / Class No.</label>
                      <input name="category" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="General" defaultValue="General" />
                    </div>
                    <button 
                      type="submit" 
                      disabled={smartScanLoading}
                      className="w-full py-4 bg-gray-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-gray-200 mt-2 disabled:opacity-50"
                    >
                      {smartScanLoading ? 'Saving...' : 'Save Book'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setManualMode(false)}
                      className="w-full py-2 text-gray-400 text-[10px] font-black uppercase tracking-widest"
                    >
                      Retry Scan
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-6 text-center py-4">
                {scanResult.status === 'updated' ? (
                  <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                      <CheckCircle2 size={48} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-gray-900 leading-tight mb-2">Book Updated!</p>
                      <p className="text-xs font-bold text-gray-500">{scanResult.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col items-center">
                      {scanResult.data.thumbnail ? (
                        <img 
                          src={scanResult.data.thumbnail} 
                          alt="Thumbnail" 
                          referrerPolicy="no-referrer"
                          className="w-24 h-36 object-cover rounded-xl shadow-lg mb-6 border-4 border-white rotate-2" 
                        />
                      ) : (
                        <div className="w-24 h-36 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300 mb-6 border-4 border-white rotate-2 shadow-lg">
                          <BookOpen size={40} />
                        </div>
                      )}
                      <h4 className="text-xl font-black text-gray-900 leading-tight px-4">{scanResult.data.title}</h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{scanResult.data.author}</p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                      <p className="text-[11px] font-black text-green-600 uppercase tracking-widest">Successfully Added to Library</p>
                    </div>

                    <button 
                      onClick={() => { setShowSmartAdd(false); setScanResult(null); fetchBooks(); }}
                      className="w-full py-5 bg-gray-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-gray-200"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

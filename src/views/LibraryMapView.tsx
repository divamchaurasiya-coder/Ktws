import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Search, Map as MapIcon, Info, CheckCircle2, XCircle, MousePointer2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const RACKS = ['A', 'B', 'C', 'D'];
const SLOTS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function LibraryMapView() {
  const [locationMap, setLocationMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [highlightedCell, setHighlightedCell] = useState<string | null>(null);
  const [assigningBarcode, setAssigningBarcode] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const data = await api.books.getLocations();
      setLocationMap(data);
    } catch (err) {
      console.error('Failed to fetch locations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    try {
      const results = await api.books.search(searchQuery);
      if (results.length > 0) {
        const book = results[0];
        if (book.location_code) {
          setHighlightedCell(book.location_code);
          setSelectedCell(book.location_code);
          // Auto-scroll logic could go here if needed
        } else {
          alert(`Book "${book.title}" found but has no assigned location.`);
        }
      } else {
        alert('No book found matching that physical identifier.');
      }
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  const handleCellClick = (locationCode: string) => {
    setSelectedCell(locationCode);
    setHighlightedCell(null);
  };

  const bookAtSelected = selectedCell ? locationMap[selectedCell] : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1A1A1A] tracking-tighter flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
              <MapIcon size={24} />
            </div>
            LIBRARY MAP
          </h1>
          <p className="text-gray-500 font-medium mt-1">Visual physical inventory navigator</p>
        </div>

        <form onSubmit={handleSearch} className="relative group">
          <input 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search book title or barcode..."
            className="w-full md:w-80 pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-sm shadow-sm group-hover:border-indigo-100 focus:border-indigo-400"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-500 transition-colors" size={20} />
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visual Grid */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Column Labels */}
            <div className="flex mb-4">
              <div className="w-12" /> {/* Space for row labels */}
              {SLOTS.map(s => (
                <div key={s} className="flex-1 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">
                  {s.toString().padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* Grid Rows */}
            <div className="space-y-4">
              {RACKS.map(rack => (
                <div key={rack} className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl text-lg font-black text-gray-400">
                    {rack}
                  </div>
                  <div className="flex-1 flex gap-2">
                    {SLOTS.map(slot => {
                      const code = `${rack}-${slot.toString().padStart(2, '0')}`;
                      const isOccupied = !!locationMap[code];
                      const isSelected = selectedCell === code;
                      const isHighlighted = highlightedCell === code;

                      return (
                        <motion.button
                          key={code}
                          whileHover={{ scale: 1.1, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleCellClick(code)}
                          className={`
                            flex-1 aspect-square rounded-xl border-2 transition-all flex items-center justify-center relative
                            ${isOccupied ? 'bg-red-50 border-red-200 text-red-500' : 'bg-emerald-50 border-emerald-100 text-emerald-500 hover:border-emerald-300'}
                            ${isSelected ? 'ring-4 ring-indigo-500/20 border-indigo-500 !bg-indigo-50 !text-indigo-600 scale-105 z-10' : ''}
                            ${isHighlighted ? 'animate-pulse ring-4 ring-yellow-400 border-yellow-500 scale-110 z-20' : ''}
                          `}
                        >
                          {isOccupied ? <div className="w-2 h-2 rounded-full bg-red-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 opacity-50" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex gap-6 mt-12 pt-8 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-50 border-2 border-emerald-100 rounded-md" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Empty Spot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-50 border-2 border-red-200 rounded-md flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-indigo-50 border-2 border-indigo-500 rounded-md" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Selected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {selectedCell ? (
              <motion.div
                key={selectedCell}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    LOCATION {selectedCell}
                  </div>
                  {bookAtSelected ? (
                    <CheckCircle2 className="text-emerald-500" size={20} />
                  ) : (
                    <XCircle className="text-gray-300" size={20} />
                  )}
                </div>

                {bookAtSelected ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 leading-tight">{bookAtSelected.title}</h3>
                      <p className="text-gray-500 font-medium">{bookAtSelected.author}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Barcode</div>
                        <div className="font-mono font-bold text-indigo-600">{bookAtSelected.barcode}</div>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-colors">
                        View Full Details
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                      <MousePointer2 size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Slot Available</h3>
                    <p className="text-gray-500 text-sm mt-1 px-4">This position is currently empty and can be assigned to a new book.</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
                <Info size={32} className="mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">How it works</h3>
                <ul className="space-y-4 opacity-90 text-sm">
                  <li className="flex gap-3">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black italic">1</div>
                    Each box represents a physical book position in the library racks.
                  </li>
                  <li className="flex gap-3">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black italic">2</div>
                    Click on any cell to view book details or manage assignment.
                  </li>
                  <li className="flex gap-3">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black italic">3</div>
                    Search for a book by title or barcode to highlight its shelf position.
                  </li>
                </ul>
              </div>
            )}
          </AnimatePresence>

          {/* Quick Stats */}
          <div className="bg-gray-900 rounded-3xl p-6 text-white overflow-hidden relative">
            <div className="relative z-10">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Capacity Status</div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-3xl font-black">{Math.round((Object.keys(locationMap).length / (RACKS.length * SLOTS.length)) * 100)}%</div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Racks Occupied</div>
                </div>
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(Object.keys(locationMap).length / (RACKS.length * SLOTS.length)) * 100}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

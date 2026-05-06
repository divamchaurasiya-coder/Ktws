import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Search, Map as MapIcon, Info, CheckCircle2, XCircle, MousePointer2, Settings, Plus, Trash2, Save, MoreVertical, LayoutIcon, Columns, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MapConfig {
  racks: string[];
  slots_per_rack: number;
  layout: 'grid' | 'aisle';
}

export default function LibraryMapView() {
  const [locationMap, setLocationMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [highlightedCell, setHighlightedCell] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const [config, setConfig] = useState<MapConfig>({
    racks: ['K', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'],
    slots_per_rack: 10,
    layout: 'aisle'
  });

  const [pendingConfig, setPendingConfig] = useState<MapConfig>(config);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [mapData, configData] = await Promise.all([
        api.books.getLocations(),
        api.settings.getMap()
      ]);
      
      if (mapData.error) {
        if (mapData.error.includes('location_code')) {
          setDbError('DATABASE_OUTDATED');
        } else {
          setDbError(mapData.error);
        }
      } else {
        setLocationMap(mapData);
      }

      if (configData && configData.racks) {
        setConfig(configData);
        setPendingConfig(configData);
      }
    } catch (err) {
      console.error('Failed to fetch initial data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await api.settings.saveMap(pendingConfig);
      setConfig(pendingConfig);
      setShowSettings(false);
      fetchInitialData(); // Refresh slots
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  const handleSearchInputChange = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await api.books.search(val);
      setSearchResults(results.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectSearchResult = (book: any) => {
    if (book.location_code) {
      setHighlightedCell(book.location_code);
      setSelectedCell(book.location_code);
    } else {
      alert(`Book "${book.title}" is in catalog but has no shelf assigned.`);
    }
    setSearchResults([]);
    setSearchQuery(book.title);
  };

  const handleAssignBook = async (barcode: string) => {
    if (!selectedCell) return;
    setAssigningLoading(true);
    try {
      await api.books.assignLocation(barcode, selectedCell);
      await fetchInitialData();
      setSearchResults([]);
      setSearchQuery('');
    } catch (err: any) {
      alert(err.message || 'Failed to assign');
    } finally {
      setAssigningLoading(false);
    }
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [newBookData, setNewBookData] = useState({
    title: '',
    author: '',
    barcode: '',
    category: 'General'
  });

  const handleCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;
    setAssigningLoading(true);
    try {
      // 1. Create the book
      await api.books.create({
        ...newBookData,
        location_code: selectedCell,
        total_copies: 1,
        available_copies: 1,
      });
      
      // 2. Refresh
      await fetchInitialData();
      setShowAddModal(false);
      setNewBookData({ title: '', author: '', barcode: '', category: 'General' });
    } catch (err: any) {
      alert(err.message || 'Failed to create book');
    } finally {
      setAssigningLoading(false);
    }
  };

  if (dbError === 'DATABASE_OUTDATED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white rounded-3xl border-2 border-dashed border-red-200">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 text-red-500">
          <XCircle size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tighter">DATABASE UPDATE REQUIRED</h2>
        <p className="text-gray-500 max-w-md mt-2 font-medium">
          The 'location_code' column is missing from your database. Please visit the **DATABASE_SCHEMA.md** file and run the migration SQL in your Supabase SQL Editor.
        </p>
        <button 
          onClick={fetchInitialData}
          className="mt-8 px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
        >
          Check Connectivity Again
        </button>
      </div>
    );
  }

  const SLOTS = Array.from({ length: config.slots_per_rack }, (_, i) => i + 1);

  const renderRack = (rack: string) => {
    if (!config.racks.includes(rack)) return null;

    return (
      <div key={rack} className={`
        flex group
        ${config.layout === 'aisle' ? 'flex-row items-center gap-1.5 md:gap-4' : 'flex-row items-center gap-6'}
      `}>
        <div className={`
          flex-1 flex
          ${config.layout === 'aisle' ? 'flex-nowrap gap-1.5 justify-end' : 'flex-wrap gap-3 overflow-x-auto pb-2'}
        `}>
          {SLOTS.map(slot => {
            const code = `${rack}-${slot.toString().padStart(2, '0')}`;
            const book = locationMap[code];
            const isOccupied = !!book;
            const isSelected = selectedCell === code;
            const isHighlighted = highlightedCell === code;

            return (
              <motion.button
                key={code}
                whileHover={{ scale: 1.2, zIndex: 30, y: -4 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setSelectedCell(code);
                  setHighlightedCell(null);
                }}
                className={`
                  rounded-xl border-2 transition-all flex items-center justify-center shrink-0 relative
                  ${config.layout === 'aisle' ? 'w-10 h-14' : 'w-12 h-12'}
                  ${isOccupied ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-emerald-50 border-emerald-100 hover:border-emerald-300'}
                  ${isSelected ? 'ring-8 ring-indigo-500/20 border-indigo-600 !bg-indigo-600 !text-white z-20 scale-125' : ''}
                  ${isHighlighted ? 'animate-pulse ring-8 ring-yellow-400 border-yellow-500 scale-150 z-30' : ''}
                `}
              >
                {isOccupied && !isSelected && (
                  <motion.div 
                    layoutId={`indicator-${code}`}
                    className="w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-white" 
                  />
                )}
                {!isOccupied && !isSelected && (
                  <div className="w-2 h-2 rounded-full bg-emerald-200 group-hover:bg-emerald-400 transition-colors" />
                )}
                
                {config.layout === 'aisle' && (
                  <span className={`absolute -bottom-1 -right-1 text-[8px] font-black p-0.5 rounded ${isSelected ? 'text-white' : 'text-gray-300 shadow-sm'}`}>
                    {slot}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className={`
          shrink-0 flex items-center justify-center bg-gray-50 rounded-2xl text-xl font-black text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all border border-transparent group-hover:border-indigo-100
          ${config.layout === 'aisle' ? 'w-12 h-12 text-sm' : 'w-16 h-16'}
        `}>
          {rack}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 px-4">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-[#1A1A1A] tracking-tighter flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-200 text-base md:text-2xl">
              <MapIcon size={20} className="md:w-[28px] md:h-[28px]" />
            </div>
            LIBRARY MAP
          </h1>
          <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2">
            <p className="text-gray-500 font-bold text-[10px] md:text-sm">Visual Shelf Navigator</p>
            <div className="h-1 w-1 bg-gray-300 rounded-full" />
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 text-indigo-600 font-bold text-xs hover:bg-indigo-50 px-3 py-1 rounded-full transition-colors"
            >
              <Settings size={14} /> Map Settings
            </button>
          </div>
        </div>

        <div className="relative group w-full md:w-auto">
          <input 
            value={searchQuery}
            onChange={e => handleSearchInputChange(e.target.value)}
            placeholder="Find book..."
            className="w-full md:w-96 pl-12 md:pl-14 pr-6 py-4 md:py-5 bg-white border-2 border-gray-100 rounded-2xl md:rounded-3xl focus:ring-8 focus:ring-indigo-50 outline-none transition-all font-bold text-sm md:text-base shadow-xl shadow-gray-100 group-hover:border-indigo-100 focus:border-indigo-400"
          />
          <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-500 transition-colors w-5 h-5 md:w-6 md:h-6" />
          
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-gray-100 z-[100] overflow-hidden"
              >
                {searchResults.map(book => (
                  <button
                    key={book.barcode}
                    onClick={() => handleSelectSearchResult(book)}
                    className="w-full p-4 flex items-center justify-between hover:bg-indigo-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <div className="font-bold text-sm text-gray-900">{book.title}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{book.author}</div>
                    </div>
                    {book.location_code && (
                      <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black">{book.location_code}</div>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border-2 border-indigo-100 rounded-[32px] p-8 shadow-2xl shadow-indigo-100/50 mb-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                  <LayoutIcon className="text-indigo-600" /> CUSTOMIZE LAYOUT
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setShowSettings(false)} className="px-6 py-3 bg-gray-50 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-100">Cancel</button>
                  <button onClick={handleSaveConfig} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700">Save Map</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Racks / Rows</label>
                  <div className="flex flex-wrap gap-2">
                    {pendingConfig.racks.map((rack, i) => (
                      <div key={i} className="flex items-center gap-1 bg-gray-50 border border-gray-100 pl-3 pr-1 py-1 rounded-xl">
                        <span className="font-bold text-sm">{rack}</span>
                        <button 
                          onClick={() => setPendingConfig({ ...pendingConfig, racks: pendingConfig.racks.filter((_, idx) => idx !== i) })}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const next = String.fromCharCode(65 + pendingConfig.racks.length);
                        setPendingConfig({ ...pendingConfig, racks: [...pendingConfig.racks, next] });
                      }}
                      className="p-2 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Slots per Rack</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" min="5" max="25" 
                      value={pendingConfig.slots_per_rack} 
                      onChange={e => setPendingConfig({ ...pendingConfig, slots_per_rack: parseInt(e.target.value) })}
                      className="flex-1 accent-indigo-600"
                    />
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-black text-indigo-600">
                      {pendingConfig.slots_per_rack}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Visual Layout</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPendingConfig({ ...pendingConfig, layout: 'grid' })}
                      className={`flex-1 py-4 border-2 rounded-2xl font-bold text-sm flex flex-col items-center gap-2 ${pendingConfig.layout === 'grid' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-50 text-gray-400'}`}
                    >
                      <LayoutIcon size={20} /> Standard Grid
                    </button>
                    <button 
                      onClick={() => setPendingConfig({ ...pendingConfig, layout: 'aisle' })}
                      className={`flex-1 py-4 border-2 rounded-2xl font-bold text-sm flex flex-col items-center gap-2 ${pendingConfig.layout === 'aisle' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-50 text-gray-400'}`}
                    >
                      <Columns size={20} /> Book Aisle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">
        {/* Visual Grid */}
        <div className="lg:col-span-3 bg-white rounded-3xl md:rounded-[40px] p-6 md:p-10 shadow-2xl shadow-gray-200/50 border border-gray-50 overflow-x-auto">
          <div className={`min-w-fit mx-auto ${config.layout === 'aisle' ? 'w-max' : 'w-full'}`}>
            {/* Column Labels */}
            <div className="flex mb-4 md:mb-8">
              <div className="w-12 md:w-16 shrink-0" />
              <div className={`flex-1 flex ${config.layout === 'aisle' ? 'flex-nowrap gap-1.5 justify-end' : 'gap-3'}`}>
                {SLOTS.map(s => (
                  <div key={s} className={`shrink-0 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest ${config.layout === 'aisle' ? 'w-10' : 'w-12 md:w-12'}`}>
                    {s.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
              <div className="w-12 md:w-16 shrink-0" />
            </div>

            {/* Grid Rows - Layout Aware */}
            <div className={`
              ${config.layout === 'aisle' 
                ? 'grid grid-cols-2 gap-x-12 lg:gap-x-24 gap-y-12 p-8 md:p-12 bg-gray-50 rounded-[48px] border-4 border-white shadow-inner relative' 
                : 'space-y-6 md:space-y-8'}
            `}>
              {config.layout === 'aisle' && (
                <div className="absolute left-1/2 top-10 bottom-10 w-px bg-dashed bg-gray-200 -translate-x-1/2" />
              )}
              
              {config.layout === 'aisle' ? (
                <>
                  {/* Left Column: K, J, I, H, G */}
                  <div className="flex flex-col gap-10">
                    <div className="flex justify-center mb-4 pr-14">
                       <div className="flex flex-col items-center text-indigo-400">
                          <ArrowUp size={20} />
                          <div className="h-12 w-[2px] bg-indigo-100 rounded-full my-1" />
                          <ArrowDown size={20} />
                       </div>
                    </div>
                    {['K', 'J', 'I', 'H', 'G'].map(r => renderRack(r))}
                  </div>

                  {/* Right Column: F, E, D, C, B, A */}
                  <div className="flex flex-col gap-10">
                    <div className="flex justify-center mb-4 pr-14">
                       <div className="flex flex-col items-center text-indigo-400">
                          <ArrowUp size={20} />
                          <div className="h-12 w-[2px] bg-indigo-100 rounded-full my-1" />
                          <ArrowDown size={20} />
                       </div>
                    </div>
                    {['F', 'E', 'D', 'C', 'B', 'A'].map(r => renderRack(r))}
                  </div>
                </>
              ) : (
                config.racks.map((rack, rackIdx) => renderRack(rack))
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 md:gap-8 mt-8 md:mt-16 pt-6 md:pt-10 border-t-2 border-gray-50">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-4 h-4 md:w-6 md:h-6 bg-emerald-50 border-[1px] md:border-2 border-emerald-100 rounded-md md:rounded-lg" />
                <span className="text-[7px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Available</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-4 h-4 md:w-6 md:h-6 bg-red-50 border-[1px] md:border-2 border-red-200 rounded-md md:rounded-lg flex items-center justify-center">
                  <div className="w-1 h-1 md:w-2 md:h-2 bg-red-400 rounded-full" />
                </div>
                <span className="text-[7px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Occupied</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-4 h-4 md:w-6 md:h-6 bg-indigo-600 border-[1px] md:border-2 border-indigo-700 rounded-md md:rounded-lg" />
                <span className="text-[7px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-4 h-4 md:w-6 md:h-6 ring-2 md:ring-4 ring-yellow-400 border-[1px] md:border-2 border-yellow-500 rounded-md md:rounded-lg animate-pulse" />
                <span className="text-[7px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Highlight</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="space-y-8 sticky top-6">
          <AnimatePresence mode="wait">
            {selectedCell ? (
              <motion.div
                key={selectedCell}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="bg-white rounded-3xl md:rounded-[40px] p-6 md:p-10 shadow-2xl shadow-indigo-100/50 border border-white"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    BIN {selectedCell}
                  </div>
                  {locationMap[selectedCell] ? (
                    <div className="bg-emerald-50 text-emerald-600 p-2 md:p-3 rounded-xl md:rounded-2xl">
                      <CheckCircle2 size={18} className="md:w-6 md:h-6" />
                    </div>
                  ) : (
                    <div className="bg-gray-50 text-gray-300 p-2 md:p-3 rounded-xl md:rounded-2xl">
                      <MousePointer2 size={18} className="md:w-6 md:h-6" />
                    </div>
                  )}
                </div>

                {locationMap[selectedCell] ? (
                  <div className="space-y-6 md:space-y-8">
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-gray-900 leading-tight tracking-tight">
                        {locationMap[selectedCell].title}
                      </h3>
                      <p className="text-gray-500 font-bold mt-1 md:mt-2 flex items-center gap-2 text-xs md:text-base">
                        <span className="text-indigo-600 font-black">by</span> {locationMap[selectedCell].author}
                      </p>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                      <div className="p-4 md:p-5 bg-gray-50 rounded-2xl md:rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50">
                        <div className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">Catalog ID</div>
                        <div className="font-mono font-bold text-gray-900 text-base md:text-lg group-hover:text-indigo-600">
                          {locationMap[selectedCell].barcode}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => (window as any).showBookDetails?.(locationMap[selectedCell].barcode)}
                      className="w-full py-4 md:py-5 bg-indigo-600 text-white rounded-2xl md:rounded-[24px] font-black text-xs md:text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-3"
                    >
                      <Info size={16} className="md:w-[18px] md:h-[18px]" /> FULL CATALOG INFO
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (confirm(`Remove location assignment for this book?`)) {
                          api.books.assignLocation(locationMap[selectedCell].barcode, '').then(() => fetchInitialData());
                        }
                      }}
                      className="w-full py-4 text-red-400 font-bold text-xs hover:text-red-600 transition-colors uppercase tracking-widest"
                    >
                      Unassign this spot
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-emerald-400 rotate-3">
                      <Plus size={32} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">EMPTY SLOT</h3>
                    <p className="text-gray-400 text-[10px] font-black uppercase mt-2">Ready for Assignment</p>

                    <div className="mt-8 space-y-4">
                      <div className="relative">
                        <input 
                          placeholder="Search book to assign..."
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          onChange={(e) => handleSearchInputChange(e.target.value)}
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-indigo-100 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto">
                            {searchResults.map(b => (
                              <button 
                                key={b.barcode} 
                                onClick={() => handleAssignBook(b.barcode)}
                                disabled={assigningLoading}
                                className="w-full p-3 text-left hover:bg-indigo-50 flex flex-col border-b border-gray-50"
                              >
                                <span className="font-bold text-xs">{b.title}</span>
                                <span className="text-[10px] text-gray-400">{b.barcode}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="relative flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">OR</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>

                      <button 
                        onClick={() => setShowAddModal(true)}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Add Entirely New Book
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-indigo-600 rounded-3xl md:rounded-[40px] p-6 md:p-10 text-white shadow-2xl shadow-indigo-200"
              >
                <div className="relative mb-10">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-white/10 rounded-2xl blur-xl" />
                  <MapIcon size={48} className="relative z-10" />
                </div>
                <h3 className="text-2xl font-black mb-6 tracking-tight">KTS Physical Shelf Mapper</h3>
                <ul className="space-y-6">
                  {[
                    "Each box represents a single book slot on your library's shelves.",
                    "Labels correspond to Rack (A-Z) and Shelf position (01-50).",
                    "Click a spot to assign, view, or manage specific book placements."
                  ].map((tip, i) => (
                    <li key={i} className="flex gap-4">
                      <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black italic">
                        0{i+1}
                      </div>
                      <p className="text-white/80 text-sm font-medium leading-relaxed">{tip}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-12 pt-8 border-t border-white/10">
                   <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">KTS Library Management v2.0</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Real-time Occupancy Stats */}
          <div className="bg-gray-900 rounded-3xl md:rounded-[40px] p-6 md:p-10 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10">
              <div className="text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 md:mb-6">Real-time Occupancy</div>
              <div className="space-y-4 md:space-y-6">
                <div>
                  <div className="flex items-end justify-between mb-2 md:mb-3">
                    <div className="text-3xl md:text-5xl font-black tracking-tighter">
                      {Math.round((Object.keys(locationMap).length / (config.racks.length * config.slots_per_rack)) * 100)}%
                    </div>
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 md:mb-1.5">Full</div>
                  </div>
                  <div className="w-full h-3 md:h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      layout
                      initial={{ width: 0 }}
                      animate={{ width: `${(Object.keys(locationMap).length / (config.racks.length * config.slots_per_rack)) * 100}%` }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-[8px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <span>{Object.keys(locationMap).length} Occupied</span>
                  <span>{(config.racks.length * config.slots_per_rack) - Object.keys(locationMap).length} Empty</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">ADD NEW BOOK</h2>
                  <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mt-1">Assigning to Bin {selectedCell}</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateAndAssign} className="p-10 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Full Title</label>
                    <input 
                      required
                      placeholder="Enter book title..."
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all"
                      value={newBookData.title}
                      onChange={e => setNewBookData({ ...newBookData, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Author Name</label>
                    <input 
                      required
                      placeholder="Enter author..."
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all"
                      value={newBookData.author}
                      onChange={e => setNewBookData({ ...newBookData, author: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Accession / Barcode No.</label>
                    <input 
                      required
                      placeholder="Scan or type barcode..."
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all"
                      value={newBookData.barcode}
                      onChange={e => setNewBookData({ ...newBookData, barcode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    type="submit"
                    disabled={assigningLoading}
                    className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    {assigningLoading ? 'REGISTERING...' : 'REGISTER & ASSIGN TO SHELF'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

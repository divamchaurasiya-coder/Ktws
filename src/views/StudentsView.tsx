import { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { api } from '../lib/api';
import { Users, Plus, X, Search, QrCode, FileUp, Book, Calendar, CheckCircle2, Clock, History, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import QRCode from 'react-qr-code';
import Papa from 'papaparse';
import { format } from 'date-fns';

export default function StudentsView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', class: '', section: '', qr_code: '', parent_phone: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await api.students.list();
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = async (student: any) => {
    setDetailLoading(true);
    setSelectedStudent(student);
    try {
      const detail = await api.students.getDetail(student.id);
      setSelectedStudent(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setFormLoading(true);
    try {
      await api.students.update(selectedStudent.id, editData);
      await fetchStudents();
      setSelectedStudent({ ...selectedStudent, ...editData });
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const startEditing = () => {
    setEditData({
      name: selectedStudent.name,
      class: selectedStudent.class,
      section: selectedStudent.section,
      qr_code: selectedStudent.qr_code,
      parent_phone: selectedStudent.parent_phone || ''
    });
    setIsEditing(true);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.students.create(formData);
      await fetchStudents();
      setShowAdd(false);
      setFormData({ name: '', class: '', section: '', qr_code: '', parent_phone: '' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCSVImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const newStudents = results.data.map((row: any) => ({
            name: row.name || row.Name,
            class: row.class || row.Class,
            section: row.section || row.Section,
            qr_code: row.qr_code || row.ID || row.Id,
            parent_phone: row.parent_phone || row.Phone || row.ParentPhone
          })).filter(s => s.name && s.qr_code);

          if (newStudents.length > 0) {
            await api.students.bulkCreate(newStudents);
            alert(`Successfully imported ${newStudents.length} students!`);
            fetchStudents();
          } else {
            alert('No valid students found in CSV. Required columns: name, class, section, qr_code');
          }
        } catch (err: any) {
          alert('Import failed: ' + err.message);
        } finally {
          setLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (err) => {
        alert('CSV Parse error: ' + err.message);
        setLoading(false);
      }
    });
  };

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.qr_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tighter">Students</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#4F46E5] border border-[#E0E7FF] active:scale-95 transition-transform"
            title="Import CSV"
          >
            <FileUp size={20} />
          </button>
          <button 
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#4F46E5]/30 active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleCSVImport} 
        accept=".csv" 
        className="hidden" 
      />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
        <input 
          type="text"
          placeholder="Search name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-[#F1F5F9] rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] shadow-xs"
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center animate-pulse text-[#94A3B8] text-xs">Loading students...</div>
        ) : filtered.length > 0 ? (
          filtered.map(student => (
            <div 
              key={student.id} 
              onClick={() => handleStudentClick(student)}
              className="bg-white p-4 rounded-2xl border border-[#F1F5F9] shadow-xs flex items-center gap-4 active:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-[#4F46E5] font-bold text-sm">
                {student.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#1A1A1A]">{student.name}</p>
                <p className="text-[11px] text-[#64748B] font-medium uppercase tracking-tight">Class {student.class}-{student.section} • ID: {student.qr_code}</p>
              </div>
              <div className="p-2 bg-[#F8FAFC] rounded-lg">
                <QrCode size={18} className="text-[#4F46E5]" />
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-gray-400 text-xs italic bg-white rounded-2xl border border-dashed border-gray-200">No students found</div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-[44px] sm:rounded-3xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Add Student</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 text-gray-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Full Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Class</label>
                  <input required value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Section</label>
                  <input required value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Parent Phone (WhatsApp)</label>
                <input required value={formData.parent_phone} onChange={e => setFormData({...formData, parent_phone: e.target.value})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden" placeholder="e.g. +919999999999" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Unique Student ID</label>
                <input required value={formData.qr_code} onChange={e => setFormData({...formData, qr_code: e.target.value})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden" placeholder="e.g. STU2024001" />
              </div>
              <button disabled={formLoading} className="w-full py-5 bg-[#4F46E5] text-white font-bold rounded-2xl mt-4 shadow-lg shadow-[#4F46E5]/30">
                {formLoading ? 'Saving...' : 'Register Student'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" 
            onClick={() => { setSelectedStudent(null); setIsEditing(false); }} 
          />
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative w-full max-w-lg bg-white rounded-t-[44px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[85vh] my-auto"
          >
            <div className="overflow-y-auto p-6 sm:p-10 custom-scrollbar">
              {!isEditing ? (
                <div className="w-full">
                  <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 text-3xl font-black shadow-xl shadow-blue-600/10 border-4 border-white rotate-3">
                        {selectedStudent.name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-xl shadow-lg border-2 border-white">
                        <CheckCircle2 size={16} />
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-2xl font-black text-gray-900 mb-1 leading-tight">{selectedStudent.name}</h3>
                      <div className="flex flex-wrap justify-center gap-2 mb-6">
                        <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-200">
                          Class {selectedStudent.class}-{selectedStudent.section}
                        </span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">
                          ID: {selectedStudent.qr_code}
                        </span>
                      </div>
                    </div>

                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <div className="p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm flex flex-col items-center justify-center">
                        <QRCode value={selectedStudent.qr_code} size={140} level="H" fgColor="#1e293b" />
                        <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Scan Student ID</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Parent Phone</p>
                            <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5 leading-none">
                              {selectedStudent.parent_phone || 'None'}
                            </p>
                          </div>
                          {selectedStudent.parent_phone && (
                            <button 
                              onClick={() => {
                                const cleanPhone = selectedStudent.parent_phone.replace(/\D/g, '');
                                const finalPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                                const msg = `Hello, this is the School Library. We are contacting you regarding ${selectedStudent.name}'s library account.`;
                                window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                              className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-colors border border-green-100"
                            >
                              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.517 1.947.887 3.145.887 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.729-5.767-5.729zm3.39 8.163c-.147.411-.85.753-1.157.78-.308.028-.616.147-1.785-.311-1.168-.459-1.921-1.644-1.979-1.721-.059-.077-.471-.628-.471-1.21s.303-.859.412-.977c.108-.117.235-.147.313-.147l.225.003c.083 0 .196-.032.298.22.103.253.353.858.384.921.031.063.051.137.009.221-.042.084-.063.136-.126.209-.063.073-.133.163-.19.221-.064.066-.131.138-.056.266.075.127.333.55.714.89.49.437.904.572 1.031.635.127.064.201.053.276-.032.075-.084.321-.373.407-.5.084-.127.17-.105.285-.064.117.042.743.351.871.415s.213.095.244.148c.032.053.032.307-.116.718z"></path></svg>
                            </button>
                          )}
                        </div>
                        <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                          <p className="text-xs font-bold text-green-600 flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> Active Student
                          </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Borrowed</p>
                          <p className="text-sm font-black text-gray-900">
                            {selectedStudent.history?.length || 0} Books
                          </p>
                        </div>
                        <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-600/20">
                          <p className="text-[9px] font-black text-blue-100 uppercase tracking-widest mb-1">Current Holdings</p>
                          <p className="text-sm font-black text-white">
                            {selectedStudent.history?.filter((h: any) => h.status !== 'returned').length || 0} Active
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="flex items-center justify-between mb-4 px-2">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <History size={14} className="text-blue-600" />
                          Activity History
                        </h4>
                      </div>
                      
                      <div className="space-y-3 overflow-y-visible">
                        {detailLoading ? (
                          <div className="py-10 text-center flex flex-col items-center gap-2 bg-gray-50 rounded-[32px]">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Activity...</p>
                          </div>
                        ) : selectedStudent.history?.length > 0 ? (
                          selectedStudent.history.map((h: any) => (
                            <div key={h.id} className="p-4 bg-white border border-gray-100 rounded-3xl flex flex-col gap-3 hover:border-blue-200 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${h.status === 'returned' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                    <Book size={16} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-gray-900 truncate leading-tight">{h.book_title}</p>
                                    <p className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-tighter">BARCODE: {h.book_barcode}</p>
                                  </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${h.status === 'returned' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {h.status}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                                  <Calendar size={10} className="text-gray-400" />
                                  <p className="text-[9px] font-bold text-gray-500">
                                    {format(new Date(h.issue_date), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                                {h.return_date ? (
                                  <div className="flex items-center gap-2 bg-green-50 rounded-xl p-2">
                                    <CheckCircle2 size={10} className="text-green-500" />
                                    <p className="text-[9px] font-bold text-green-600">
                                      Returned {format(new Date(h.return_date), 'MMM dd')}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 bg-orange-50 rounded-xl p-2">
                                    <Clock size={10} className="text-orange-500" />
                                    <p className="text-[9px] font-bold text-orange-600">
                                      Due {format(new Date(h.due_date), 'MMM dd')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                            <History className="mx-auto text-gray-300 mb-2" size={32} />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Previous Activity</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 w-full mt-10">
                    <button 
                      onClick={() => { setSelectedStudent(null); setIsEditing(false); }}
                      className="py-4 border border-gray-100 text-gray-500 font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all text-[10px]"
                    >
                      Close Profile
                    </button>
                    <button 
                      onClick={startEditing}
                      className="py-4 bg-gray-900 text-white font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg shadow-gray-200 text-[10px]"
                    >
                      Edit Account
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdate} className="w-full space-y-6 pt-4">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 leading-tight">Edit Profile</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Update student data</p>
                    </div>
                    <button type="button" onClick={() => setIsEditing(false)} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><X size={20} /></button>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Student Full Name</label>
                      <input 
                        required
                        value={editData.name}
                        onChange={e => setEditData({...editData, name: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Grade / Class</label>
                        <input 
                          required
                          value={editData.class}
                          onChange={e => setEditData({...editData, class: e.target.value})}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Section</label>
                        <input 
                          required
                          value={editData.section}
                          onChange={e => setEditData({...editData, section: e.target.value})}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Parent Phone (WhatsApp)</label>
                      <input 
                        required
                        value={editData.parent_phone}
                        onChange={e => setEditData({...editData, parent_phone: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-bold shadow-xs transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Registration ID / QR</label>
                      <input 
                        required
                        value={editData.qr_code}
                        onChange={e => setEditData({...editData, qr_code: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-mono font-black shadow-xs transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6">
                    <button 
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="py-5 border border-gray-100 text-gray-400 font-black uppercase tracking-widest rounded-2xl text-[10px]"
                    >
                      Cancel Edit
                    </button>
                    <button 
                      type="submit"
                      disabled={formLoading}
                      className="py-5 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-600/20 disabled:opacity-50 text-[10px]"
                    >
                      {formLoading ? 'Applying...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

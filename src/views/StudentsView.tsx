import { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { api } from '../lib/api';
import { Users, Plus, X, Search, QrCode, FileUp } from 'lucide-react';
import QRCode from 'react-qr-code';
import Papa from 'papaparse';

export default function StudentsView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', class: '', section: '', qr_code: '' });
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
      qr_code: selectedStudent.qr_code
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
      setFormData({ name: '', class: '', section: '', qr_code: '' });
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
            qr_code: row.qr_code || row.ID || row.Id
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
              onClick={() => setSelectedStudent(student)}
              className="bg-white p-4 rounded-2xl border border-[#F1F5F9] shadow-xs flex items-center gap-4 active:bg-gray-50 transition-colors"
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

      {/* QR Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => { setSelectedStudent(null); setIsEditing(false); }} />
          <div className="relative w-full max-w-sm bg-white rounded-t-[44px] sm:rounded-[40px] shadow-2xl p-10 flex flex-col items-center">
            
            {!isEditing ? (
              <>
                <div className="w-20 h-20 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] text-3xl font-black mb-6 shadow-lg shadow-[#4F46E5]/10 border-4 border-white">
                  {selectedStudent.name.charAt(0)}
                </div>

                <h3 className="text-2xl font-black text-[#1A1A1A] mb-1">{selectedStudent.name}</h3>
                <p className="text-sm font-bold text-[#64748B] uppercase tracking-widest mb-8">Class {selectedStudent.class}-{selectedStudent.section}</p>
                
                <div className="p-8 bg-white border-4 border-[#F1F5F9] rounded-[40px] mb-8 shadow-sm flex items-center justify-center">
                  <QRCode 
                    value={selectedStudent.qr_code} 
                    size={160} 
                    level="H"
                    fgColor="#1A1A1A"
                  />
                </div>
                
                <div className="w-full bg-[#F8FAFC] p-5 rounded-[24px] flex flex-col items-center gap-1 mb-10 border border-[#F1F5F9]">
                  <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em]">Regd. Student ID</p>
                  <p className="text-lg font-black text-[#1A1A1A] tracking-tight">{selectedStudent.qr_code}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => { setSelectedStudent(null); setIsEditing(false); }}
                    className="py-5 bg-white border border-[#F1F5F9] text-[#64748B] font-bold rounded-2xl active:scale-95 transition-transform"
                  >
                    Close
                  </button>
                  <button 
                    onClick={startEditing}
                    className="py-5 bg-[#4F46E5] text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-[#4F46E5]/20"
                  >
                    Edit Info
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleUpdate} className="w-full space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-black text-[#1A1A1A]">Edit Profile</h3>
                  <button type="button" onClick={() => setIsEditing(false)} className="text-[#64748B]"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Full Name</label>
                    <input 
                      required
                      value={editData.name}
                      onChange={e => setEditData({...editData, name: e.target.value})}
                      className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden text-sm font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Class</label>
                      <input 
                        required
                        value={editData.class}
                        onChange={e => setEditData({...editData, class: e.target.value})}
                        className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Section</label>
                      <input 
                        required
                        value={editData.section}
                        onChange={e => setEditData({...editData, section: e.target.value})}
                        className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Unique Student ID</label>
                    <input 
                      required
                      value={editData.qr_code}
                      onChange={e => setEditData({...editData, qr_code: e.target.value})}
                      className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden text-sm font-bold"
                    />
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
    </div>
  );
}

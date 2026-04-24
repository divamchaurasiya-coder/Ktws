import { useState, useEffect, FormEvent } from 'react';
import { api } from '../lib/api';
import { Users, Plus, X, Search, Mail, Shield, ShieldCheck, Trash2 } from 'lucide-react';

export default function TeachersView() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'teacher' });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const data = await api.teachers.list();
      setTeachers(data);
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
      await api.teachers.create(formData);
      await fetchTeachers();
      setShowAdd(false);
      setFormData({ name: '', email: '', password: '', role: 'teacher' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this teacher? Access will be revoked immediately.')) return;
    try {
      await api.teachers.delete(id);
      fetchTeachers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = teachers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tighter">Teacher Management</h2>
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
          placeholder="Search teachers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-[#F1F5F9] rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5] shadow-xs"
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mt-2">Fetching accounts...</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map(teacher => (
            <div 
              key={teacher.id} 
              className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                {teacher.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <p className="text-sm font-black text-gray-900 truncate">{teacher.name}</p>
                  {teacher.role === 'admin' ? (
                    <span className="shrink-0 p-1 bg-amber-50 rounded-lg text-amber-500" title="Administrator"><ShieldCheck size={14} /></span>
                  ) : (
                    <span className="shrink-0 p-1 bg-blue-50 rounded-lg text-blue-500" title="Teacher"><Shield size={14} /></span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 truncate">
                  <Mail size={12} className="shrink-0" />
                  {teacher.email}
                </div>
              </div>
              
              {teacher.id !== 'boot-admin' && (
                <button 
                  onClick={() => handleDelete(teacher.id)}
                  className="p-3 text-red-400 hover:bg-red-50 rounded-2xl transition-colors shrink-0"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <Users className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No staff members found</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-[44px] sm:rounded-3xl shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1A1A1A] tracking-tight">Register Teacher</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 text-gray-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Full Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden" placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Email Address</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden" placeholder="teacher@school.com" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Temporary Password</label>
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden" placeholder="At least 6 characters" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Account Role</label>
                <select 
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full px-5 py-4 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl focus:ring-2 focus:ring-[#4F46E5] outline-hidden font-bold"
                >
                  <option value="teacher">Teacher (Issue/Return Access)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>
              <button disabled={formLoading} className="w-full py-5 bg-[#4F46E5] text-white font-bold rounded-2xl mt-4 shadow-lg shadow-[#4F46E5]/30">
                {formLoading ? 'Creating...' : 'Grant Access'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

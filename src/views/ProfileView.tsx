import { useState, useEffect, FormEvent } from 'react';
import { api } from '../lib/api';
import { User, Mail, Shield, Calendar, Edit3, Save, X, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProfileView() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await api.auth.getProfile();
      setProfile(data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    setEditData({
      name: profile.name,
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || ''
    });
    setIsEditing(true);
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const updated = await api.auth.updateProfile(editData);
      setProfile(updated);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading developer record...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pt-4 pb-20">
      <div className="relative group">
        {/* Cover Background */}
        <div className="h-32 sm:h-48 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-[40px] shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent animate-pulse" />
        </div>
        
        {/* Profile Header Card */}
        <div className="px-6 -mt-16 sm:-mt-20 relative z-10 flex flex-col items-center sm:items-start sm:flex-row gap-6">
          <div className="relative">
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-[40px] p-2 shadow-2xl border-4 border-white overflow-hidden flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover rounded-[34px]" />
              ) : (
                <div className="w-full h-full bg-indigo-50 rounded-[30px] flex items-center justify-center text-indigo-500">
                  <User size={64} strokeWidth={1.5} />
                </div>
              )}
            </div>
            {isEditing && (
              <button className="absolute bottom-2 right-2 p-3 bg-white text-[#4F46E5] rounded-2xl shadow-xl border border-indigo-50 active:scale-90 transition-transform">
                <Camera size={20} />
              </button>
            )}
          </div>
          
          <div className="flex-1 text-center sm:text-left sm:pt-24 space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">{profile.name}</h2>
            <p className="text-sm font-bold text-[#64748B] uppercase tracking-[0.2em]">{profile.role}</p>
          </div>

          <div className="sm:pt-24 shrink-0">
            {!isEditing ? (
              <button 
                onClick={startEditing}
                className="flex items-center gap-2 px-6 py-4 bg-white text-[#4F46E5] border border-indigo-50 font-black rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-50 transition-colors active:scale-95"
              >
                <Edit3 size={18} />
                Edit Profile
              </button>
            ) : (
              <button 
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-6 py-4 bg-white text-red-500 border border-red-50 font-black rounded-2xl shadow-lg shadow-red-100 active:scale-95 transition-transform"
              >
                <X size={18} />
                Discard
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isEditing ? (
          <motion.div 
            key="view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Contact Card */}
            <div className="bg-white rounded-[32px] border border-[#F1F5F9] p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-4 text-indigo-500 font-black text-xs uppercase tracking-widest bg-indigo-50/50 w-fit px-4 py-2 rounded-full">
                <Mail size={16} /> Contact Details
              </div>
              <div className="space-y-4">
                <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                  <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Email Address</p>
                  <p className="text-sm font-bold text-[#1A1A1A]">{profile.email}</p>
                </div>
                <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                  <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Teacher Role</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Shield size={14} className="text-indigo-500" />
                    <p className="text-sm font-bold text-[#1A1A1A]">{profile.role}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Card */}
            <div className="bg-white rounded-[32px] border border-[#F1F5F9] p-8 shadow-sm space-y-6">
               <div className="flex items-center gap-4 text-[#10B981] font-black text-xs uppercase tracking-widest bg-[#DCFCE7]/50 w-fit px-4 py-2 rounded-full">
                <Calendar size={16} /> Account Info
              </div>
              <div className="space-y-4">
                <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                  <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Member Since</p>
                  <p className="text-sm font-bold text-[#1A1A1A]">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                  <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Bio / Tagline</p>
                  <p className="text-sm font-medium text-[#64748B] leading-relaxed">
                    {profile.bio || "No professional biography added yet."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.form 
            key="edit"
            onSubmit={handleUpdate}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] border border-[#F1F5F9] p-8 sm:p-12 shadow-2xl space-y-8"
          >
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-2">Display Name</label>
                <input 
                  required
                  value={editData.name}
                  onChange={e => setEditData({...editData, name: e.target.value})}
                  className="w-full px-6 py-5 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl text-lg font-bold focus:ring-2 focus:ring-[#4F46E5] outline-none transition-all"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-2">Biography / Introduction</label>
                <textarea 
                  rows={4}
                  value={editData.bio}
                  onChange={e => setEditData({...editData, bio: e.target.value})}
                  className="w-full px-6 py-5 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl text-sm font-medium text-[#64748B] focus:ring-2 focus:ring-[#4F46E5] outline-none resize-none transition-all"
                  placeholder="Share something about yourself..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-2">Avatar Image URL</label>
                <input 
                  value={editData.avatar_url}
                  onChange={e => setEditData({...editData, avatar_url: e.target.value})}
                  className="w-full px-6 py-5 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl text-sm font-mono focus:ring-2 focus:ring-[#4F46E5] outline-none transition-all"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={saveLoading}
              className="w-full py-6 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white font-black rounded-3xl shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Save size={20} />
              {saveLoading ? "Syncing Record..." : "Confirm & Save Changes"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

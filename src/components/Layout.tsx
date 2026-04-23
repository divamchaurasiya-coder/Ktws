import { ReactNode } from 'react';
import { Home, Scan, RotateCcw, Users, BookOpen, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: any;
  onLogout: () => void;
}

export default function Layout({ children, activeTab, onTabChange, user, onLogout }: LayoutProps) {
  const handleLogout = async () => {
    try {
      await api.auth.logout();
      onLogout();
    } catch (err) {
      console.error(err);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
  };

  return (
    <div className="flex flex-col h-screen bg-[#F0F2F5] text-[#1A1A1A] font-sans overflow-hidden">
      {/* Top Bar */}
      <header className="bg-white px-5 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-[#4F46E5] w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-sm">
            K
          </div>
          <span className="font-bold text-[#1A1A1A] text-lg tracking-tight">KTWS Library</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-[#4F46E5] border-2 border-[#E0E7FF] flex items-center justify-center text-white text-sm font-bold shadow-sm active:scale-95 transition-transform"
          >
            {getInitials(user?.name)}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-5 pb-24">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F1F5F9] px-6 py-2 flex justify-between items-center h-20 shrink-0 z-50 pb-4">
        <NavItem 
          active={activeTab === 'home'} 
          onClick={() => onTabChange('home')} 
          icon={<Home size={24} fill={activeTab === 'home' ? 'currentColor' : 'none'} />} 
          label="Home" 
        />
        <NavItem 
          active={activeTab === 'issue'} 
          onClick={() => onTabChange('issue')} 
          icon={<Scan size={24} />} 
          label="Issue" 
        />
        <NavItem 
          active={activeTab === 'students'} 
          onClick={() => onTabChange('students')} 
          icon={<Users size={24} />} 
          label="Students" 
        />
        <NavItem 
          active={activeTab === 'books'} 
          onClick={() => onTabChange('books')} 
          icon={<BookOpen size={24} />} 
          label="Books" 
        />
      </nav>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
        active ? 'text-[#4F46E5]' : 'text-[#94A3B8]'
      }`}
    >
      {icon}
      <span className="text-[10px] font-bold tracking-tight uppercase">{label}</span>
      {active && <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#4F46E5]" />}
    </button>
  );
}

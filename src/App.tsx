import { useState, useEffect } from 'react';
import { api } from './lib/api';
import Layout from './components/Layout';
import HomeView from './views/HomeView';
import IssueView from './views/IssueView';
import ReturnView from './views/ReturnView';
import StudentsView from './views/StudentsView';
import BooksView from './views/BooksView';
import TransactionsView from './views/TransactionsView';
import ProfileView from './views/ProfileView';
import TeachersView from './views/TeachersView';
import LibraryMapView from './views/LibraryMapView';
import LoginView from './views/LoginView';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    checkAuth();
    (window as any).setActiveTab = setActiveTab;
    
    // Bridge for cross-view navigation
    const originalShowDetails = (window as any).showBookDetails;
    (window as any).showBookDetails = (barcode: string) => {
      setActiveTab('books');
      // Wait for tab to switch before calling inner hook
      setTimeout(() => {
        if (typeof (window as any).showBookDetails === 'function' && (window as any).showBookDetails !== originalShowDetails) {
           (window as any).showBookDetails(barcode);
        }
      }, 100);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={(userData: any) => setUser(userData)} />;
  }

  return (
    <Layout 
      user={user} 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      onLogout={() => setUser(null)}
    >
      {activeTab === 'home' && <HomeView onViewTransactions={() => setActiveTab('history')} />}
      {activeTab === 'issue' && <IssueView />}
      {activeTab === 'history' && <TransactionsView />}
      {activeTab === 'return' && <ReturnView />}
      {activeTab === 'students' && <StudentsView />}
      {activeTab === 'books' && <BooksView />}
      {activeTab === 'map' && <LibraryMapView />}
      {activeTab === 'profile' && <ProfileView />}
      {activeTab === 'teachers' && user.role === 'admin' && <TeachersView />}
    </Layout>
  );
}

import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { AuthPage } from './components/AuthPage';
import { RatingPage } from './components/RatingPage';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfilePage } from './components/ProfilePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { Star, User, Shield, LogOut, Loader2 } from 'lucide-react';

type Tab = 'rate' | 'profile' | 'admin';

export default function App() {
  const { user, profile, loading, isAdmin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('rate');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#F27D26]" />
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <AuthPage />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
        {/* Navigation Rail */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('rate')}>
              <div className="w-8 h-8 bg-[#F27D26] rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-black fill-black" />
              </div>
              <span className="font-black text-xl tracking-tighter uppercase">CELEB<span className="text-[#F27D26]">RATE</span></span>
            </div>

            <div className="flex items-center gap-1 md:gap-4">
              <button 
                onClick={() => setActiveTab('rate')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'rate' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
              >
                Rate
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
              >
                <span className="hidden md:inline">My Profile</span>
                <User className="w-4 h-4 md:hidden" />
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'admin' ? 'bg-[#F27D26] text-black' : 'text-[#F27D26]/60 hover:text-[#F27D26]'}`}
                >
                  <span className="hidden md:inline">Admin</span>
                  <Shield className="w-4 h-4 md:hidden" />
                </button>
              )}
              <div className="w-px h-6 bg-white/10 mx-2 hidden md:block" />
              <button 
                onClick={() => logout()}
                className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </nav>

        {/* Content Area */}
        <main className="flex-1 pt-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'rate' && <RatingPage />}
              {activeTab === 'profile' && <ProfilePage />}
              {activeTab === 'admin' && isAdmin && <AdminDashboard />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-bold">
            &copy; 2024 Celebrity Rating System &bull; Built with Firebase
          </p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}


import * as React from 'react';
import { AppMode, UserRole } from '../types';

interface HeaderProps {
  mode: AppMode;
  role: UserRole;
  totalQuestions: number;
  cloudStatus?: boolean | 'error';
  setMode: (mode: AppMode) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ mode, role, totalQuestions, cloudStatus, setMode, onLogout }) => {
  // Logo URL ថ្មីបំផុតដែលអ្នកបានផ្ដល់ឱ្យ
  const APP_LOGO_URL = "https://i.postimg.cc/0ygmLdvR/3QCM_Ep4.png";

  return (
    <div className="text-center mb-12 page-transition flex flex-col items-center">
      
      {/* Mini Logo for Header - រង្វង់មូល ស៊ុមក្រហម - ទំហំធំល្មមសមសួន */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-red-600/10 blur-2xl rounded-full"></div>
        <div className="relative w-28 h-28 bg-white p-1 rounded-full shadow-xl border-2 border-red-500 overflow-hidden">
          <img 
            src={APP_LOGO_URL} 
            alt="Mini Logo" 
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </div>

      <div className="relative mb-12">
        <div className="absolute -inset-4 bg-indigo-500/20 blur-3xl rounded-full opacity-30"></div>
        <h1 className="relative font-black heading-kh tracking-tight">
          <span className="block text-xl md:text-2xl text-white/90 uppercase tracking-[0.3em] mb-6 opacity-80">ត្រៀមប្រឡង</span>
          <span className="block text-4xl md:text-6xl bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] py-2">
            ក្របខ័ណ្ឌរដ្ឋ
          </span>
        </h1>
        <div className="mt-10 flex items-center justify-center gap-4">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-red-500/40"></div>
          <span className="text-[9px] text-yellow-500/70 font-bold uppercase tracking-[0.4em] small-kh">Master Quiz Platform</span>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-red-500/40"></div>
        </div>
      </div>

      <div className="flex justify-center items-center gap-3 mb-8 w-full max-w-sm px-4">
        <div className="flex-1 flex items-center justify-between gap-4 bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 shadow-xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="relative text-indigo-950 text-[9px] font-black uppercase tracking-widest small-kh">សំណួរក្នុងប្រព័ន្ធ</span>
          {/* ប្តូរពណ៌ពី text-maroon-bold ទៅជា text-red-600 ដើម្បីបានពណ៌ក្រហមភ្លឺ */}
          <span className="relative text-2xl font-black text-red-600">{totalQuestions}</span>
        </div>
        
        <button 
          onClick={onLogout}
          className="btn-red-elegant px-6 py-3 text-xs small-kh shrink-0 shadow-lg"
        >
          ចាកចេញ
        </button>
      </div>

      {role === 'admin' && (
        <div className="inline-flex p-1.5 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 gap-1.5 w-full max-w-xs shadow-inner">
          <button 
            onClick={() => setMode('play')}
            className={`flex-1 py-3 rounded-xl font-black text-[11px] heading-kh transition-all duration-300 ${
              mode === 'play' 
              ? 'bg-indigo-900 text-white shadow-[0_0_15px_rgba(30,27,75,0.5)] scale-100' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            📊 ធ្វើតេស្ត
          </button>
          <button 
            onClick={() => setMode('create')}
            className={`flex-1 py-3 rounded-xl font-black text-[11px] heading-kh transition-all duration-300 ${
              mode === 'create' 
              ? 'bg-red-700 text-white shadow-[0_0_15px_rgba(185,28,28,0.5)] scale-100' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            ⚙️ គ្រប់គ្រង
          </button>
        </div>
      )}
    </div>
  );
};

export default Header;

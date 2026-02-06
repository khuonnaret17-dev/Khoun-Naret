
import * as React from 'react';
import { useState } from 'react';
import { UserRole } from '../types';
import { ADMIN_CONTACTS, SECRET_CODE } from '../constants';

interface AuthSectionProps {
  onLogin: (role: UserRole, username?: string) => void;
  secretCode: string;
}

const AuthSection: React.FC<AuthSectionProps> = ({ onLogin, secretCode }) => {
  const [view, setView] = useState<'main' | 'user_login' | 'admin_login'>('main');
  const [userInput, setUserInput] = useState('');
  const [passInput, setPassInput] = useState('');

  const handleAdminVerify = () => {
    if (passInput === SECRET_CODE) {
      onLogin('admin', 'Administrator');
    } else {
      alert("លេខកូដសម្ងាត់អ្នកគ្រប់គ្រងមិនត្រឹមត្រូវ!");
    }
  };

  const handleUserVerify = () => {
    const trimmedUser = userInput.trim();
    if (!trimmedUser) return alert("សូមបញ្ចូល Username!");
    const isValidPassword = passInput.length === 6 && passInput.startsWith('20') && passInput.endsWith('26');

    if (isValidPassword) {
      onLogin('user', trimmedUser);
    } else {
      alert("Password មិនត្រឹមត្រូវ!");
    }
  };

  return (
    <div className="page-transition relative max-w-4xl mx-auto px-4">
      {view === 'main' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Card */}
          <div className="card-white-elegant p-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-5xl mb-6 border border-indigo-100 shadow-inner">👨‍🎓</div>
            <h2 className="text-2xl font-black heading-kh text-indigo-950 mb-2">សមាជិក</h2>
            <p className="text-sm small-kh text-indigo-900/50 mb-8">ចូលរៀន និងវាស់ស្ទង់សមត្ថភាព</p>
            <div className="space-y-3 w-full">
              <button 
                onClick={() => setView('user_login')} 
                className="btn-blue-elegant w-full py-4 rounded-xl font-black heading-kh text-lg"
              >
                🔐 ចូលរៀន
              </button>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <a href={ADMIN_CONTACTS.admin1} target="_blank" className="py-4 bg-gray-50 text-indigo-950 rounded-xl font-black heading-kh text-[10px] border border-gray-200 shadow-sm text-center">📱 Naret</a>
                <a href={ADMIN_CONTACTS.admin2} target="_blank" className="py-4 bg-gray-50 text-indigo-950 rounded-xl font-black heading-kh text-[10px] border border-gray-200 shadow-sm text-center">📱 Master</a>
              </div>
            </div>
          </div>

          {/* Admin Card */}
          <div 
            onClick={() => setView('admin_login')} 
            className="card-white-elegant p-8 flex flex-col items-center text-center border-2 border-transparent hover:border-red-100 transition-all cursor-pointer"
          >
            <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center text-5xl mb-6 border border-red-100 shadow-inner">⚙️</div>
            <h2 className="text-2xl font-black heading-kh text-maroon-bold mb-2">ADMIN</h2>
            <p className="text-sm small-kh text-maroon/50 mb-8">គ្រប់គ្រងសំណួរ និងទិន្នន័យ</p>
            <div className="mt-auto w-full">
               <button className="btn-red-elegant w-full py-4 rounded-xl font-black heading-kh text-lg">
                គ្រប់គ្រង 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {(view === 'user_login' || view === 'admin_login') && (
        <div className="card-white-elegant p-8 md:p-12 text-center page-transition relative max-w-md mx-auto">
          <button 
            onClick={() => { setView('main'); setUserInput(''); setPassInput(''); }}
            className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl hover:bg-maroon hover:text-white transition-all shadow-sm font-black text-xl"
          >
            ←
          </button>
          
          <div className="w-24 h-24 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-5xl mx-auto mb-6 shadow-inner border border-gray-200">
            {view === 'user_login' ? '👤' : '🔒'}
          </div>
          <h2 className={`text-2xl font-black heading-kh mb-2 ${view === 'user_login' ? 'text-indigo-950' : 'text-maroon-bold'}`}>
            {view === 'user_login' ? 'ចូលជាសមាជិក' : 'ចូលជា ADMIN'}
          </h2>
          <p className="text-xs small-kh text-gray-400 mb-8 uppercase tracking-widest">បញ្ជាក់អត្តសញ្ញាណ</p>

          <div className="space-y-6 mb-10 text-left">
            {view === 'user_login' && (
              <div>
                <label className="text-[10px] font-black uppercase text-indigo-950 ml-4 mb-2 block tracking-widest small-kh">Username</label>
                <input 
                  type="text" 
                  value={userInput} 
                  onChange={(e) => setUserInput(e.target.value)} 
                  className="input-elegant w-full px-5 py-3.5" 
                  placeholder="វាយឈ្មោះ..." 
                />
              </div>
            )}
            <div>
              <label className={`text-[10px] font-black uppercase ml-4 mb-2 block tracking-widest small-kh ${view === 'admin_login' ? 'text-maroon-bold' : 'text-indigo-950'}`}>
                {view === 'user_login' ? 'Password (៦ខ្ទង់)' : 'Admin Password'}
              </label>
              <input 
                type={view === 'user_login' ? 'text' : 'password'} 
                inputMode={view === 'user_login' ? 'numeric' : 'text'}
                value={passInput} 
                onChange={(e) => setPassInput(view === 'user_login' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)} 
                className={`input-elegant w-full px-5 py-3.5 ${view === 'admin_login' ? 'text-center tracking-widest' : ''}`} 
                placeholder={view === 'user_login' ? "••••••" : "••••"}
                onKeyDown={(e) => e.key === 'Enter' && (view === 'user_login' ? handleUserVerify() : handleAdminVerify())} 
              />
            </div>
          </div>

          <button 
            onClick={view === 'user_login' ? handleUserVerify : handleAdminVerify} 
            className={`w-full py-4 rounded-xl font-black heading-kh text-lg ${view === 'user_login' ? 'btn-blue-elegant' : 'btn-red-elegant'}`}
          >
            យល់ព្រម 🚀
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthSection;

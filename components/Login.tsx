
import React, { useState } from 'react';
import { GraduationCap, Lock, User as UserIcon, Shield, AlertTriangle } from 'lucide-react';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const input = username.trim();
      
      // 1. Admin Logic (Direct Firebase Auth)
      if (input.toLowerCase() === 'admin' || input.toLowerCase().includes('admin@')) {
        const adminEmail = input.includes('@') ? input : 'admin@eduassist.com';
        await signInWithEmailAndPassword(auth, adminEmail, password);
        return;
      }

      // 2. Teacher/Student Logic (Registry check)
      // IMPORTANT: Standard Firestore Rules require Auth before Read.
      // We sign in anonymously FIRST to satisfy the permission requirement.
      await signInAnonymously(auth);

      // 2a. Check Teacher Registry
      const teacherQuery = query(
        collection(db, 'teachers'), 
        where('username', '==', input), 
        where('password', '==', password)
      );
      const teacherSnap = await getDocs(teacherQuery);
      
      if (!teacherSnap.empty) {
        const teacherData = { ...teacherSnap.docs[0].data(), id: teacherSnap.docs[0].id, role: 'TEACHER' };
        localStorage.setItem('eduassist_local_session', JSON.stringify(teacherData));
        window.location.reload();
        return;
      }

      // 2b. Check Student Registry
      const studentQuery = query(
        collection(db, 'students'), 
        where('username', '==', input), 
        where('password', '==', password)
      );
      const studentSnap = await getDocs(studentQuery);
      
      if (!studentSnap.empty) {
        const studentData = { ...studentSnap.docs[0].data(), id: studentSnap.docs[0].id, role: 'STUDENT' };
        localStorage.setItem('eduassist_local_session', JSON.stringify(studentData));
        window.location.reload();
        return;
      }

      setError('Access Denied: Account not found in registry or incorrect password.');
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'permission-denied') {
        setError('System Permission Error: Please ensure Firestore rules are set to public or auth-only.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid admin credentials.');
      } else {
        setError(`Terminal Connection Failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-8">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight uppercase">EduAssist</h2>
          <p className="mt-3 text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Institutional Access Hub</p>
        </div>

        <form className="mt-12 bg-white rounded-[3.5rem] p-12 shadow-2xl space-y-6" onSubmit={handleLogin}>
          {error && (
             <div className={`p-4 rounded-2xl flex items-center gap-3 animate-shake ${error.includes('Permission') ? 'bg-amber-50 border border-amber-100' : 'bg-red-50 border border-red-100'}`}>
                {error.includes('Permission') ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" /> : <Shield className="w-5 h-5 text-red-500 shrink-0" />}
                <p className={`text-[10px] font-black uppercase leading-relaxed ${error.includes('Permission') ? 'text-amber-600' : 'text-red-600'}`}>{error}</p>
             </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pl-14 pr-6 outline-none font-bold text-sm focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="Registry ID (Username)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                required
                type="password"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pl-14 pr-6 outline-none font-bold text-sm focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="Secure Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Authorizing Session...' : 'Establish Connection'}
          </button>

          <div className="text-center pt-4">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
              Proprietary Academic Management System<br/>Secure Firebase Infrastructure
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

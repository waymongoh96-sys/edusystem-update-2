import React, { useState } from 'react';
import { GraduationCap, Lock, User as UserIcon, Shield } from 'lucide-react';
import { supabase } from '../supabase';

const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let loginEmail = email.trim().toLowerCase();

      // When this succeeds, App.tsx's onAuthStateChange will trigger 
      // and show your dashboard automatically.
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Verify invitation code from your Supabase table
      const { data: codeData, error: codeError } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', inviteCode.trim().toUpperCase())
        .eq('status', 'ACTIVE')
        .single();

      if (codeError || !codeData) {
        throw new Error('Invalid or expired invitation code.');
      }

      // 2. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: { full_name: name }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 3. Create profile in your Supabase 'profiles' table
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          username: email.split('@')[0],
          name: name,
          role: 'STUDENT',
          standard: codeData.standard,
        });

        if (profileError) throw profileError;

        // 4. Mark code as used
        await supabase
          .from('invitation_codes')
          .update({ status: 'USED', used_by: authData.user.id })
          .eq('id', codeData.id);
      }

      alert('Registration successful! Please login.');
      setIsRegister(false);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl mb-8">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight">EduAssist</h2>
          <p className="mt-3 text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Central Terminal Access</p>
        </div>

        <form 
          className="mt-12 bg-white rounded-[3.5rem] p-12 shadow-2xl space-y-6" 
          onSubmit={isRegister ? handleRegister : handleLogin}
        >
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-500" />
              <p className="text-xs font-black text-red-600 uppercase">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {isRegister && (
              <>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    name="full_name"
                    id="full_name"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pl-14 pr-6 outline-none font-bold text-sm"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    required
                    name="invite_code"
                    id="invite_code"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pl-14 pr-6 outline-none font-bold text-sm"
                    placeholder="Invitation Code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                required
                type="email"
                name="email"
                id="email"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pl-14 pr-6 outline-none font-bold text-sm"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                required
                type="password"
                name="password"
                id="password"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pl-14 pr-6 outline-none font-bold text-sm"
                placeholder="Secure Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95"
          >
            {loading ? 'Processing...' : isRegister ? 'Register Student' : 'Authenticate Access'}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
            >
              {isRegister ? 'Already have an account? Login' : 'Need an account? Enter Invitation Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

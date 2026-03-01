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
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });
      if (authError) throw authError;
      // No need to navigate; App.tsx will detect the login automatically
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Verify invitation code
      const { data: codeData, error: codeError } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', inviteCode.trim().toUpperCase())
        .eq('status', 'ACTIVE')
        .single();

      if (codeError || !codeData) throw new Error('Invalid or expired invitation code.');

      // 2. Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: { data: { full_name: name } }
      });
      if (authError) throw authError;

      if (authData.user) {
        // 3. Create profile as STUDENT
        await supabase.from('profiles').insert({
          id: authData.user.id,
          username: email.split('@')[0],
          name: name,
          role: 'STUDENT',
          standard: codeData.standard,
        });

        // 4. Mark code used
        await supabase.from('invitation_codes').update({ status: 'USED', used_by: authData.user.id }).eq('id', codeData.id);
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
          <div className="mx-auto h-20 w-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-8">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-black text-white">EduAssist</h2>
        </div>

        <form className="mt-12 bg-white rounded-[3.5rem] p-12 shadow-2xl space-y-6" onSubmit={isRegister ? handleRegister : handleLogin}>
          {error && <p className="text-red-500 font-bold text-center">{error}</p>}
          
          <div className="space-y-4">
            {isRegister && (
              <>
                <input required name="name" id="name" className="w-full bg-slate-50 p-5 rounded-2xl" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
                <input required name="code" id="code" className="w-full bg-slate-50 p-5 rounded-2xl" placeholder="Invitation Code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
              </>
            )}
            <input required type="email" name="email" id="email" className="w-full bg-slate-50 p-5 rounded-2xl" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
            <input required type="password" name="password" id="password" className="w-full bg-slate-50 p-5 rounded-2xl" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase">
            {loading ? 'Processing...' : isRegister ? 'Register' : 'Login'}
          </button>

          <button type="button" onClick={() => setIsRegister(!isRegister)} className="w-full text-xs font-black uppercase tracking-widest mt-4">
            {isRegister ? 'Back to Login' : 'Register with Invite Code'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

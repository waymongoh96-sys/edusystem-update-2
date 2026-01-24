
import React, { useState, useMemo } from 'react';
import { User, UserStatus, Role, Class } from '../types';
// Added Users to the lucide-react imports
import { Plus, Search, UserPlus, UserCheck, Trash2, X, Shield, GraduationCap, Briefcase, FileText, Upload, BookOpen, Layers, Users } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface AdminViewProps {
  teachers: User[];
  students: User[];
  classes: Class[];
}

const AdminView: React.FC<AdminViewProps> = ({ teachers, students, classes }) => {
  const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT'>('TEACHER');
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', username: '', password: '', status: UserStatus.ACTIVE, age: 10, standard: '1'
  });

  const stats = useMemo(() => {
    const totalClasses = classes.length;
    const totalStudentsTaught = classes.reduce((sum, cls) => sum + (cls.enrolledStudentIds?.length || 0), 0);
    return { totalClasses, totalStudentsTaught };
  }, [classes]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = Date.now().toString();
    const newUser: User = {
      ...formData as User,
      id,
      role: activeTab
    };

    const collectionName = activeTab === 'TEACHER' ? 'teachers' : 'students';
    await setDoc(doc(db, collectionName, id), newUser);
    
    setIsAdding(false);
    setFormData({ name: '', username: '', password: '', status: UserStatus.ACTIVE, age: 10, standard: '1' });
  };

  const handleBulkImport = async () => {
    if (!bulkData.trim()) return;
    
    const lines = bulkData.split('\n');
    const batch = writeBatch(db);
    let count = 0;

    lines.forEach((line) => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const username = parts[1];
        const age = parts[2] ? parseInt(parts[2]) : 10;
        const standard = parts[3] || '1';
        const id = `bulk-${Date.now()}-${count}`;
        
        const newUser: User = {
          id,
          name,
          username,
          password: 'password123', // Default password
          role: 'STUDENT',
          status: UserStatus.ACTIVE,
          age,
          standard
        };
        
        const ref = doc(db, 'students', id);
        batch.set(ref, newUser);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      alert(`Successfully imported ${count} students.`);
    }
    
    setIsBulkImporting(false);
    setBulkData('');
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`Delete ${user.name}?`)) {
      const collectionName = user.role === 'TEACHER' ? 'teachers' : 'students';
      await deleteDoc(doc(db, collectionName, user.id));
    }
  };

  const currentList = activeTab === 'TEACHER' ? teachers : students;

  return (
    <div className="space-y-10">
      {/* Global Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:theme-border transition-all">
          <div className="p-4 theme-light-bg rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <BookOpen className="w-8 h-8 theme-primary" />
          </div>
          <h4 className="text-3xl font-black text-slate-800">{stats.totalClasses}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Classrooms</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:theme-border transition-all">
          <div className="p-4 bg-purple-50 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <h4 className="text-3xl font-black text-slate-800">{stats.totalStudentsTaught}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Enrolled Nodes</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:theme-border transition-all">
          <div className="p-4 bg-emerald-50 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <Briefcase className="w-8 h-8 text-emerald-600" />
          </div>
          <h4 className="text-3xl font-black text-slate-800">{teachers.length}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Staff Count</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:theme-border transition-all">
          <div className="p-4 bg-blue-50 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <GraduationCap className="w-8 h-8 text-blue-600" />
          </div>
          <h4 className="text-3xl font-black text-slate-800">{students.length}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Unique Students</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            Central User Registry
          </h1>
          <p className="text-slate-500">Master database for all educational stakeholders.</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'STUDENT' && (
            <button 
              onClick={() => setIsBulkImporting(true)}
              className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Upload className="w-5 h-5" />
              Bulk Import
            </button>
          )}
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-100"
          >
            <Plus className="w-5 h-5" />
            Register New {activeTab === 'TEACHER' ? 'Staff' : 'Student'}
          </button>
        </div>
      </div>

      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('TEACHER')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'TEACHER' ? 'bg-white shadow-md text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Briefcase className="w-4 h-4" />
          Teachers
        </button>
        <button 
          onClick={() => setActiveTab('STUDENT')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'STUDENT' ? 'bg-white shadow-md text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <GraduationCap className="w-4 h-4" />
          Students
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Full Name</th>
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Credentials</th>
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                {activeTab === 'STUDENT' && (
                  <>
                    <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Info</th>
                  </>
                )}
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentList.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${activeTab === 'TEACHER' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-medium text-slate-600">@{user.username}</p>
                    <p className="text-xs text-slate-400">••••••••</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
                      user.status === UserStatus.ACTIVE ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  {activeTab === 'STUDENT' && (
                    <td className="px-8 py-5">
                      <p className="text-sm font-semibold text-slate-700">Standard {user.standard}</p>
                      <p className="text-xs text-slate-500">{user.age} Years Old</p>
                    </td>
                  )}
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => handleDelete(user)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {currentList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-slate-400 italic">No {activeTab.toLowerCase()}s registered in the system yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800">New Account</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  required
                  placeholder="e.g. John Doe"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-purple-100 outline-none transition-all font-medium"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Username</label>
                  <input 
                    required
                    placeholder="jdoe"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Password</label>
                  <input 
                    required
                    type="password"
                    placeholder="••••••••"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
              {activeTab === 'STUDENT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Age</label>
                    <input 
                      type="number"
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Standard</label>
                    <input 
                      placeholder="e.g. 4A"
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                      value={formData.standard}
                      onChange={e => setFormData({...formData, standard: e.target.value})}
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Status</label>
                <select 
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as UserStatus})}
                >
                  <option value={UserStatus.ACTIVE}>Active Enrollment</option>
                  <option value={UserStatus.RESIGNED}>Inactive / Resigned</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-700 shadow-xl shadow-purple-100 mt-6 transition-all active:scale-95"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {isBulkImporting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Bulk Registry Import</h2>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Student Node Provisioning</p>
              </div>
              <button onClick={() => setIsBulkImporting(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Instructions</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter one student per line in the following format:<br/>
                  <code className="bg-slate-200 px-2 py-0.5 rounded font-mono text-purple-700 font-bold">Name, Username, Age, Standard</code><br/><br/>
                  Example:<br/>
                  <code className="text-slate-400 font-mono">Alice Smith, alice, 10, 4A<br/>Bob Jones, bob, 11, 5B</code>
                </p>
              </div>

              <textarea 
                className="w-full h-64 p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-mono text-sm focus:ring-4 focus:ring-purple-100 transition-all"
                placeholder="Alice Smith, alice, 10, 4A..."
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsBulkImporting(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 font-black uppercase text-xs tracking-widest rounded-xl"
                >
                  Discard
                </button>
                <button 
                  onClick={handleBulkImport}
                  className="flex-2 py-4 bg-purple-600 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Initialize Registry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;

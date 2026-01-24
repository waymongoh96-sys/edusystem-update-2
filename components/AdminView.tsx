
import React, { useState } from 'react';
import { User, UserStatus, Role } from '../types';
import { Plus, Search, UserPlus, UserCheck, Trash2, X, Shield, GraduationCap, Briefcase } from 'lucide-react';

interface AdminViewProps {
  teachers: User[];
  setTeachers: React.Dispatch<React.SetStateAction<User[]>>;
  students: User[];
  setStudents: React.Dispatch<React.SetStateAction<User[]>>;
}

const AdminView: React.FC<AdminViewProps> = ({ teachers, setTeachers, students, setStudents }) => {
  const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT'>('TEACHER');
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', username: '', password: '', status: UserStatus.ACTIVE, age: 10, standard: '1'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      ...formData as User,
      id: Date.now().toString(),
      role: activeTab
    };

    if (activeTab === 'TEACHER') {
      setTeachers([...teachers, newUser]);
    } else {
      setStudents([...students, newUser]);
    }
    setIsAdding(false);
    setFormData({ name: '', username: '', password: '', status: UserStatus.ACTIVE, age: 10, standard: '1' });
  };

  const currentList = activeTab === 'TEACHER' ? teachers : students;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            Central User Registry
          </h1>
          <p className="text-slate-500">Master database for all educational stakeholders.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-100"
        >
          <Plus className="w-5 h-5" />
          Register New {activeTab === 'TEACHER' ? 'Staff' : 'Student'}
        </button>
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
                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
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
    </div>
  );
};

export default AdminView;

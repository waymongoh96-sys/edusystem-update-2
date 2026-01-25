import React, { useState, useMemo } from 'react';
import { User, UserStatus, Role, Class } from '../types';
import { Plus, Search, UserPlus, UserCheck, Trash2, X, Shield, GraduationCap, Briefcase, FileText, Upload, BookOpen, Layers, Users, Edit, Filter } from 'lucide-react';
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
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', username: '', password: '', status: UserStatus.ACTIVE, age: 10, standard: '1'
  });

  // 1. STATS: RESPOND TO FILTER (This changes based on dropdown)
  const stats = useMemo(() => {
    // FILTER LOGIC
    const filteredClasses = teacherFilter === 'ALL' 
      ? classes 
      : classes.filter(c => String(c.teacherId) === String(teacherFilter)); // Safe String comparison
      
    const totalClasses = filteredClasses.length;
    // Check both legacy and new student lists
    const totalEnrollments = filteredClasses.reduce((sum, cls) => {
      const ids = cls.enrolledStudentIds || (cls as any).studentIds || [];
      return sum + ids.length;
    }, 0);
    
    // Unique count
    const uniqueStudentIds = new Set(filteredClasses.flatMap(c => c.enrolledStudentIds || (c as any).studentIds || []));
    
    return { 
      totalClasses, 
      totalEnrollments, 
      uniqueCount: uniqueStudentIds.size 
    };
  }, [classes, teacherFilter]);

  // 2. TABLE LIST: IGNORE FILTER (Always show everyone)
  const currentList = useMemo(() => {
    return activeTab === 'TEACHER' ? teachers : students;
  }, [activeTab, teachers, students]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingUserId || Date.now().toString();
    const newUser: User = { ...formData as User, id, role: activeTab };
    const collectionName = activeTab === 'TEACHER' ? 'teachers' : 'students';
    await setDoc(doc(db, collectionName, id), newUser);
    setIsAdding(false);
    setEditingUserId(null);
    setFormData({ name: '', username: '', password: '', status: UserStatus.ACTIVE, age: 10, standard: '1' });
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData(user);
    setIsAdding(true);
  };

  const handleBulkImport = async () => {
    if (!bulkData.trim()) return;
    const lines = bulkData.split('\n');
    const batch = writeBatch(db);
    let count = 0;
    lines.forEach((line) => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const id = `bulk-${Date.now()}-${count}`;
        const newUser: User = { 
            id, name: parts[0], username: parts[1], password: 'password123', 
            role: 'STUDENT', status: UserStatus.ACTIVE, 
            age: parts[2] ? parseInt(parts[2]) : 10, standard: parts[3] || '1' 
        };
        batch.set(doc(db, 'students', id), newUser);
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

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Institutional Terminal</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Operations</p>
        </div>
        
        <div className="flex items-center gap-2">
          {teacherFilter !== 'ALL' && (
             <button onClick={() => setTeacherFilter('ALL')} className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors" title="Clear Filter"><X className="w-5 h-5" /></button>
          )}
          <div className={`flex items-center gap-4 p-3 rounded-2xl border shadow-sm transition-all ${teacherFilter !== 'ALL' ? 'bg-purple-50 border-purple-200 ring-2 ring-purple-100' : 'bg-white border-slate-200'}`}>
             <Filter className={`w-5 h-5 ${teacherFilter !== 'ALL' ? 'text-purple-600' : 'text-slate-400'}`} />
             <div className="flex flex-col">
                <span className={`text-[8px] font-black uppercase tracking-widest ${teacherFilter !== 'ALL' ? 'text-purple-600' : 'text-slate-400'}`}>Stats Filter</span>
                <select 
                  className="bg-transparent border-none font-black text-xs text-slate-700 outline-none pr-8 cursor-pointer"
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                >
                   <option value="ALL">All Staff (Global Stats)</option>
                   {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
             </div>
          </div>
        </div>
      </div>

      {/* Dynamic Stats Dashboard (AFFECTED BY FILTER) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:theme-border transition-all">
          <div className="p-4 theme-light-bg rounded-2xl mb-4 group-hover:scale-110 transition-transform"><BookOpen className="w-8 h-8 theme-primary" /></div>
          <h4 className="text-3xl font-black text-slate-800">{stats.totalClasses}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{teacherFilter === 'ALL' ? 'Total Classes' : 'Teacher\'s Classes'}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:theme-border transition-all">
          <div className="p-4 bg-purple-50 rounded-2xl mb-4 group-hover:scale-110 transition-transform"><Users className="w-8 h-8 text-purple-600" /></div>
          <h4 className="text-3xl font-black text-slate-800">{stats.totalEnrollments}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Student Enrollments</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:theme-border transition-all">
          <div className="p-4 bg-emerald-50 rounded-2xl mb-4 group-hover:scale-110 transition-transform"><Briefcase className="w-8 h-8 text-emerald-600" /></div>
          <h4 className="text-3xl font-black text-slate-800">{teacherFilter === 'ALL' ? teachers.length : '1'}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Staff Count</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:theme-border transition-all">
          <div className="p-4 bg-blue-50 rounded-2xl mb-4 group-hover:scale-110 transition-transform"><GraduationCap className="w-8 h-8 text-blue-600" /></div>
          <h4 className="text-3xl font-black text-slate-800">{stats.uniqueCount}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Unique Students</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-10">
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('TEACHER')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'TEACHER' ? 'bg-white shadow-md text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <Briefcase className="w-4 h-4" /> Teachers
          </button>
          <button onClick={() => setActiveTab('STUDENT')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'STUDENT' ? 'bg-white shadow-md text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <GraduationCap className="w-4 h-4" /> Students
          </button>
        </div>
        <div className="flex gap-3">
          {activeTab === 'STUDENT' && (
            <button onClick={() => setIsBulkImporting(true)} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"><Upload className="w-5 h-5" /> Bulk Import</button>
          )}
          <button onClick={() => { setEditingUserId(null); setFormData({ name: '', username: '', password: '', status: UserStatus.ACTIVE, age: 10, standard: '1' }); setIsAdding(true); }} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-100"><Plus className="w-5 h-5" /> New {activeTab === 'TEACHER' ? 'Staff' : 'Student'}</button>
        </div>
      </div>

      {/* TABLE: IGNORES FILTER (Always shows everyone) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Stakeholder</th>
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Access Node</th>
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                {activeTab === 'STUDENT' && <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Academic Level</th>}
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentList.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${activeTab === 'TEACHER' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>{user.name.charAt(0)}</div>
                      <span className="font-bold text-slate-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5"><p className="text-sm font-medium text-slate-600">@{user.username}</p></td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${user.status === UserStatus.ACTIVE ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{user.status}</span>
                  </td>
                  {activeTab === 'STUDENT' && <td className="px-8 py-5"><p className="text-sm font-semibold text-slate-700">Form {user.standard}</p><p className="text-xs text-slate-500">{user.age} Years Old</p></td>}
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleEdit(user)} className="p-2 text-slate-400 hover:theme-primary hover:bg-slate-50 rounded-lg transition-all"><Edit className="w-5 h-5" /></button>
                      <button onClick={() => handleDelete(user)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {currentList.length === 0 && (
                <tr><td colSpan={5} className="px-8 py-20 text-center"><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">No accounts found.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800">{editingUserId ? 'Modify Account' : 'Initialize Account'}</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Legal Name</label><input required placeholder="e.g. John Doe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-purple-100 outline-none transition-all font-medium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Username</label><input required placeholder="jdoe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
                <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Access Token</label><input required={!editingUserId} type="password" placeholder="••••••••" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
              </div>
              {activeTab === 'STUDENT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Age Metric</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.age} onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} /></div>
                  <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Form/Standard</label><input placeholder="e.g. 4A" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})} /></div>
                </div>
              )}
              <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Employment Status</label><select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as UserStatus})}><option value={UserStatus.ACTIVE}>Active Enrollment</option><option value={UserStatus.RESIGNED}>Inactive / Discharged</option></select></div>
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl mt-6 transition-all active:scale-95">{editingUserId ? 'Commit Changes' : 'Initialize Account'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;

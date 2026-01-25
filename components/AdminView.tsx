import React, { useState, useMemo } from 'react';
import { User, UserStatus, Class } from '../types';
import { 
  Plus, Users, Edit, Filter, Trash2, BookOpen, 
  Briefcase, GraduationCap, AlertTriangle, Link 
} from 'lucide-react';
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
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', username: '', password: '', status: UserStatus.ACTIVE, age: 10, standard: '1'
  });

  // --- SMART DATA ANALYSIS ---
  // 1. Find classes that belong to teachers who don't exist (like 't1')
  const orphanClasses = useMemo(() => {
    const validTeacherIds = new Set(teachers.map(t => t.id));
    return classes.filter(c => !validTeacherIds.has(c.teacherId));
  }, [classes, teachers]);

  // 2. Filter Logic
  const stats = useMemo(() => {
    const filteredClasses = teacherFilter === 'ALL' 
      ? classes 
      : classes.filter(c => String(c.teacherId) === String(teacherFilter));
      
    const totalClasses = filteredClasses.length;
    
    // Count both legacy and new enrollments
    const totalEnrollments = filteredClasses.reduce((sum, cls) => {
      const ids = cls.enrolledStudentIds || (cls as any).studentIds || [];
      return sum + ids.length;
    }, 0);
    
    const uniqueStudentIds = new Set(filteredClasses.flatMap(c => c.enrolledStudentIds || (c as any).studentIds || []));
    
    return { 
      totalClasses, 
      totalEnrollments, 
      uniqueCount: uniqueStudentIds.size 
    };
  }, [classes, teacherFilter]);

  // 3. Table List Logic
  const currentList = useMemo(() => {
    if (activeTab === 'TEACHER') {
      if (teacherFilter === 'ALL') return teachers;
      return teachers.filter(t => String(t.id) === String(teacherFilter));
    }
    // Student Filter Logic
    if (teacherFilter !== 'ALL') {
      const teacherClassIds = classes
        .filter(c => String(c.teacherId) === String(teacherFilter))
        .map(c => c.id);
      return students.filter(s => {
        return classes.some(c => {
          const ids = c.enrolledStudentIds || (c as any).studentIds || [];
          return teacherClassIds.includes(c.id) && ids.includes(s.id);
        });
      });
    }
    return students;
  }, [activeTab, teachers, students, teacherFilter, classes]);

  // --- ACTIONS ---

  const handleClaimOrphans = async () => {
    if (teacherFilter === 'ALL') {
      alert("Please select a specific Teacher from the filter dropdown to assign these classes to.");
      return;
    }
    
    const targetTeacher = teachers.find(t => t.id === teacherFilter);
    if (!targetTeacher) return;

    if (!window.confirm(`Transfer ${orphanClasses.length} unassigned classes to ${targetTeacher.name}?`)) return;

    try {
      const batch = writeBatch(db);
      orphanClasses.forEach(cls => {
        const ref = doc(db, 'classes', cls.id);
        batch.update(ref, { teacherId: targetTeacher.id });
      });
      await batch.commit();
      alert("Success! Data has been repaired.");
    } catch (err) {
      console.error("Migration failed:", err);
      alert("Failed to update classes.");
    }
  };

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

  const handleDelete = async (user: User) => {
    if (window.confirm(`Delete ${user.name}?`)) {
      const collectionName = user.role === 'TEACHER' ? 'teachers' : 'students';
      await deleteDoc(doc(db, collectionName, user.id));
    }
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData(user);
    setIsAdding(true);
  };

  return (
    <div className="space-y-10">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Institutional Terminal</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Operations</p>
        </div>
        
        {/* REPAIR TOOL: Only shows if orphans exist */}
        {orphanClasses.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-4 animate-pulse">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">{orphanClasses.length} Unassigned Classes Found</span>
            </div>
            <button 
              onClick={handleClaimOrphans}
              className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
            >
              <Link className="w-3 h-3" />
              {teacherFilter === 'ALL' ? 'Select Teacher to Claim' : `Assign to Selected`}
            </button>
          </div>
        )}

        <div className="flex items-center gap-4 p-3 rounded-2xl border bg-white border-slate-200 shadow-sm">
           <Filter className="w-5 h-5 text-slate-400" />
           <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">View Data As</span>
              <select 
                className="bg-transparent border-none font-black text-xs text-slate-700 outline-none pr-8 cursor-pointer"
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
              >
                 <option value="ALL">Global View (All Staff)</option>
                 {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
           </div>
        </div>
      </div>

      {/* 2. STATS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={BookOpen} label="Total Classes" value={stats.totalClasses} color="blue" />
        <StatCard icon={Users} label="Enrollments" value={stats.totalEnrollments} color="purple" />
        <StatCard icon={Briefcase} label="Active Staff" value={teacherFilter === 'ALL' ? teachers.length : 1} color="emerald" />
        <StatCard icon={GraduationCap} label="Unique Students" value={stats.uniqueCount} color="indigo" />
      </div>

      {/* 3. DATA TABLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-10">
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('TEACHER')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'TEACHER' ? 'bg-white shadow-md text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <Briefcase className="w-4 h-4" /> Teachers
          </button>
          <button onClick={() => setActiveTab('STUDENT')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'STUDENT' ? 'bg-white shadow-md text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <GraduationCap className="w-4 h-4" /> Students
          </button>
        </div>
        <button onClick={() => { setEditingUserId(null); setIsAdding(true); }} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-100"><Plus className="w-5 h-5" /> New {activeTab === 'TEACHER' ? 'Staff' : 'Student'}</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Name</th>
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Username</th>
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                {activeTab === 'STUDENT' && <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Form</th>}
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
                  <td className="px-8 py-5 text-sm font-medium text-slate-600">@{user.username}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${user.status === UserStatus.ACTIVE ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{user.status}</span>
                  </td>
                  {activeTab === 'STUDENT' && <td className="px-8 py-5 text-sm font-semibold text-slate-700">{user.standard}</td>}
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleEdit(user)} className="p-2 text-slate-400 hover:theme-primary hover:bg-slate-50 rounded-lg transition-all"><Edit className="w-5 h-5" /></button>
                      <button onClick={() => handleDelete(user)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {currentList.length === 0 && (
                <tr><td colSpan={5} className="px-8 py-20 text-center"><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">No matching records found.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800">{editingUserId ? 'Edit Account' : 'New Account'}</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Name</label><input required placeholder="e.g. John Doe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Username</label><input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
                <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Password</label><input required={!editingUserId} type="password" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
              </div>
              {activeTab === 'STUDENT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Age</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.age} onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} /></div>
                  <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Standard</label><input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})} /></div>
                </div>
              )}
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl mt-6 transition-all active:scale-95">{editingUserId ? 'Update' : 'Create'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Component for Stats
const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:border-slate-300 transition-all">
    <div className={`p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform bg-${color}-50 text-${color}-600`}>
      <Icon className="w-8 h-8" />
    </div>
    <h4 className="text-3xl font-black text-slate-800">{value}</h4>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
  </div>
);

export default AdminView;

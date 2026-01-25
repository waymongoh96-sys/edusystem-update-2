import React, { useState, useMemo } from 'react';
import { User, UserStatus, Class, Role } from '../types';
import { 
  Plus, Users, Edit, Filter, Trash2, BookOpen, 
  Briefcase, GraduationCap, Clock, Upload, X, AlertTriangle
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';

interface AdminViewProps {
  teachers: User[];
  students: User[];
  classes: Class[];
}

const AdminView: React.FC<AdminViewProps> = ({ teachers, students, classes }) => {
  // TABS: Added 'CLASSES' to manage specific assignments
  const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT' | 'CLASSES'>('TEACHER');
  const [isAdding, setIsAdding] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', username: '', password: '', status: UserStatus.ACTIVE, age: 10, standard: '1'
  });

  // --- SMART FILTER LOGIC (Matches ID, Username, or Name) ---
  const matchesFilter = (item: any) => {
    if (teacherFilter === 'ALL') return true;
    const target = teachers.find(t => t.id === teacherFilter);
    if (!target) return String(item) === String(teacherFilter);
    return item === target.id || item === target.username || item === target.name;
  };

  const stats = useMemo(() => {
    const filteredClasses = classes.filter(c => matchesFilter(c.teacherId));
    const totalEnrollments = filteredClasses.reduce((sum, cls) => {
      const ids = cls.enrolledStudentIds || (cls as any).studentIds || [];
      return sum + ids.length;
    }, 0);
    const uniqueStudentIds = new Set(filteredClasses.flatMap(c => c.enrolledStudentIds || (c as any).studentIds || []));
    
    return { totalClasses: filteredClasses.length, totalEnrollments, uniqueCount: uniqueStudentIds.size };
  }, [classes, teacherFilter, teachers]);

  const currentList = useMemo(() => {
    if (activeTab === 'CLASSES') {
      return classes.filter(c => matchesFilter(c.teacherId));
    }
    if (activeTab === 'TEACHER') {
      return teacherFilter === 'ALL' ? teachers : teachers.filter(t => matchesFilter(t.id));
    }
    if (activeTab === 'STUDENT') {
      if (teacherFilter === 'ALL') return students;
      // Show students enrolled in the filtered teacher's classes
      const allowedClassIds = classes.filter(c => matchesFilter(c.teacherId)).map(c => c.id);
      return students.filter(s => classes.some(c => allowedClassIds.includes(c.id) && (c.enrolledStudentIds || []).includes(s.id)));
    }
    return [];
  }, [activeTab, teachers, students, teacherFilter, classes]);

  const handleAssignTeacher = async (classId: string, newTeacherId: string) => {
    try {
      await updateDoc(doc(db, 'classes', classId), { teacherId: newTeacherId });
    } catch (e) { alert("Assignment failed."); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingUserId || Date.now().toString();
    const role = activeTab === 'TEACHER' ? 'TEACHER' : 'STUDENT';
    const collectionName = role === 'TEACHER' ? 'teachers' : 'students';
    await setDoc(doc(db, collectionName, id), { ...formData as User, id, role });
    setIsAdding(false);
    setEditingUserId(null);
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
        const id = `bulk-${Date.now()}-${count}`;
        batch.set(doc(db, 'students', id), { 
          id, name: parts[0], username: parts[1], password: 'password123', 
          role: 'STUDENT', status: UserStatus.ACTIVE, 
          age: parts[2] ? parseInt(parts[2]) : 10, standard: parts[3] || '1' 
        });
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
      alert(`Restored ${count} students.`);
    }
    setIsBulkImporting(false);
    setBulkData('');
  };

  const handleDelete = async (id: string, type: 'user' | 'class') => {
    if (!window.confirm("Confirm delete?")) return;
    const collectionName = type === 'class' ? 'classes' : (activeTab === 'TEACHER' ? 'teachers' : 'students');
    await deleteDoc(doc(db, collectionName, id));
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData(user);
    setIsAdding(true);
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-black text-slate-800">Admin Operations</h1></div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border shadow-sm">
           <Filter className="w-5 h-5 text-slate-400" />
           <select className="bg-transparent font-bold text-xs outline-none" value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)}>
              <option value="ALL">Global View</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <StatCard icon={BookOpen} label="Classes" value={stats.totalClasses} color="blue" />
        <StatCard icon={Users} label="Enrollments" value={stats.totalEnrollments} color="purple" />
        <StatCard icon={Briefcase} label="Staff" value={teacherFilter === 'ALL' ? teachers.length : 1} color="emerald" />
        <StatCard icon={GraduationCap} label="Students" value={stats.uniqueCount} color="indigo" />
      </div>

      <div className="flex justify-between items-center border-t border-slate-100 pt-8">
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
          <button onClick={() => setActiveTab('TEACHER')} className={`px-6 py-2.5 rounded-xl font-bold ${activeTab === 'TEACHER' ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}>Teachers</button>
          <button onClick={() => setActiveTab('CLASSES')} className={`px-6 py-2.5 rounded-xl font-bold ${activeTab === 'CLASSES' ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}>Classrooms</button>
          <button onClick={() => setActiveTab('STUDENT')} className={`px-6 py-2.5 rounded-xl font-bold ${activeTab === 'STUDENT' ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}>Students</button>
        </div>
        <div className="flex gap-2">
          {activeTab === 'STUDENT' && <button onClick={() => setIsBulkImporting(true)} className="bg-white border px-4 py-2.5 rounded-xl flex items-center gap-2 text-slate-700 hover:bg-slate-50"><Upload className="w-4 h-4" /> Restore</button>}
          {activeTab !== 'CLASSES' && <button onClick={() => { setEditingUserId(null); setIsAdding(true); }} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-purple-700"><Plus className="w-5 h-5" /> New</button>}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-200">
            <tr>
              <th className="px-8 py-5 text-xs font-bold text-slate-600 uppercase">Item</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-600 uppercase">{activeTab === 'CLASSES' ? 'Schedule' : 'Details'}</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-600 uppercase">{activeTab === 'CLASSES' ? 'Owner' : 'Status'}</th>
              <th className="px-8 py-5 text-right text-xs font-bold text-slate-600 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeTab === 'CLASSES' ? (currentList as Class[]).map(cls => (
              <tr key={cls.id} className="hover:bg-slate-50">
                <td className="px-8 py-5 font-bold text-slate-800">{cls.name}</td>
                <td className="px-8 py-5 text-sm text-slate-600">{cls.classDay} @ {cls.classTime}</td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2 border rounded-lg p-1 bg-white w-fit">
                    <select 
                      className="bg-transparent font-bold text-xs outline-none cursor-pointer"
                      value={cls.teacherId || ''}
                      onChange={(e) => handleAssignTeacher(cls.id, e.target.value)}
                    >
                      <option value="" disabled>Select Teacher...</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </td>
                <td className="px-8 py-5 text-right"><button onClick={() => handleDelete(cls.id, 'class')} className="text-red-400 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="w-5 h-5" /></button></td>
              </tr>
            )) : (currentList as User[]).map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-8 py-5 font-bold text-slate-800">{user.name}</td>
                <td className="px-8 py-5 text-sm text-slate-600">@{user.username}</td>
                <td className="px-8 py-5"><span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold">{user.status}</span></td>
                <td className="px-8 py-5 text-right flex justify-end gap-2">
                  <button onClick={() => handleEdit(user)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg"><Edit className="w-5 h-5" /></button>
                  <button onClick={() => handleDelete(user.id, 'user')} className="text-red-400 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals for Add/Edit/Restore omitted for brevity - reuse from previous if needed, logic is same */}
      {isBulkImporting && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl">
             <div className="flex justify-between mb-4"><h2 className="text-2xl font-black">Restore Registry</h2><button onClick={() => setIsBulkImporting(false)}><X /></button></div>
             <textarea className="w-full h-40 border rounded-xl p-4 mb-4" value={bulkData} onChange={e => setBulkData(e.target.value)} placeholder="Alice, alice123, 12, 6A" />
             <button onClick={handleBulkImport} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold">Execute Recovery</button>
          </div>
        </div>
      )}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
             <div className="flex justify-between mb-4"><h2 className="text-2xl font-black">Manage Account</h2><button onClick={() => setIsAdding(false)}><X /></button></div>
             <form onSubmit={handleSave} className="space-y-4">
                <input className="w-full border p-3 rounded-xl" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input className="w-full border p-3 rounded-xl" placeholder="Username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Save</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className={`bg-white p-6 rounded-3xl border shadow-sm flex flex-col items-center group hover:border-${color}-200 transition-all`}>
    <div className={`p-3 rounded-xl mb-2 bg-${color}-50 text-${color}-600`}><Icon className="w-6 h-6" /></div>
    <h4 className="text-2xl font-black text-slate-800">{value}</h4>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
  </div>
);

export default AdminView;

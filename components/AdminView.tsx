import React, { useState, useMemo } from 'react';
import { User, UserStatus, Class, Role } from '../types';
import { 
  Plus, Users, Edit, Filter, Trash2, BookOpen, 
  Briefcase, GraduationCap, AlertTriangle, Clock, Upload, X
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';

interface AdminViewProps {
  teachers: User[];
  students: User[];
  classes: Class[];
}

const AdminView: React.FC<AdminViewProps> = ({ teachers, students, classes }) => {
  // Tabs: TEACHER, STUDENT, or CLASSES (New)
  const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT' | 'CLASSES'>('TEACHER');
  const [isAdding, setIsAdding] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', username: '', password: '', status: UserStatus.ACTIVE, age: 10, standard: '1'
  });

  // --- 1. LIVE DASHBOARD STATS ---
  const stats = useMemo(() => {
    // Filter classes based on the Dropdown Selection
    const filteredClasses = teacherFilter === 'ALL' 
      ? classes 
      : classes.filter(c => String(c.teacherId) === String(teacherFilter));
      
    const totalClasses = filteredClasses.length;
    
    // Count Total Students in these classes
    const totalEnrollments = filteredClasses.reduce((sum, cls) => {
      const ids = cls.enrolledStudentIds || (cls as any).studentIds || [];
      return sum + ids.length;
    }, 0);
    
    // Count Unique Students
    const uniqueStudentIds = new Set(filteredClasses.flatMap(c => c.enrolledStudentIds || (c as any).studentIds || []));
    
    return { 
      totalClasses, 
      totalEnrollments, 
      uniqueCount: uniqueStudentIds.size 
    };
  }, [classes, teacherFilter]);

  // --- 2. TABLE DATA LOGIC ---
  const currentList = useMemo(() => {
    // A. CLASSES TAB: Show Class List (Filtered)
    if (activeTab === 'CLASSES') {
      if (teacherFilter === 'ALL') return classes;
      return classes.filter(c => String(c.teacherId) === String(teacherFilter));
    }

    // B. TEACHERS TAB: Show Teachers (Filtered)
    if (activeTab === 'TEACHER') {
      if (teacherFilter === 'ALL') return teachers;
      return teachers.filter(t => String(t.id) === String(teacherFilter));
    }

    // C. STUDENTS TAB: Show Students
    if (activeTab === 'STUDENT') {
      // If filtering by Teacher, show ONLY students in that Teacher's classes
      if (teacherFilter !== 'ALL') {
        const teacherClassIds = classes
          .filter(c => String(c.teacherId) === String(teacherFilter))
          .map(c => c.id);
          
        return students.filter(s => {
          return classes.some(c => {
            const ids = c.enrolledStudentIds || (c as any).studentIds || [];
            // Check if student is in one of the teacher's classes
            return teacherClassIds.includes(c.id) && ids.includes(s.id);
          });
        });
      }
      return students;
    }
    return [];
  }, [activeTab, teachers, students, teacherFilter, classes]);

  // --- ACTIONS ---

  // INDIVIDUAL ASSIGNMENT: The "Magic" Fix
  const handleAssignTeacher = async (classId: string, newTeacherId: string) => {
    try {
      await updateDoc(doc(db, 'classes', classId), {
        teacherId: newTeacherId
      });
      // The UI will update automatically because of the real-time listener in App.tsx
    } catch (error) {
      console.error("Assignment failed:", error);
      alert("Failed to assign teacher. Check console.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingUserId || Date.now().toString();
    // Ensure role matches the active tab
    const role = activeTab === 'TEACHER' ? 'TEACHER' : 'STUDENT'; 
    const newUser: User = { ...formData as User, id, role: role as Role };
    const collectionName = role === 'TEACHER' ? 'teachers' : 'students';
    await setDoc(doc(db, collectionName, id), newUser);
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
        const newUser: User = { 
            id, 
            name: parts[0], 
            username: parts[1], 
            password: 'password123', 
            role: 'STUDENT', 
            status: UserStatus.ACTIVE, 
            age: parts[2] ? parseInt(parts[2]) : 10, 
            standard: parts[3] || '1' 
        };
        batch.set(doc(db, 'students', id), newUser);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
      alert(`Successfully recovered ${count} student records.`);
    }
    setIsBulkImporting(false);
    setBulkData('');
  };

  const handleDelete = async (id: string, type: 'user' | 'class') => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    
    if (type === 'class') {
      await deleteDoc(doc(db, 'classes', id));
    } else {
      const collectionName = activeTab === 'TEACHER' ? 'teachers' : 'students';
      await deleteDoc(doc(db, collectionName, id));
    }
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData(user);
    setIsAdding(true);
  };

  return (
    <div className="space-y-10">
      {/* 1. HEADER & FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Institutional Terminal</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Operations</p>
        </div>
        
        <div className="flex items-center gap-4 p-3 rounded-2xl border bg-white border-slate-200 shadow-sm">
           <Filter className="w-5 h-5 text-slate-400" />
           <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Filter Dashboard By</span>
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

      {/* 2. STATS CARDS (Dynamic based on Filter) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={BookOpen} label="Total Classes" value={stats.totalClasses} color="blue" />
        <StatCard icon={Users} label="Enrollments" value={stats.totalEnrollments} color="purple" />
        <StatCard icon={Briefcase} label="Active Staff" value={teacherFilter === 'ALL' ? teachers.length : 1} color="emerald" />
        <StatCard icon={GraduationCap} label="Unique Students" value={stats.uniqueCount} color="indigo" />
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-10">
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('TEACHER')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'TEACHER' ? 'bg-white shadow-md text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <Briefcase className="w-4 h-4" /> Teachers
          </button>
          <button onClick={() => setActiveTab('CLASSES')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'CLASSES' ? 'bg-white shadow-md text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <BookOpen className="w-4 h-4" /> Classrooms
          </button>
          <button onClick={() => setActiveTab('STUDENT')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'STUDENT' ? 'bg-white shadow-md text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>
            <GraduationCap className="w-4 h-4" /> Students
          </button>
        </div>
        
        <div className="flex gap-3">
          {/* Recovery Button for Deleted Data */}
          {activeTab === 'STUDENT' && (
            <button onClick={() => setIsBulkImporting(true)} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"><Upload className="w-5 h-5" /> Restore Students</button>
          )}
          {activeTab !== 'CLASSES' && (
             <button onClick={() => { setEditingUserId(null); setIsAdding(true); }} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-100"><Plus className="w-5 h-5" /> New {activeTab === 'TEACHER' ? 'Staff' : 'Student'}</button>
          )}
        </div>
      </div>

      {/* 4. MAIN DATA TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">
                  {activeTab === 'CLASSES' ? 'Class Name' : 'Name'}
                </th>
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">
                  {activeTab === 'CLASSES' ? 'Schedule' : 'ID / Username'}
                </th>
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">
                  {activeTab === 'CLASSES' ? 'Assigned Teacher (Owner)' : 'Status'}
                </th>
                {activeTab === 'STUDENT' && <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider">Form</th>}
                <th className="px-8 py-5 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              
              {/* --- VIEW: CLASSROOM MANAGER --- */}
              {activeTab === 'CLASSES' && (currentList as Class[]).map(cls => {
                 // Check if teacher exists (Blue) or is orphan (Orange)
                 const teacherExists = teachers.find(t => t.id === cls.teacherId);
                 
                 return (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: cls.themeColor }}>
                          {cls.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{cls.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(cls.enrolledStudentIds || []).length} Students</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium">{cls.classDay} @ {cls.classTime}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {/* INDIVIDUAL ASSIGNMENT DROPDOWN */}
                      <div className={`flex items-center gap-2 p-1 pr-3 rounded-xl border w-fit ${!teacherExists ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                         {!teacherExists && <AlertTriangle className="w-4 h-4 text-amber-500 ml-2" />}
                         <select 
                           className={`bg-transparent outline-none text-xs font-bold py-1.5 px-2 cursor-pointer ${!teacherExists ? 'text-amber-700' : 'text-slate-700'}`}
                           value={cls.teacherId || ''}
                           onChange={(e) => handleAssignTeacher(cls.id, e.target.value)}
                         >
                           <option value="" disabled>Unassigned / Select...</option>
                           {teachers.map(t => (
                             <option key={t.id} value={t.id}>{t.name}</option>
                           ))}
                         </select>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => handleDelete(cls.id, 'class')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-5 h-5" /></button>
                    </td>
                  </tr>
                 );
              })}

              {/* --- VIEW: USERS (Teacher/Student) --- */}
              {activeTab !== 'CLASSES' && (currentList as User[]).map(user => (
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
                      <button onClick={() => handleDelete(user.id, 'user')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {currentList.length === 0 && (
                <tr><td colSpan={5} className="px-8 py-20 text-center"><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">No data found in this category.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800">{editingUserId ? 'Edit Account' : 'New Account'}</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Name</label><input required placeholder="e.g. John Doe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Username</label><input required placeholder="jdoe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
                <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Password</label><input required={!editingUserId} type="password" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
              </div>
              {activeTab === 'STUDENT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Age</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.age} onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} /></div>
                  <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Standard</label><input placeholder="e.g. 4A" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})} /></div>
                </div>
              )}
              <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Status</label><select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as UserStatus})}><option value={UserStatus.ACTIVE}>Active Enrollment</option><option value={UserStatus.RESIGNED}>Inactive / Discharged</option></select></div>
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl mt-6 transition-all active:scale-95">{editingUserId ? 'Update' : 'Create'}</button>
            </form>
          </div>
        </div>
      )}

      {isBulkImporting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">Recover Data</h2>
              <button onClick={() => setIsBulkImporting(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Paste your CSV data here (Name, Username, Age, Form) to restore your student registry.</p>
            <textarea 
              className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-mono text-xs" 
              placeholder="Alice, alice123, 12, 6A&#10;Bob, bob123, 11, 5B"
              value={bulkData}
              onChange={e => setBulkData(e.target.value)}
            />
            <button onClick={handleBulkImport} className="w-full mt-6 bg-purple-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-purple-700 transition-all">Execute Recovery</button>
          </div>
        </div>
      )}
    </div>
  );
};

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

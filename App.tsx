
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, LayoutDashboard, BookOpen, ListChecks, Settings, 
  LogOut, GraduationCap, UserCog, Menu
} from 'lucide-react';
import { 
  Role, User, Class, LessonPlan, Task, AttendanceRecord, SystemSettings, 
  TaskStatus, UserStatus, ExamResult 
} from './types';
import { INITIAL_SETTINGS } from './constants';
import AdminView from './components/AdminView';
import TeacherDashboard from './components/TeacherDashboard';
import ClassRegistry from './components/ClassRegistry';
import ClassDetails from './components/ClassDetails';
import TaskBoard from './components/TaskBoard';
import SettingsView from './components/SettingsView';
import StudentDashboard from './components/StudentDashboard';
import Login from './components/Login';

// Firebase Imports
import { onSnapshot, collection, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from './firebase';

const THEME_MAP: Record<string, string> = {
  blue: '#2563eb',
  emerald: '#059669',
  indigo: '#4f46e5',
  orange: '#ea580c'
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);

  // Sync Auth and Role Detection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        const localUserJson = localStorage.getItem('eduassist_local_session');

        // Case 1: Admin User (Identified by email)
        if (email.toLowerCase().includes('admin')) {
          setCurrentUser({
            id: firebaseUser.uid,
            name: 'System Admin',
            username: 'admin',
            role: 'ADMIN',
            status: UserStatus.ACTIVE
          } as User);
        } 
        // Case 2: Registry User (Teacher/Student via Anonymous Auth + localStorage)
        else if (localUserJson) {
          try {
            const cached = JSON.parse(localUserJson);
            const collectionName = cached.role === 'TEACHER' ? 'teachers' : 'students';
            const userDoc = await getDoc(doc(db, collectionName, cached.id));
            
            if (userDoc.exists()) {
              setCurrentUser({ ...userDoc.data(), id: userDoc.id } as User);
            } else {
              // Account likely deleted by Admin
              localStorage.removeItem('eduassist_local_session');
              await signOut(auth);
              setCurrentUser(null);
            }
          } catch (e) {
            localStorage.removeItem('eduassist_local_session');
            await signOut(auth);
            setCurrentUser(null);
          }
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Sync (Guarded by auth.currentUser to prevent Permission errors)
  useEffect(() => {
    // Only start listeners if we are officially authenticated with Firebase
    if (!auth.currentUser || !currentUser) return;

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)));
    });
    const unsubLessonPlans = onSnapshot(collection(db, 'lessonPlans'), (snap) => {
      setLessonPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as LessonPlan)));
    });
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    });
    const unsubExams = onSnapshot(collection(db, 'examResults'), (snap) => {
      setExamResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamResult)));
    });
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    });
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    });
    const unsubSettings = onSnapshot(doc(db, 'config', 'settings'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as SystemSettings);
    });

    return () => {
      unsubClasses(); unsubLessonPlans(); unsubTasks(); unsubAttendance(); unsubExams(); unsubStudents(); unsubTeachers(); unsubSettings();
    };
  }, [currentUser]);

  const filteredData = useMemo(() => {
    if (!currentUser) return null;

    if (currentUser.role === 'TEACHER') {
      const myClasses = classes.filter(c => c.teacherId === currentUser.id);
      const myClassIds = new Set(myClasses.map(c => c.id));
      const myLessonPlans = lessonPlans.filter(lp => myClassIds.has(lp.classId));
      const autoTasks: Task[] = myLessonPlans.filter(lp => lp.status !== TaskStatus.COMPLETE).map(lp => ({
        id: `lp-${lp.classId}-${lp.id}`, 
        name: `Prepare: ${myClasses.find(c => c.id === lp.classId)?.name || 'Lesson'} (${lp.date})`,
        dueDate: lp.date, category: 'Preparation', status: lp.status
      }));
      return { classes: myClasses, tasks: [...autoTasks, ...tasks], lessonPlans: myLessonPlans, attendance: attendance.filter(a => myClassIds.has(a.classId)) };
    }

    if (currentUser.role === 'STUDENT') {
      return { classes: classes.filter(c => c.enrolledStudentIds?.includes(currentUser.id)), attendance: attendance.filter(a => a.studentId === currentUser.id), examResults: examResults.filter(e => e.studentId === currentUser.id) };
    }
    return null;
  }, [currentUser, classes, lessonPlans, tasks, attendance, examResults]);

  const primaryColor = useMemo(() => THEME_MAP[settings.themeColor] || THEME_MAP.blue, [settings.themeColor]);

  const handleLogout = async () => {
    localStorage.removeItem('eduassist_local_session');
    await signOut(auth);
    window.location.reload();
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black theme-primary uppercase tracking-widest bg-slate-900 text-white">Authenticating Secure Node...</div>;
  if (!currentUser) return <Login />;

  const renderContent = () => {
    if (currentUser.role === 'ADMIN') return <AdminView teachers={teachers} students={students} classes={classes} />;
    if (currentUser.role === 'TEACHER' && filteredData) {
      switch (activeMenu) {
        case 'dashboard': return <TeacherDashboard tasks={filteredData.tasks} classes={filteredData.classes} lessonPlans={filteredData.lessonPlans} settings={settings} onClassClick={(id) => { setSelectedClassId(id); setActiveMenu('classes'); }} onTaskClick={() => setActiveMenu('tasks')} />;
        case 'classes':
          if (selectedClassId) {
            const cls = filteredData.classes.find(c => c.id === selectedClassId);
            return cls ? <ClassDetails cls={cls} students={students} lessonPlans={filteredData.lessonPlans} setLessonPlans={setLessonPlans} attendance={attendance} setAttendance={setAttendance} settings={settings} examResults={examResults} setExamResults={setExamResults} onBack={() => setSelectedClassId(null)} onDeletePlan={async (id) => await deleteDoc(doc(db, 'lessonPlans', id))} updateClass={async (updated) => await setDoc(doc(db, 'classes', updated.id), updated)} /> : null;
          }
          return <ClassRegistry classes={filteredData.classes} onSelectClass={setSelectedClassId} settings={settings} lessonPlans={filteredData.lessonPlans} currentUser={currentUser} />;
        case 'tasks': return <TaskBoard tasks={tasks} settings={settings} />;
        case 'settings': return <SettingsView settings={settings} />;
        default: return null;
      }
    }
    if (currentUser.role === 'STUDENT' && filteredData) return <StudentDashboard student={currentUser} classes={filteredData.classes} attendance={filteredData.attendance} examResults={filteredData.examResults} />;
    return <div className="p-20 text-center font-bold text-slate-400">UNAUTHORIZED ACCESS - SESSION MISMATCH</div>;
  };

  return (
    <div className="min-h-screen flex bg-slate-50/50">
      <style>{`:root { --primary-color: ${primaryColor}; --primary-light: ${primaryColor}15; } .theme-primary { color: var(--primary-color) !important; } .theme-bg { background-color: var(--primary-color) !important; } .theme-border { border-color: var(--primary-color) !important; } .theme-ring { --tw-ring-color: var(--primary-color) !important; } .theme-light-bg { background-color: var(--primary-light) !important; }`}</style>
      <aside className={`bg-slate-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-24'} flex flex-col shrink-0`}>
        <div className="p-6 flex items-center gap-3">
          <div className="theme-bg p-2 rounded-xl"><GraduationCap className="w-6 h-6 text-white" /></div>
          {sidebarOpen && <span className="font-black text-xl tracking-tight uppercase">EduAssist</span>}
        </div>
        <nav className="flex-1 mt-10 px-4 space-y-2">
          {menuItems[currentUser.role]?.map((item) => (
            <button key={item.id} onClick={() => { setActiveMenu(item.id); setSelectedClassId(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeMenu === item.id ? 'theme-bg text-white shadow-xl scale-105' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
              <item.icon className="w-6 h-6 shrink-0" />
              {sidebarOpen && <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-4 p-4 text-slate-500 hover:text-red-400 rounded-2xl hover:bg-red-400/10 w-full transition-all">
            <LogOut className="w-6 h-6 shrink-0" />
            {sidebarOpen && <span className="font-bold text-xs uppercase tracking-widest">Logout</span>}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="bg-white/80 backdrop-blur-md h-20 border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 hover:bg-slate-100 rounded-xl"><Menu className="w-6 h-6 text-slate-600" /></button>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-black text-slate-800">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p className="text-[10px] font-black theme-primary uppercase tracking-widest">@{currentUser.username}</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div className="px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border theme-border theme-primary theme-light-bg">{currentUser.role}</div>
          </div>
        </header>
        <div className="p-10 max-w-[1600px] mx-auto w-full">{renderContent()}</div>
      </main>
    </div>
  );
};

const menuItems = {
  ADMIN: [{ id: 'dashboard', icon: LayoutDashboard, label: 'Admin Hub' }],
  TEACHER: [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'classes', icon: BookOpen, label: 'Class Registry' },
    { id: 'tasks', icon: ListChecks, label: 'To-Do List' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ],
  STUDENT: [{ id: 'dashboard', icon: LayoutDashboard, label: 'My Learning' }]
};

export default App;

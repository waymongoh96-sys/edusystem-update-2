import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, LayoutDashboard, BookOpen, ListChecks, Settings,
  LogOut, GraduationCap, UserCog, Menu, RefreshCw, AlertTriangle
} from 'lucide-react';
import {
  Role, User, Class, LessonPlan, Task, AttendanceRecord, SystemSettings,
  TaskStatus, UserStatus, ExamResult, Announcement, Holiday, Invoice, CommunityPost
} from './types';
import { supabase } from './supabase';
import { INITIAL_SETTINGS } from './constants';
import AdminView from './components/AdminView';
import TeacherDashboard from './components/TeacherDashboard';
import ClassRegistry from './components/ClassRegistry';
import ClassDetails from './components/ClassDetails';
import TaskBoard from './components/TaskBoard';
import SettingsView from './components/SettingsView';
import StudentDashboard from './components/StudentDashboard';
import Login from './components/Login';

// Firebase (Keeping for legacy data access if needed)
import { onSnapshot, collection, doc, deleteDoc, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

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

  // Data States
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);

  // 1. Unified Auth Logic (Supabase Focus)
  useEffect(() => {
    // Check current session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await handleUserSync(session.user);
      }
      setLoading(false);
    };

    // Listen for Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await handleUserSync(session.user);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    const handleUserSync = async (supabaseUser: any) => {
      const email = supabaseUser.email?.toLowerCase() || '';
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      let userData: User = {
        id: supabaseUser.id,
        name: profile?.name || email.split('@')[0],
        username: email.split('@')[0],
        status: UserStatus.ACTIVE,
        role: profile?.role || 'STUDENT', // Default to Student
        avatar_url: profile?.avatar_url
      };

      // SPECIAL RULE: Identify Admin by Email
      if (email === 'waymongo@gmail.com') {
        userData.role = 'ADMIN';
      }

      setCurrentUser(userData);
    };

    checkUser();
    return () => subscription.unsubscribe();
  }, []);

  // 2. Data Sync Logic
  useEffect(() => {
    if (!currentUser) return;

    // Supabase Subscriptions
    const subHolidays = supabase.channel('holidays').on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, fetchData).subscribe();
    const subAnnouncements = supabase.channel('announcements').on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchData).subscribe();

    async function fetchData() {
      const { data: hData } = await supabase.from('holidays').select('*');
      if (hData) setHolidays(hData);

      const { data: aData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (aData) setAnnouncements(aData);

      const { data: iData } = await supabase.from('invoices').select('*').eq('student_id', currentUser?.id);
      if (iData) setInvoices(iData);
    }
    fetchData();

    // Firebase Legacy Sync
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      let loadedClasses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class));
      if (currentUser.role === 'STUDENT') {
        loadedClasses = loadedClasses.filter(c => (c.enrolledStudentIds || []).includes(currentUser.id));
      }
      setClasses(loadedClasses);
    });

    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as User))));
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User))));

    return () => {
      unsubClasses(); unsubStudents(); unsubTeachers();
      subHolidays.unsubscribe(); subAnnouncements.unsubscribe();
    };
  }, [currentUser]);

  const handleLogout = () => supabase.auth.signOut();
  const primaryColor = useMemo(() => THEME_MAP[settings.themeColor] || THEME_MAP.blue, [settings.themeColor]);

  if (loading) return <div className="h-screen flex items-center justify-center font-black theme-primary">INITIALIZING EDUASSIST...</div>;
  if (!currentUser) return <Login />;

  // Navigation handlers
  const handleNavigateToClass = (classId: string) => { setSelectedClassId(classId); setActiveMenu('classes'); };
  const handleNavigateToTasks = () => setActiveMenu('tasks');

  const renderContent = () => {
    if (currentUser.role === 'ADMIN') return <AdminView teachers={teachers} students={students} classes={classes} holidays={holidays} />;
    
    if (currentUser.role === 'TEACHER') {
      switch (activeMenu) {
        case 'dashboard': return <TeacherDashboard tasks={tasks} classes={classes} lessonPlans={lessonPlans} settings={settings} onClassClick={handleNavigateToClass} onTaskClick={handleNavigateToTasks} currentUser={currentUser} holidays={holidays} />;
        case 'classes': return selectedClassId ? <ClassDetails cls={classes.find(c => c.id === selectedClassId)!} students={students} lessonPlans={lessonPlans} setLessonPlans={setLessonPlans} attendance={attendance} setAttendance={setAttendance} settings={settings} examResults={examResults} setExamResults={setExamResults} onBack={() => setSelectedClassId(null)} updateClass={async () => {}} currentUser={currentUser} onDeletePlan={async () => {}} /> : <ClassRegistry classes={classes} onSelectClass={handleNavigateToClass} settings={settings} lessonPlans={lessonPlans} currentUser={currentUser} />;
        case 'settings': return <SettingsView settings={settings} currentUser={currentUser} holidays={holidays} />;
        default: return null;
      }
    }

    if (currentUser.role === 'STUDENT') {
      return <StudentDashboard student={currentUser} classes={classes} attendance={attendance} examResults={examResults} lessonPlans={lessonPlans} settings={settings} onLogout={handleLogout} announcements={announcements} invoices={invoices} holidays={holidays} />;
    }
    return null;
  };

  const currentMenuItems = menuItems[currentUser.role] || [];

  return (
    <div className="min-h-screen flex bg-slate-50/50">
      <style>{`:root { --primary-color: ${primaryColor}; } .theme-primary { color: var(--primary-color) !important; } .theme-bg { background-color: var(--primary-color) !important; }`}</style>
      
      {/* Sidebar - Only show for Admin/Teacher */}
      {currentUser.role !== 'STUDENT' && (
        <aside className={`bg-slate-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-24'} flex flex-col shrink-0`}>
          <div className="p-6 flex items-center gap-3"><div className="theme-bg p-2 rounded-xl shadow-lg"><GraduationCap className="w-6 h-6 text-white" /></div>{sidebarOpen && <span className="font-black text-xl tracking-tight uppercase">EduAssist</span>}</div>
          <nav className="flex-1 mt-10 px-4 space-y-2">
            {currentMenuItems.map((item) => (
              <button key={item.id} onClick={() => { setActiveMenu(item.id); setSelectedClassId(null); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeMenu === item.id ? 'theme-bg text-white' : 'text-slate-500 hover:text-white'}`}><item.icon className="w-6 h-6 shrink-0" />{sidebarOpen && <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>}</button>
            ))}
          </nav>
          <div className="p-6 border-t border-slate-800"><button onClick={handleLogout} className="flex items-center gap-4 p-4 text-slate-500 hover:text-red-400 w-full"><LogOut className="w-6 h-6" />{sidebarOpen && <span className="font-bold text-xs">Logout</span>}</button></div>
        </aside>
      )}

      <main className="flex-1 overflow-auto">
        <header className="bg-white/80 backdrop-blur-md h-20 border-b flex items-center justify-between px-10 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 rounded-xl"><Menu className="w-6 h-6 text-slate-600" /></button>
          <div className="flex items-center gap-6">
            <div className="text-right"><p className="text-sm font-black">{new Date().toLocaleDateString('en-GB')}</p><p className="text-[10px] theme-primary font-black uppercase">@{currentUser.username}</p></div>
            <div className="px-5 py-2 rounded-2xl text-[10px] font-black uppercase border theme-primary">{currentUser.role}</div>
            {currentUser.role === 'STUDENT' && <button onClick={handleLogout} className="p-2 text-red-500"><LogOut className="w-5 h-5" /></button>}
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
    { id: 'settings', icon: Settings, label: 'Settings' }
  ],
  STUDENT: []
};

export default App;

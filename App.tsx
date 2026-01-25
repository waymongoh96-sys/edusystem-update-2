import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, LayoutDashboard, BookOpen, ListChecks, Settings, 
  LogOut, GraduationCap, UserCog, Menu
} from 'lucide-react';
import { 
  Role, User, Class, LessonPlan, Task, AttendanceRecord, SystemSettings, 
  TaskStatus, UserStatus, ExamResult 
} from './types';
import { MOCK_STUDENTS, MOCK_TEACHERS, INITIAL_SETTINGS } from './constants';
import AdminView from './components/AdminView';
import TeacherDashboard from './components/TeacherDashboard';
import ClassRegistry from './components/ClassRegistry';
import ClassDetails from './components/ClassDetails';
import TaskBoard from './components/TaskBoard';
import SettingsView from './components/SettingsView';
import StudentDashboard from './components/StudentDashboard';
import Login from './components/Login';

// Firebase Imports
import { onSnapshot, collection, doc, setDoc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from './firebase';

const THEME_MAP: Record<string, string> = {
  blue: '#2563eb',
  emerald: '#059669',
  indigo: '#4f46e5',
  orange: '#ea580c'
};

const App: React.FC = () => {
  // Global Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Data State
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);

  // 1. IMPROVED ROLE DETECTION
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        // DEFAULT TO STUDENT FOR SAFETY (Prevents "Teacher View" leak)
        let detectedRole: Role = 'STUDENT'; 
        let userData: Partial<User> = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || email.split('@')[0],
          username: email.split('@')[0],
          status: UserStatus.ACTIVE
        };

        // Priority check for Admin
        if (email.toLowerCase().includes('admin')) {
          detectedRole = 'ADMIN';
        } else {
          // Check Teachers Collection First
          const teacherDoc = await getDoc(doc(db, 'teachers', firebaseUser.uid));
          if (teacherDoc.exists()) {
            detectedRole = 'TEACHER';
            userData = { ...userData, ...teacherDoc.data() };
          } else {
            // Check Students Collection
            const studentDoc = await getDoc(doc(db, 'students', firebaseUser.uid));
            if (studentDoc.exists()) {
              detectedRole = 'STUDENT';
              userData = { ...userData, ...studentDoc.data() };
            } 
            // Legacy Fallback (Only if email explicitly says 'teacher')
            else if (email.toLowerCase().includes('teacher')) {
              detectedRole = 'TEACHER';
            }
          }
        }

        setCurrentUser({
          ...userData,
          role: detectedRole
        } as User);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. DATA ISOLATION LOGIC
  useEffect(() => {
    if (!currentUser) return;

    // Define Base Queries based on Role
    let qClasses = query(collection(db, 'classes'));
    let qTasks = query(collection(db, 'tasks'));
    
    // -- SCOPING RULES --
    if (currentUser.role === 'TEACHER') {
      // Teacher sees ONLY their own classes
      qClasses = query(collection(db, 'classes'), where('teacherId', '==', currentUser.id));
      // Teacher sees ONLY their own tasks
      qTasks = query(collection(db, 'tasks'), where('userId', '==', currentUser.id));
    } else if (currentUser.role === 'STUDENT') {
      // Student sees classes they are enrolled in (Requires 'studentIds' array in Class doc)
      qClasses = query(collection(db, 'classes'), where('studentIds', 'array-contains', currentUser.id));
      // Students don't see generic tasks, only their own if applicable
      qTasks = query(collection(db, 'tasks'), where('userId', '==', currentUser.id));
    }
    // ADMIN keeps the default "fetch all" queries defined above

    // -- SUBSCRIPTIONS --
    const unsubClasses = onSnapshot(qClasses, (snap) => {
      const loadedClasses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class));
      setClasses(loadedClasses);
    });

    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    // For dependent data (Lesson Plans, Attendance, etc.), we fetch all but strictly filter 
    // in the UI or fetch only relevant ones if possible. 
    // Note: Complex queries might require Firestore Indexes.
    const unsubLessonPlans = onSnapshot(collection(db, 'lessonPlans'), (snap) => {
      const allPlans = snap.docs.map(d => ({ id: d.id, ...d.data() } as LessonPlan));
      // Filter strictly based on visible classes to prevent leaks
      if (currentUser.role !== 'ADMIN') {
        const visibleClassIds = new Set(classes.map(c => c.id));
        setLessonPlans(allPlans.filter(p => visibleClassIds.has(p.classId)));
      } else {
        setLessonPlans(allPlans);
      }
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
      unsubClasses(); unsubLessonPlans(); unsubTasks(); unsubAttendance(); 
      unsubExams(); unsubStudents(); unsubTeachers(); unsubSettings();
    };
  }, [currentUser, classes.length]); // Re-run dependent filters if class count changes

  // Priority Stream Task Generation
  const allTasks = useMemo(() => {
    const autoTasks: Task[] = lessonPlans
      .filter(lp => lp.status !== TaskStatus.COMPLETE)
      .map(lp => {
        const cls = classes.find(c => c.id === lp.classId);
        return {
          id: `lp-${lp.classId}-${lp.id}`, 
          name: `Prepare: ${cls?.name || 'Lesson'} (${lp.date})`,
          dueDate: lp.date,
          category: 'Preparation',
          status: lp.status
        };
      });
    return [...autoTasks, ...tasks];
  }, [lessonPlans, tasks, classes]);

  const primaryColor = useMemo(() => THEME_MAP[settings.themeColor] || THEME_MAP.blue, [settings.themeColor]);

  const handleNavigateToClass = (classId: string) => {
    setSelectedClassId(classId);
    setActiveMenu('classes');
  };

  const handleNavigateToTasks = () => {
    setActiveMenu('tasks');
  };

  const deleteLessonPlan = async (id: string) => {
    await deleteDoc(doc(db, 'lessonPlans', id));
  };

  const syncClassUpdate = async (updated: Class) => {
    await setDoc(doc(db, 'classes', updated.id), updated);
  };

  const handleLogout = () => signOut(auth);

  if (loading) return <div className="h-screen flex items-center justify-center font-black theme-primary">INITIALIZING EDUASSIST...</div>;
  if (!currentUser) return <Login />;

  const renderContent = () => {
    if (currentUser.role === 'ADMIN') {
      return <AdminView 
        teachers={teachers}
        students={students}
        classes={classes}
      />;
    }

    if (currentUser.role === 'TEACHER') {
      switch (activeMenu) {
        case 'dashboard':
          return <TeacherDashboard 
            tasks={allTasks} classes={classes} 
            lessonPlans={lessonPlans} settings={settings}
            onClassClick={handleNavigateToClass}
            onTaskClick={handleNavigateToTasks}
          />;
        case 'classes':
          if (selectedClassId) {
            const cls = classes.find(c => c.id === selectedClassId);
            return cls ? (
              <ClassDetails 
                cls={cls} students={students} lessonPlans={lessonPlans}
                setLessonPlans={setLessonPlans} attendance={attendance}
                setAttendance={setAttendance} settings={settings}
                examResults={examResults} setExamResults={setExamResults}
                onBack={() => setSelectedClassId(null)}
                onDeletePlan={deleteLessonPlan}
                updateClass={syncClassUpdate}
              />
            ) : null;
          }
          return <ClassRegistry 
            classes={classes} 
            onSelectClass={setSelectedClassId} 
            settings={settings}
            lessonPlans={lessonPlans}
          />;
        case 'tasks':
          return <TaskBoard tasks={tasks} settings={settings} />;
        case 'settings':
          return <SettingsView settings={settings} />;
        default:
          return null;
      }
    }

    if (currentUser.role === 'STUDENT') {
      return (
        <StudentDashboard 
          student={currentUser} 
          classes={classes} 
          attendance={attendance} 
          examResults={examResults} 
        />
      );
    }

    return null;
  };

  // Safe check for menu items to prevent crashes if role is undefined
  const currentMenuItems = menuItems[currentUser.role] || [];

  return (
    <div className="min-h-screen flex bg-slate-50/50">
      <style>{`
        :root { 
          --primary-color: ${primaryColor}; 
          --primary-light: ${primaryColor}15; 
        }
        .theme-primary { color: var(--primary-color) !important; }
        .theme-bg { background-color: var(--primary-color) !important; }
        .theme-border { border-color: var(--primary-color) !important; }
        .theme-ring { --tw-ring-color: var(--primary-color) !important; }
        .theme-light-bg { background-color: var(--primary-light) !important; }
      `}</style>

      <aside className={`bg-slate-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-24'} flex flex-col shrink-0`}>
        <div className="p-6 flex items-center gap-3">
          <div className="theme-bg p-2 rounded-xl shadow-lg shadow-blue-500/20">
            < GraduationCap className="w-6 h-6 text-white" />
          </div>
          {sidebarOpen && <span className="font-black text-xl tracking-tight uppercase">EduAssist</span>}
        </div>

        <nav className="flex-1 mt-10 px-4 space-y-2">
          {currentMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveMenu(item.id); setSelectedClassId(null); }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                activeMenu === item.id ? 'theme-bg text-white shadow-xl scale-105' : 'text-slate-500 hover:bg-slate-800 hover:text-white'
              }`}
            >
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
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 hover:bg-slate-100 rounded-xl">
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-black text-slate-800">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p className="text-[10px] font-black theme-primary uppercase tracking-widest">@{currentUser.username}</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div className="px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border theme-border theme-primary theme-light-bg">
              {currentUser.role}
            </div>
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto w-full">
          {renderContent()}
        </div>
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

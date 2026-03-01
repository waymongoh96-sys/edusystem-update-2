import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, BookOpen, Settings, LogOut, GraduationCap, Menu } from 'lucide-react';
import { User, Class, LessonPlan, Task, AttendanceRecord, SystemSettings, UserStatus, Announcement, Holiday, Invoice, CommunityPost } from './types';
import { supabase } from './supabase';
import { INITIAL_SETTINGS } from './constants';
import AdminView from './components/AdminView';
import TeacherDashboard from './components/TeacherDashboard';
import ClassRegistry from './components/ClassRegistry';
import ClassDetails from './components/ClassDetails';
import SettingsView from './components/SettingsView';
import StudentDashboard from './components/StudentDashboard';
import Login from './components/Login';

const THEME_MAP: Record<string, string> = {
  blue: '#2563eb', emerald: '#059669', indigo: '#4f46e5', orange: '#ea580c'
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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [settings] = useState<SystemSettings>(INITIAL_SETTINGS);

  // 1. Unified Auth & Account Identification
  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await handleUserSync(session.user);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) await handleUserSync(session.user);
      else setCurrentUser(null);
      setLoading(false);
    });

    const handleUserSync = async (supabaseUser: any) => {
      const email = supabaseUser.email?.toLowerCase() || '';
      // Fetch profile from Supabase
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', supabaseUser.id).single();

      let userData: User = {
        id: supabaseUser.id,
        name: profile?.name || email.split('@')[0],
        username: profile?.username || email.split('@')[0],
        status: UserStatus.ACTIVE,
        role: profile?.role || 'STUDENT', 
        avatar_url: profile?.avatar_url
      };

      // Admin Override for your specific email
      if (email === 'waymongo@gmail.com') {
        userData.role = 'ADMIN';
      }

      setCurrentUser(userData);
    };

    initializeAuth();
    return () => subscription.unsubscribe();
  }, []);

  // 2. Data Fetching (Replacing Firebase with Supabase)
  useEffect(() => {
    if (!currentUser) return;

    const fetchAllData = async () => {
      // Fetch Users (Teachers & Students)
      const { data: allProfiles } = await supabase.from('profiles').select('*');
      if (allProfiles) {
        setTeachers(allProfiles.filter(p => p.role === 'TEACHER'));
        setStudents(allProfiles.filter(p => p.role === 'STUDENT'));
      }

      // Fetch Announcements
      const { data: annData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      setAnnouncements(annData || []);

      // Fetch Holidays
      const { data: holData } = await supabase.from('holidays').select('*');
      setHolidays(holData || []);

      // Fetch Invoices (Billing)
      const query = supabase.from('invoices').select('*');
      if (currentUser.role === 'STUDENT') query.eq('student_id', currentUser.id);
      const { data: invData } = await query;
      setInvoices(invData || []);

      // Fetch Community Posts
      const { data: postData } = await supabase.from('community_posts').select('*, profiles(name)').order('created_at', { ascending: false });
      setCommunityPosts(postData || []);
    };

    fetchAllData();

    // Set up real-time listeners for updates
    const channel = supabase.channel('system-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, fetchAllData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const handleLogout = () => supabase.auth.signOut();
  const primaryColor = useMemo(() => THEME_MAP[settings.themeColor] || THEME_MAP.blue, [settings.themeColor]);

  if (loading) return <div className="h-screen flex items-center justify-center font-black">LOADING EDUASSIST...</div>;
  if (!currentUser) return <Login />;

  const renderContent = () => {
    if (currentUser.role === 'ADMIN') return <AdminView teachers={teachers} students={students} classes={classes} holidays={holidays} />;
    
    if (currentUser.role === 'TEACHER') {
      switch (activeMenu) {
        case 'dashboard': return <TeacherDashboard tasks={[]} classes={classes} lessonPlans={[]} settings={settings} onClassClick={(id) => { setSelectedClassId(id); setActiveMenu('classes'); }} onTaskClick={() => {}} currentUser={currentUser} holidays={holidays} />;
        case 'classes': return selectedClassId ? <ClassDetails cls={classes.find(c => c.id === selectedClassId)!} students={students} lessonPlans={[]} setLessonPlans={() => {}} attendance={[]} setAttendance={() => {}} settings={settings} examResults={[]} setExamResults={() => {}} onBack={() => setSelectedClassId(null)} updateClass={async () => {}} currentUser={currentUser} onDeletePlan={async () => {}} /> : <ClassRegistry classes={classes} onSelectClass={(id) => { setSelectedClassId(id); setActiveMenu('classes'); }} settings={settings} lessonPlans={[]} currentUser={currentUser} />;
        default: return null;
      }
    }

    return <StudentDashboard student={currentUser} classes={classes} attendance={[]} examResults={[]} lessonPlans={[]} settings={settings} onLogout={handleLogout} announcements={announcements} invoices={invoices} holidays={holidays} />;
  };

  return (
    <div className="min-h-screen flex bg-slate-50/50">
      <style>{`:root { --primary-color: ${primaryColor}; }`}</style>
      
      {currentUser.role !== 'STUDENT' && (
        <aside className={`bg-slate-900 text-white transition-all ${sidebarOpen ? 'w-64' : 'w-24'} flex flex-col`}>
          <div className="p-6 flex items-center gap-3"><GraduationCap className="w-6 h-6" />{sidebarOpen && <span className="font-black uppercase">EduAssist</span>}</div>
          <nav className="flex-1 px-4 space-y-2">
            {(menuItems[currentUser.role] || []).map((item) => (
              <button key={item.id} onClick={() => setActiveMenu(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl ${activeMenu === item.id ? 'bg-blue-600' : 'text-slate-500'}`}><item.icon className="w-6 h-6" />{sidebarOpen && <span className="font-bold text-xs uppercase">{item.label}</span>}</button>
            ))}
          </nav>
          <button onClick={handleLogout} className="p-10 text-slate-500 hover:text-red-400 flex items-center gap-4"><LogOut />{sidebarOpen && "Logout"}</button>
        </aside>
      )}

      <main className="flex-1 overflow-auto">
        <header className="h-20 bg-white border-b flex items-center justify-between px-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}><Menu /></button>
          <div className="flex items-center gap-4">
            <div className="text-right"><p className="text-sm font-black">{new Date().toLocaleDateString()}</p><p className="text-[10px] text-blue-600 uppercase">@{currentUser.username}</p></div>
            <div className="px-4 py-1 border rounded-xl text-[10px] font-bold">{currentUser.role}</div>
          </div>
        </header>
        <div className="p-10">{renderContent()}</div>
      </main>
    </div>
  );
};

const menuItems: any = {
  ADMIN: [{ id: 'dashboard', icon: LayoutDashboard, label: 'Admin Hub' }],
  TEACHER: [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'classes', icon: BookOpen, label: 'Classes' }
  ]
};

export default App;

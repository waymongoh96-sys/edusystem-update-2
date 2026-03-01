import React, { useState, useMemo } from 'react';
import {
  GraduationCap, BookOpen, Calendar as CalendarIcon, Clock, TrendingUp,
  CheckCircle2, AlertCircle, ChevronLeft, BarChart3, Sparkles, FileText,
  Home, User as UserIcon, LogOut, Settings, Bell, ChevronRight, Check,
  Search, Shield, Receipt, HelpCircle, X, MoreHorizontal, MessageSquare, Play, Megaphone
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, Class, AttendanceRecord, ExamResult, AttendanceStatus, LessonPlan, SystemSettings, Announcement, Holiday, Invoice, Payment } from '../types';

interface StudentDashboardProps {
  student: User;
  classes: Class[];
  attendance: AttendanceRecord[];
  examResults: ExamResult[];
  lessonPlans: LessonPlan[];
  settings: SystemSettings;
  onLogout: () => void;
  announcements: Announcement[];
  invoices: Invoice[];
  holidays: Holiday[];
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student, classes, attendance, examResults, lessonPlans, settings, onLogout, announcements, invoices, holidays
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'classes' | 'community' | 'billing' | 'account'>('home');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const enrolledClasses = useMemo(() => {
    return classes.filter(c => {
      const ids = c.enrolledStudentIds || (c as any).studentIds || [];
      return Array.isArray(ids) && ids.includes(student.id);
    });
  }, [classes, student.id]);

  if (selectedClassId) {
    const cls = enrolledClasses.find(c => c.id === selectedClassId);
    return cls ? (
      <StudentClassView
        cls={cls}
        student={student}
        attendance={attendance.filter(a => a.classId === cls.id && a.studentId === student.id)}
        examResults={examResults.filter(r => r.classId === cls.id && r.studentId === student.id)}
        lessonPlans={lessonPlans.filter(lp => lp.classId === cls.id)}
        onBack={() => setSelectedClassId(null)}
      />
    ) : null;
  }

  return (
    <div className="flex flex-col h-screen md:h-auto md:min-h-[800px] bg-[#F8F9FA] relative w-full max-w-[500px] mx-auto md:border md:border-slate-200 md:shadow-2xl md:rounded-[3rem] overflow-hidden">

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pb-28 custom-scrollbar">
        {activeTab === 'home' && <StudentHome student={student} enrolledClasses={enrolledClasses} announcements={announcements} holidays={holidays} onNavigateToClass={(id) => setSelectedClassId(id)} />}
        {activeTab === 'classes' && <StudentClasses enrolledClasses={enrolledClasses} attendance={attendance} student={student} onNavigateToClass={(id) => setSelectedClassId(id)} />}
        {activeTab === 'community' && <CommunityView announcements={announcements} />}
        {activeTab === 'billing' && <BillingHistoryView invoices={invoices} student={student} />}
        {activeTab === 'account' && <StudentAccount student={student} enrolledClasses={enrolledClasses} onLogout={onLogout} settings={settings} />}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50 pb-8 md:pb-4">
        <NavItem icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon={GraduationCap} label="Classes" active={activeTab === 'classes'} onClick={() => setActiveTab('classes')} />

        <div className="relative -top-6">
          <button onClick={() => setActiveTab('community')} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-all ${activeTab === 'community' ? 'bg-blue-600 shadow-blue-500/40 text-white' : 'bg-white border border-slate-100 text-slate-400'}`}>
            <Sparkles className="w-6 h-6" />
          </button>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">Community</span>
        </div>

        <NavItem icon={Receipt} label="Billing" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
        <NavItem icon={UserIcon} label="Profile" active={activeTab === 'account'} onClick={() => setActiveTab('account')} />
      </div>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600'} w-12`}>
    <Icon className={`w-6 h-6 ${active ? 'fill-blue-500/20 stroke-blue-500' : 'stroke-slate-400'}`} strokeWidth={active ? 2.5 : 2} />
    <span className={`text-[10px] font-black tracking-wide ${active ? 'text-blue-500' : ''}`}>{label}</span>
  </button>
);

// ========================
// HOME VIEW
// ========================
const StudentHome: React.FC<{ student: User, enrolledClasses: Class[], announcements: Announcement[], holidays: Holiday[], onNavigateToClass: (id: string) => void }> = ({ student, enrolledClasses, announcements, holidays, onNavigateToClass }) => {
  const [closedAlerts, setClosedAlerts] = useState<string[]>([]);

  const activeAnnouncements = useMemo(() => {
    return announcements.filter(a =>
      !closedAlerts.includes(a.id) &&
      (a.is_global || (a.target_standard && a.target_standard === student.standard) || (a.target_student_ids && a.target_student_ids.includes(student.id)))
    );
  }, [announcements, student, closedAlerts]);

  const holidayMap = useMemo(() => {
    const map: Record<string, string> = {};
    holidays.forEach(h => {
      const date = new Date(h.date);
      map[date.getDate()] = h.description;
    });
    return map;
  }, [holidays]);

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-400 p-0.5 shadow-lg shadow-emerald-400/20">
            <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden relative">
              <img src={student.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${student.username}&backgroundColor=e2e8f0`} alt="avatar" className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Hi, {student.name}! 👋</h1>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Ready for fun learning?</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 relative shadow-sm">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </header>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-slate-800">Class Fleet</h2>
          <button onClick={() => { }} className="text-blue-500 font-black text-[10px] uppercase tracking-widest">See All</button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
          {enrolledClasses.map((cls, idx) => (
            <div key={cls.id} onClick={() => onNavigateToClass(cls.id)} className="min-w-[170px] p-6 rounded-[2.5rem] snap-start cursor-pointer border border-slate-100 shadow-sm transition-all active:scale-95 bg-white group" style={{ borderLeft: `4px solid ${cls.themeColor}` }}>
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                <span className="text-xl font-black" style={{ color: cls.themeColor }}>{cls.name.charAt(0)}</span>
              </div>
              <h3 className="font-black text-slate-800 text-sm mb-1 leading-tight">{cls.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 mb-4 uppercase">{cls.classDay}, {cls.classTime}</p>
              <div className="px-3 py-1 rounded-full inline-block" style={{ backgroundColor: cls.themeColor + '15', color: cls.themeColor }}>
                <p className="text-[8px] font-bold uppercase tracking-widest">Ongoing</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {activeAnnouncements.length > 0 && (
        <section className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-[2.5rem] flex items-start gap-4 shadow-xl shadow-blue-500/20 text-white animate-in zoom-in-95 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white"><Megaphone className="w-5 h-5" /></div>
          <div className="pr-4 relative z-10">
            <h4 className="font-black text-xs uppercase tracking-widest opacity-70 mb-1">New Broadcast</h4>
            <h4 className="font-black text-sm mb-1">{activeAnnouncements[0].title}</h4>
            <p className="text-[11px] font-medium leading-relaxed opacity-90 line-clamp-2">{activeAnnouncements[0].content}</p>
          </div>
          <button onClick={() => setClosedAlerts([...closedAlerts, activeAnnouncements[0].id])} className="absolute top-4 right-4 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white"><X className="w-3 h-3" /></button>
        </section>
      )}

      <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="font-black text-slate-800 text-lg tracking-tight">Centre Calendar</h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-6 mb-8">
          {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(d => <div key={d} className="text-center text-[10px] font-black text-slate-400">{d}</div>)}
          {Array.from({ length: 30 }).map((_, i) => {
            const day = i + 1;
            const isToday = day === new Date().getDate();
            const isHoliday = !!holidayMap[day];

            return (
              <div key={i} className="text-center text-sm font-black flex flex-col items-center gap-1 group relative">
                <span className={`w-9 h-9 flex items-center justify-center rounded-2xl transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' : isHoliday ? 'text-red-500 bg-red-50 font-black' : 'text-slate-800 hover:bg-slate-50'}`}>
                  {day}
                </span>
                {isHoliday && <div className="absolute -bottom-1 w-1 h-1 bg-red-500 rounded-full" />}
                {isHoliday && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none font-bold">
                    {holidayMap[day]}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {Object.entries(holidayMap).length > 0 && (
          <div className="bg-red-50 rounded-2xl p-4 flex items-center gap-3 border border-red-100/50">
            <CalendarIcon className="w-4 h-4 text-red-500" />
            <span className="text-red-600 font-black text-[10px] uppercase tracking-widest">Monthly Holidays Active</span>
          </div>
        )}
      </section>
    </div>
  );
};

// ========================
// CLASSES VIEW
// ========================
const StudentClasses: React.FC<{ enrolledClasses: Class[], attendance: AttendanceRecord[], student: User, onNavigateToClass: (id: string) => void }> = ({ enrolledClasses, attendance, student, onNavigateToClass }) => {
  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <header className="flex justify-between items-center mt-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Academia</h1>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{enrolledClasses.length} Active Enrolments</p>
        </div>
        <button className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400">
          <Search className="w-5 h-5" />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {enrolledClasses.map((cls, idx) => {
          const classAttendance = attendance.filter(a => a.classId === cls.id && a.studentId === student.id);
          const presentCount = classAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
          const attendanceRate = classAttendance.length > 0 ? Math.round((presentCount / classAttendance.length) * 100) : 100;

          const themes = [
            { bg: '#EEF2FF', text: '#4F46E5', bar: '#6366F1' },
            { bg: '#FFF1F2', text: '#E11D48', bar: '#F43F5E' },
            { bg: '#ECFDF5', text: '#059669', bar: '#10B981' },
            { bg: '#FFFBEB', text: '#D97706', bar: '#F59E0B' },
          ];
          const t = themes[idx % themes.length];

          return (
            <div key={cls.id} onClick={() => onNavigateToClass(cls.id)} className="rounded-[2.5rem] p-6 cursor-pointer hover:scale-[0.98] transition-all shadow-sm flex flex-col justify-between min-h-[200px] bg-white border border-slate-100 group">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: t.bg }}>
                  <span className="text-xl font-black" style={{ color: t.text }}>{cls.name.charAt(0)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[14px] font-black text-slate-800 tracking-tighter">{attendanceRate}%</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Attendance</span>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="font-black text-slate-800 text-sm leading-tight mb-2 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{cls.name}</h3>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${attendanceRate}%`, backgroundColor: t.bar }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========================
// ACCOUNT VIEW
// ========================
const StudentAccount: React.FC<{ student: User, enrolledClasses: Class[], onLogout: () => void, settings: SystemSettings }> = ({ student, enrolledClasses, onLogout, settings }) => {
  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <header className="flex justify-between items-center mt-4">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Profile</h1>
        <button className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <section className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm flex flex-col items-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600 -z-10" />

        <div className="w-28 h-28 rounded-[2.5rem] border-4 border-white p-1 relative mb-6 shadow-xl bg-white mt-4 group-hover:scale-105 transition-all">
          <div className="w-full h-full rounded-[2rem] bg-slate-100 overflow-hidden">
            <img src={student.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${student.username}&backgroundColor=e2e8f0`} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-blue-600 hover:bg-slate-50 transition-colors">
            <UserIcon className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{student.name}</h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">@{student.username}</p>

        <div className="flex gap-4 mt-8 w-full">
          <div className="flex-1 bg-slate-50 p-4 rounded-3xl text-center">
            <span className="block text-lg font-black text-slate-800">{student.standard || 'N/A'}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Standard</span>
          </div>
          <div className="flex-1 bg-slate-50 p-4 rounded-3xl text-center">
            <span className="block text-lg font-black text-slate-800">{enrolledClasses.length}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Classes</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest ml-2">Quick Actions</h3>
        <button className="w-full bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-black text-slate-800 text-sm">Security & Password</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
        </button>

        <button className="w-full bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-black text-slate-800 text-sm">Learning Preferences</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
        </button>
      </section>

      <div className="pt-8">
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 py-5 text-red-600 font-black bg-red-50 rounded-[2rem] hover:bg-red-100 transition-all uppercase text-xs tracking-widest">
          <LogOut className="w-4 h-4" /> Sign Out from System
        </button>
      </div>
    </div>
  );
};


// ========================
// CLASS DETAILS VIEW
// ========================
const StudentClassView: React.FC<{
  cls: Class;
  student: User;
  attendance: AttendanceRecord[];
  examResults: ExamResult[];
  lessonPlans: LessonPlan[];
  onBack: () => void;
}> = ({ cls, student, attendance, examResults, lessonPlans, onBack }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [aiAnalysis, setAiAnalysis] = useState<{ en: string, cn: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lang, setLang] = useState<'en' | 'cn'>('en');

  const stats = useMemo(() => {
    const monthAttendance = attendance.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() === selectedMonth;
    });
    const presentCount = monthAttendance.filter(a => String(a.status) === 'PRESENT' || a.status === AttendanceStatus.PRESENT).length;
    const attPercent = monthAttendance.length > 0 ? Math.round((presentCount / monthAttendance.length) * 100) : 100;
    const latestExam = examResults.length > 0 ? [...examResults].sort((a, b) => b.id.localeCompare(a.id))[0] : null;
    return { attPercent, latestExam, monthTotal: monthAttendance.length };
  }, [attendance, examResults, selectedMonth]);

  const generateAIComment = async () => {
    setIsGenerating(true);
    // 模拟调用 Gemini API
    setTimeout(() => {
      setAiAnalysis({
        en: `${student.name} is performing exceptionally in ${cls.name}. Their logic and participation are top-tier. Suggested focus: Advanced applications.`,
        cn: `${student.name} 在 ${cls.name} 表现非常出色，逻辑思维和参与度都是顶尖的。建议关注：高级应用题。`
      });
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="p-6 space-y-8 animate-in slide-in-from-right-8 duration-300 pb-20 bg-[#F8F9FA] min-h-full">
      <header className="flex justify-between items-center mt-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
        <div className="text-center">
          <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase">{cls.name}</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{student.standard} • {cls.classTime}</p>
        </div>
        <button className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-300"><MoreHorizontal className="w-5 h-5" /></button>
      </header>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Attendance Pulse</h3>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-50 border-none text-[10px] font-black rounded-lg px-3 py-1.5 focus:ring-0"
          >
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="absolute top-0 left-0 w-full h-full -rotate-90">
              <circle cx="48" cy="48" r="40" fill="none" strokeWidth="8" className="stroke-slate-50" />
              <circle cx="48" cy="48" r="40" fill="none" strokeWidth="8" className="stroke-blue-600 rounded-full" strokeDasharray="251" strokeDashoffset={251 - (251 * stats.attPercent / 100)} />
            </svg>
            <div className="text-center">
              <span className="text-xl font-black text-slate-800 block">{stats.attPercent}%</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Rate</span>
            </div>
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-black text-slate-800">Operational</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sessions</p>
              <span className="text-sm font-black text-slate-800">{stats.monthTotal} logged this month</span>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="flex items-center gap-2 text-slate-800 font-black uppercase text-xs tracking-widest"><FileText className="w-4 h-4 text-blue-600" /> Teacher Archive</div>
          <button className="text-blue-600 font-black text-[10px] uppercase tracking-widest">All History</button>
        </div>
        <div className="space-y-3">
          {[...lessonPlans].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((lp, idx) => (
            <div key={lp.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center font-black group-hover:bg-blue-50 transition-colors">
                  <span className="text-xs text-slate-400 group-hover:text-blue-600">{new Date(lp.date).getDate()}</span>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm tracking-tight">{lp.topic}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{lp.date}</p>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          ))}
          {lessonPlans.length === 0 && (
            <div className="bg-white/50 border border-dashed border-slate-200 p-8 rounded-[2rem] text-center text-slate-400 font-bold text-xs uppercase">No archived sessions</div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0"><img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${cls.teacherId}`} alt="teacher" className="w-full h-full object-cover" /></div>
            <div>
              <h4 className="font-black text-slate-800 text-sm">Instructor Review</h4>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Feedback Cycle</p>
            </div>
          </div>
          <button onClick={generateAIComment} disabled={isGenerating} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50">
            {isGenerating ? 'Analyzing...' : 'AI Summary'}
          </button>
        </div>

        {aiAnalysis ? (
          <div className="animate-in fade-in slide-in-from-top-4">
            <div className="flex gap-2 mb-4 bg-slate-50 p-1.5 rounded-xl w-fit">
              <button onClick={() => setLang('en')} className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${lang === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>English</button>
              <button onClick={() => setLang('cn')} className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${lang === 'cn' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Chinese</button>
            </div>
            <div className="bg-blue-50/50 p-5 rounded-3xl border-l-4 border-blue-600">
              <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                "{aiAnalysis[lang]}"
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200 text-center">
            <Sparkles className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-[10px] text-slate-400 font-black uppercase leading-relaxed tracking-widest">Run AI analysis to generate insights from teacher feedback</p>
          </div>
        )}
      </section>
    </div>
  );
};

// ========================
// COMMUNITY VIEW
// ========================
const CommunityView: React.FC<{ announcements: Announcement[] }> = ({ announcements }) => {
  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <header className="flex justify-between items-center mt-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Community</h1>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Updates & Announcements</p>
        </div>
      </header>

      <div className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">{a.title}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            {a.image_url && <img src={a.image_url} className="w-full h-48 object-cover rounded-3xl mb-4" alt="announcement" />}
            <p className="text-sm text-slate-600 leading-relaxed">{a.content}</p>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-20 text-slate-400 font-bold">No community updates yet</div>
        )}
      </div>
    </div>
  );
};

// ========================
// BILLING HISTORY VIEW
// ========================
const BillingHistoryView: React.FC<{ invoices: Invoice[], student: User }> = ({ invoices, student }) => {
  const balance = invoices.reduce((acc, inv) => acc + (inv.status === 'UNPAID' ? inv.amount : 0), 0);

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <header className="flex justify-between items-center mt-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Finances</h1>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Billing & Invoices</p>
        </div>
      </header>

      <section className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl transform translate-x-32 -translate-y-32" />
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-2">Account Balance</p>
        <div className="flex justify-between items-end">
          <h2 className="text-5xl font-black leading-none tracking-tighter">RM{balance.toFixed(2)}</h2>
          {balance > 0 && <button className="bg-blue-600 text-white font-black text-xs px-6 py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all uppercase tracking-widest">Pay Now</button>}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest ml-2">Invoice History</h3>
        {invoices.map((inv) => (
          <div key={inv.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-slate-800 text-sm tracking-tight">{inv.description || `Invoice #${inv.id.substring(0, 5)}`}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(inv.date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-slate-800 tracking-tighter">RM{inv.amount.toFixed(2)}</p>
              <p className={`text-[9px] font-black uppercase tracking-widest ${inv.status === 'PAID' ? 'text-emerald-500' : 'text-red-500'}`}>{inv.status}</p>
            </div>
          </div>
        ))}
        {invoices.length === 0 && (
          <div className="text-center py-20 text-slate-400 font-bold">No financial records found</div>
        )}
      </section>
    </div>
  );
};

export default StudentDashboard;

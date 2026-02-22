import React, { useState, useMemo } from 'react';
import {
  GraduationCap, BookOpen, Calendar as CalendarIcon, Clock, TrendingUp,
  CheckCircle2, AlertCircle, ChevronLeft, BarChart3, Sparkles, FileText,
  Home, User as UserIcon, LogOut, Settings, Bell, ChevronRight, Check,
  Search, Shield, Receipt, HelpCircle, X, MoreHorizontal, MessageSquare, Play
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, Class, AttendanceRecord, ExamResult, AttendanceStatus, LessonPlan, SystemSettings } from '../types';

interface StudentDashboardProps {
  student: User;
  classes: Class[];
  attendance: AttendanceRecord[];
  examResults: ExamResult[];
  lessonPlans: LessonPlan[];
  settings: SystemSettings;
  onLogout: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student, classes, attendance, examResults, lessonPlans, settings, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'classes' | 'account'>('home');
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
        {activeTab === 'home' && <StudentHome student={student} enrolledClasses={enrolledClasses} lessonPlans={lessonPlans} onNavigateToClass={(id) => setSelectedClassId(id)} />}
        {activeTab === 'classes' && <StudentClasses enrolledClasses={enrolledClasses} onNavigateToClass={(id) => setSelectedClassId(id)} />}
        {activeTab === 'account' && <StudentAccount student={student} enrolledClasses={enrolledClasses} onLogout={onLogout} />}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50 pb-8 md:pb-4">
        <NavItem icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon={GraduationCap} label="Classes" active={activeTab === 'classes'} onClick={() => setActiveTab('classes')} />
        {/* Center action button placeholder to match UI design feel, but we map to classes for now */}
        <div className="relative -top-6">
          <button onClick={() => setActiveTab('classes')} className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 text-white transform hover:scale-105 transition-all">
            <Sparkles className="w-6 h-6" />
          </button>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-400">Post</span>
        </div>
        <NavItem icon={BarChart3} label="Stats" active={false} onClick={() => { }} />
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
const StudentHome: React.FC<{ student: User, enrolledClasses: Class[], lessonPlans: LessonPlan[], onNavigateToClass: (id: string) => void }> = ({ student, enrolledClasses, lessonPlans, onNavigateToClass }) => {
  const [alertOpen, setAlertOpen] = useState(true);

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-400 p-0.5">
            <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden relative">
              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${student.username}&backgroundColor=e2e8f0`} alt="avatar" className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Hi, {student.name}! 👋</h1>
            <p className="text-sm font-bold text-slate-400">Ready for fun learning?</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-400 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </header>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-slate-800">Upcoming Classes</h2>
          <button onClick={() => { }} className="text-pink-400 font-bold text-sm">See All</button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
          {enrolledClasses.slice(0, 2).map((cls, idx) => (
            <div key={cls.id} onClick={() => onNavigateToClass(cls.id)} className="min-w-[160px] p-5 rounded-3xl snap-start cursor-pointer border border-slate-100 shadow-sm transition-all active:scale-95" style={{ backgroundColor: `${cls.themeColor}10` }}>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
                <span className="text-xl font-black" style={{ color: cls.themeColor }}>{cls.name.charAt(0)}</span>
              </div>
              <h3 className="font-black text-slate-800 mb-1 leading-tight">{cls.name}</h3>
              <p className="text-xs font-bold text-slate-500 mb-4">{idx === 0 ? 'Today' : 'Tomorrow'}, {cls.classTime}</p>
              <div className="px-3 py-1.5 rounded-full inline-block" style={{ backgroundColor: cls.themeColor + '20', color: cls.themeColor }}>
                <p className="text-[9px] font-black uppercase tracking-widest">{idx === 0 ? '● LIVE SOON' : 'TOMORROW'}</p>
              </div>
            </div>
          ))}
          {enrolledClasses.length === 0 && (
            <div className="min-w-[200px] p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm">No upcoming classes</div>
          )}
        </div>
      </section>

      {alertOpen && (
        <section className="relative bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-3xl border border-amber-100 flex items-start gap-4 shadow-sm animate-in zoom-in-95">
          <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center shrink-0 shadow-md shadow-amber-400/30 text-white"><AlertCircle className="w-5 h-5" /></div>
          <div className="pr-4">
            <h4 className="font-bold text-amber-900 text-sm mb-0.5">Summer Camp Alert!</h4>
            <p className="text-xs text-amber-700/80 leading-snug">Registration for the 'Coding for Kids' camp is now open. Don't miss out!</p>
          </div>
          <button onClick={() => setAlertOpen(false)} className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm"><X className="w-3 h-3" /></button>
        </section>
      )}

      <section className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-black text-slate-800 text-lg">Centre Calendar</h3>
            <p className="text-slate-400 font-bold text-xs">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
            <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Simple mock calendar grid */}
        <div className="grid grid-cols-7 gap-y-4 mb-6">
          {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(d => <div key={d} className="text-center text-[10px] font-black text-slate-400">{d}</div>)}
          {[24, 25, 26, 27, 28, 29].map(d => <div key={'p' + d} className="text-center text-sm font-bold text-slate-300">{d}</div>)}
          {Array.from({ length: 29 }).map((_, i) => (
            <div key={i} className="text-center text-sm font-black text-slate-800 flex flex-col items-center gap-1 cursor-pointer">
              <span className={`${i + 1 === 1 ? 'w-8 h-8 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center' : ''} ${i + 1 === 25 ? 'text-pink-400' : ''}`}>{i + 1}</span>
              {i + 1 === 25 && <div className="w-1 h-1 bg-pink-400 rounded-full" />}
            </div>
          ))}
        </div>

        <div className="bg-pink-50 rounded-2xl p-4 flex items-center gap-3 border border-pink-100">
          <CalendarIcon className="w-5 h-5 text-pink-400" />
          <span className="text-pink-500 font-bold text-xs">Holiday: Mid-Term Break (Oct 25)</span>
        </div>
      </section>
    </div>
  );
};

// ========================
// CLASSES VIEW
// ========================
const StudentClasses: React.FC<{ enrolledClasses: Class[], onNavigateToClass: (id: string) => void }> = ({ enrolledClasses, onNavigateToClass }) => {
  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <header className="flex justify-between items-center mt-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800">My Classes</h1>
          <p className="text-sm font-bold text-slate-500">{enrolledClasses.length} Enrolled • Semester 2</p>
        </div>
        <button className="w-12 h-12 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-blue-500">
          <Search className="w-5 h-5" />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {enrolledClasses.map((cls, idx) => {
          // Generate a random-looking percentage and theme
          const progress = 45 + (idx * 15 % 55);
          const themes = [
            { bg: '#e0f2fe', text: '#0284c7', bar: '#3b82f6' },
            { bg: '#fce7f3', text: '#db2777', bar: '#ec4899' },
            { bg: '#ffedd5', text: '#ea580c', bar: '#f97316' },
            { bg: '#f3e8ff', text: '#9333ea', bar: '#a855f7' },
            { bg: '#ecfdf5', text: '#059669', bar: '#10b981' },
            { bg: '#fef9c3', text: '#ca8a04', bar: '#eab308' },
          ];
          const t = themes[idx % themes.length];

          return (
            <div key={cls.id} onClick={() => onNavigateToClass(cls.id)} className="rounded-[2rem] p-5 cursor-pointer hover:scale-95 transition-all shadow-sm flex flex-col justify-between min-h-[180px]" style={{ backgroundColor: t.bg }}>
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center">
                  <span className="text-lg font-black" style={{ color: t.text }}>{cls.name.charAt(0)}</span>
                </div>
                <div className="px-2 py-1 rounded-full text-[9px] font-black text-white" style={{ backgroundColor: t.bar }}>{progress}%</div>
              </div>
              <div className="mt-4">
                <h3 className="font-black text-slate-800 text-[15px] leading-tight mb-1">{cls.name}</h3>
                <p className="text-[10px] font-bold text-slate-500 mb-4 truncate">{cls.teacherId.replace('t', 'Teacher ')}</p>
                <div className="w-full h-1.5 bg-white/50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: t.bar }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 rounded-[2rem] p-5 border border-blue-100 flex items-center gap-4 shadow-sm mt-8">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
          <Sparkles className="w-6 h-6 text-blue-500" />
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">AI Recommendation</p>
          <p className="text-xs font-bold text-slate-700 leading-tight mt-1">Your literature score needs a boost! Try the "Quick Poetry Quiz" tonight.</p>
        </div>
        <ChevronRight className="w-5 h-5 text-blue-400" />
      </div>
    </div>
  );
}

// ========================
// ACCOUNT VIEW
// ========================
const StudentAccount: React.FC<{ student: User, enrolledClasses: Class[], onLogout: () => void }> = ({ student, enrolledClasses, onLogout }) => {
  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <header className="flex justify-between items-center mt-4">
        <button className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center invisible"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-black text-slate-800">My Profile</h1>
        <button className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-600"><Settings className="w-5 h-5" /></button>
      </header>

      <section className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] -z-10" />

        <div className="w-24 h-24 rounded-full border-4 border-emerald-400 p-1 relative mb-4">
          <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden">
            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${student.username}&backgroundColor=e2e8f0`} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-400 border-2 border-white rounded-full flex items-center justify-center text-white">
            <Shield className="w-3 h-3" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-slate-800">{student.name}</h2>
        <p className="text-sm font-bold text-slate-400 mb-6">Student ID: #{student.id.substring(0, 6).toUpperCase()}</p>

        <div className="flex gap-2">
          <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-xs font-black">Grade 8</span>
          <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-xs font-black">Greenwood Academy</span>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-slate-800 text-lg">My Classes</h3>
          <button className="text-emerald-500 font-bold text-sm">View All</button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
          {enrolledClasses.slice(0, 2).map((cls, idx) => (
            <div key={cls.id} className="min-w-[150px] p-5 rounded-3xl" style={{ backgroundColor: idx === 0 ? '#f3e8ff' : '#fce7f3' }}>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4">
                <span className="font-black" style={{ color: idx === 0 ? '#9333ea' : '#db2777' }}>{cls.name.substring(0, 2)}</span>
              </div>
              <h4 className="font-black text-slate-800 text-sm">{cls.name}</h4>
              <p className="text-[10px] font-bold text-slate-500 mb-4">{cls.teacherId.replace('t', 'Mr. ')}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: idx === 0 ? '#10b981' : '#cbd5e1' }} />
                <span className="text-[9px] font-black" style={{ color: idx === 0 ? '#a855f7' : '#ec4899' }}>{idx === 0 ? 'ONGOING' : 'TOMORROW'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-black text-slate-800 text-lg mb-4">Invoices & Finances</h3>
        <div className="bg-emerald-50 rounded-[2.5rem] p-6 border border-emerald-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Current Balance</p>
          <div className="flex justify-between items-end">
            <h2 className="text-4xl font-black text-slate-800">$120.00</h2>
            <button className="bg-emerald-400 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-emerald-400/30 hover:scale-105 transition-all">Pay Now</button>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-emerald-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">Due by Oct 15, 2023</span>
          </div>
        </div>

        <p className="font-black text-slate-500 text-xs mt-6 mb-4">Recent Payments</p>
        <div className="space-y-3 mb-10">
          <div className="bg-white p-4 justify-between items-center flex rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><Receipt className="w-5 h-5" /></div>
              <div><p className="font-black text-slate-800 text-sm">Term 3 Fee</p><p className="form-bold text-[10px] text-slate-400">Sep 12, 2023</p></div>
            </div>
            <div className="text-right">
              <p className="font-black text-slate-800">$450.00</p>
              <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Paid</p>
            </div>
          </div>
          <div className="bg-white p-4 justify-between items-center flex rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><Receipt className="w-5 h-5" /></div>
              <div><p className="font-black text-slate-800 text-sm">Art Materials</p><p className="form-bold text-[10px] text-slate-400">Aug 28, 2023</p></div>
            </div>
            <div className="text-right">
              <p className="font-black text-slate-800">$25.00</p>
              <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Paid</p>
            </div>
          </div>
        </div>

        {/* LOGOUT / PASSWORD */}
        <div className="pt-6 border-t border-slate-200">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-bold bg-red-50 rounded-2xl">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </section>
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
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const stats = useMemo(() => {
    const presentCount = attendance.filter(a => String(a.status) === 'PRESENT' || a.status === AttendanceStatus.PRESENT).length;
    const attPercent = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 95; // Mock fallback
    const latestExam = examResults.length > 0 ? [...examResults].sort((a, b) => b.id.localeCompare(a.id))[0] : null;
    return { attPercent, latestExam };
  }, [attendance, examResults]);

  const generateAIComment = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      setAiAnalysis("Leo is showing great progress in complex derivatives. His participation has improved! I'd love to see more confidence during oral problem-solving.");
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="p-6 space-y-8 animate-in slide-in-from-right-8 duration-300 pb-20 bg-[#F8F9FA] min-h-full">
      <header className="flex justify-between items-center mt-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center hover:bg-slate-50"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
        <div className="text-center">
          <h1 className="text-lg font-black text-slate-800">{cls.name}</h1>
          <p className="text-[10px] font-bold text-slate-500">Grade 10 • Section A</p>
        </div>
        <button className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-blue-500"><MoreHorizontal className="w-5 h-5" /></button>
      </header>

      <div className="flex gap-4">
        <div className="flex-1 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-4 border-slate-100 flex items-center justify-center relative mb-2">
            <svg className="absolute top-0 left-0 w-full h-full -rotate-90">
              <circle cx="28" cy="28" r="28" fill="none" strokeWidth="4" className="stroke-slate-100" />
              <circle cx="28" cy="28" r="28" fill="none" strokeWidth="4" className="stroke-blue-500" strokeDasharray="175" strokeDashoffset={175 - (175 * stats.attPercent / 100)} />
            </svg>
            <span className="font-black text-blue-500 relative">{stats.attPercent}%</span>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attendance</p>
        </div>
        <div className="flex-1 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-2">
            <span className="font-black text-blue-500 text-xl">{stats.latestExam?.score ? stats.latestExam.score : 'A-'}</span>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Exam Score</p>
        </div>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="flex items-center gap-2 text-slate-800 font-black"><FileText className="w-5 h-5 text-blue-500" /> Lesson Log</div>
          <button className="text-blue-500 font-bold text-xs">View All</button>
        </div>
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-black">Σ</div>
              <div><h4 className="font-black text-slate-800 text-sm">Intro to Calculus</h4><p className="text-[10px] text-slate-400 font-bold">Oct 12 • 45 mins session</p></div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-slate-300" />
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center font-black">%</div>
              <div><h4 className="font-black text-slate-800 text-sm">Derivatives Quiz</h4><p className="text-[10px] text-slate-400 font-bold">Oct 14 • Quiz Grade: 92%</p></div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-slate-300" />
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center"><CalendarIcon className="w-4 h-4" /></div>
              <div><h4 className="font-black text-slate-800 text-sm">Chain Rule Mastery</h4><p className="text-[10px] text-slate-400 font-bold">Oct 16 • Homework assigned</p></div>
            </div>
            <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 text-slate-800 font-black mb-4 px-2"><MessageSquare className="w-5 h-5 text-blue-500" /> Teacher Review</div>
        <div className="bg-white/50 rounded-[2rem] border-l-4 border-blue-500 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden"><img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${cls.teacherId}`} alt="teacher" className="w-full h-full object-cover" /></div>
            <div><h4 className="font-black text-slate-800 text-sm">{cls.teacherId.replace('t', 'Ms. Jenkins ')}</h4><p className="text-[10px] text-amber-500 font-black flex">⭐⭐⭐⭐<span className="opacity-50">⭐</span></p></div>
          </div>
          <p className="text-xs text-slate-500 font-medium italic leading-relaxed">
            "Leo is showing great progress in complex derivatives. His participation has improved! I'd love to see more confidence during oral problem-solving."
          </p>
        </div>
      </section>

      <section className="bg-blue-500 rounded-[2.5rem] p-6 text-white shadow-xl shadow-blue-500/30 relative overflow-hidden mt-8">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl filter transform translate-x-10 -translate-y-10" />
        <div className="flex justify-between items-start mb-6">
          <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-widest">AI Smart Summary</span>
          </div>
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-lg">🤖</div>
        </div>
        <h2 className="text-xl font-black mb-4">Ready to level up?</h2>
        <ul className="space-y-4 mb-6 relative z-10">
          <li className="flex gap-3 text-sm font-medium"><div className="mt-1"><AlertCircle className="w-4 h-4 opacity-80" /></div><span>Practice <b>Inverse Trig</b> for 15 mins to boost your average exam score.</span></li>
          <li className="flex gap-3 text-sm font-medium"><div className="mt-1"><BookOpen className="w-4 h-4 opacity-80" /></div><span>Review Lesson 4 notes on <b>Chain Rule</b>; you missed 2 questions on this last quiz.</span></li>
          <li className="flex gap-3 text-sm font-medium"><div className="mt-1"><MessageSquare className="w-4 h-4 opacity-80" /></div><span>Schedule a 5-min chat with Ms. Sarah to discuss <b>Confidence Building</b> tips.</span></li>
        </ul>
        <button className="w-full bg-white text-blue-500 font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all">Start Suggested Practice</button>
      </section>
    </div>
  );
};

export default StudentDashboard;

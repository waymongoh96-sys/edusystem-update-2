import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users, ChevronRight, Search, X, BarChart3, TrendingUp, Paperclip, File, UserMinus, Filter, Calculator, Map, ArrowRight, CheckSquare, MessageSquare
} from 'lucide-react';
import {
  Class, User, LessonPlan, AttendanceRecord, SystemSettings,
  TaskStatus, AttendanceStatus, ExamResult
} from '../types';
import { supabase } from '../supabase';

// --- COMPONENT: AutoSaveInput ---
const AutoSaveInput = ({ value, onSave, placeholder, type = "text", className }: any) => {
  const [localValue, setLocalValue] = useState(value || '');
  useEffect(() => { setLocalValue(value || ''); }, [value]);
  return (
    <input
      type={type}
      className={className}
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => localValue !== value && onSave(localValue)}
    />
  );
};

// --- CONSTANTS ---
const ATTENDANCE_OPTIONS = [
  { value: 'PRESENT', label: 'P', color: 'bg-emerald-500', shadow: 'shadow-emerald-200' },
  { value: 'ABSENT', label: 'A', color: 'bg-red-500', shadow: 'shadow-red-200' },
  { value: 'LATE', label: 'L', color: 'bg-yellow-400', shadow: 'shadow-yellow-200' }
];

const FEEDBACK_TEMPLATES = {
  Teaching: {
    en: ["Follows instructions well", "Highly engaged in discussion", "Needs focus on key concepts"],
    my: ["Mengikuti arahan dengan baik", "Sangat aktif dalam perbincangan", "Perlu fokus pada konsep utama"],
    cn: ["能很好地听从指令", "积极参与讨论", "需要重点关注核心概念"]
  },
  Exercise: {
    en: ["Completed tasks independently", "Needs guidance for complex problems", "Careless mistakes in calculations"],
    my: ["Menyiapkan tugasan secara berdikari", "Perlu bimbingan untuk soalan sukar", "Kesilapan cuai dalam pengiraan"],
    cn: ["独立完成练习", "难题需要指导", "计算过程中出现粗心错误"]
  },
  Test: {
    en: ["Excellent time management", "Struggled with word problems", "Ready for advanced level"],
    my: ["Pengurusan masa yang cemerlang", "Sukar menjawab soalan penyelesaian masalah", "Sedia untuk tahap lanjutan"],
    cn: ["时间管理出色", "应用题作答较吃力", "已准备好进入进阶阶段"]
  }
};

interface ClassDetailsProps {
  cls: Class;
  students: User[];
  lessonPlans: LessonPlan[];
  setLessonPlans: React.Dispatch<React.SetStateAction<LessonPlan[]>>;
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  examResults: ExamResult[];
  setExamResults: React.Dispatch<React.SetStateAction<ExamResult[]>>;
  settings: SystemSettings;
  onBack: () => void;
  onDeletePlan: (id: string) => void;
  updateClass: (cls: Class | any) => void;
  currentUser: User | null;
}

const ClassDetails: React.FC<ClassDetailsProps> = ({
  cls, students, lessonPlans, setLessonPlans, attendance, setAttendance,
  examResults, setExamResults, settings, onBack, onDeletePlan, updateClass, currentUser
}) => {
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showEnrolModal, setShowEnrolModal] = useState(false);
  const [showPlanningModal, setShowPlanningModal] = useState(false);

  // --- ROADMAP STATE ---
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [roadmapExamDate, setRoadmapExamDate] = useState('');
  const [roadmapTopics, setRoadmapTopics] = useState('');

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStandard, setFilterStandard] = useState('');
  const [isEditingExams, setIsEditingExams] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [examColumns, setExamColumns] = useState(['Mid-Term', 'Final Exam']);
  const [selectedGraphExam, setSelectedGraphExam] = useState(examColumns[0]);
  const [showFeedbackModal, setShowFeedbackModal] = useState<{ studentId: string, category: keyof typeof FEEDBACK_TEMPLATES } | null>(null);
  const [feedbackLang, setFeedbackLang] = useState<'en' | 'my' | 'cn'>('en');

  // --- LOGIC: Inventory Pacing System ---
  const pacingStats = useMemo(() => {
    const inventory = (cls as any).syllabusList || [];
    const roadmap = (cls as any).syllabusRoadmap || {};

    if (inventory.length === 0) return null;

    const todayStr = new Date().toISOString().split('T')[0];

    // TARGET: Unique topics scheduled by today
    const scheduledTopics = Object.entries(roadmap)
      .filter(([date]) => date <= todayStr)
      .map(([_, topic]) => topic);
    const targetCount = new Set(scheduledTopics).size;

    // ACTUAL: Unique topics marked in COMPLETE lesson plans
    const completedPlans = lessonPlans.filter(lp => lp.classId === cls.id && lp.status === TaskStatus.COMPLETE);
    const completedTopics = new Set<string>();
    completedPlans.forEach((lp: any) => {
      if (lp.topics && Array.isArray(lp.topics)) {
        lp.topics.forEach((t: string) => completedTopics.add(t));
      } else if (lp.text && inventory.includes(lp.text)) {
        completedTopics.add(lp.text);
      }
    });
    const actualCount = completedTopics.size;

    const diff = actualCount - targetCount;
    let statusColor = 'bg-emerald-500';
    if (diff < 0) statusColor = 'bg-amber-500';
    if (diff < -2) statusColor = 'bg-red-500';

    return { total: inventory.length, target: targetCount, actual: actualCount, color: statusColor, diff };
  }, [cls, lessonPlans]);

  // --- LOGIC: "Catch-Up" Suggestion ---
  const [lpFormData, setLpFormData] = useState<Partial<LessonPlan> & { topics?: string[] }>({
    date: '', text: '', category: settings.lessonCategories[0], status: TaskStatus.HAVENT_START, materials: [], topics: []
  });

  const getSmartSuggestion = () => {
    const inventory = (cls as any).syllabusList || [];
    if (inventory.length === 0) return null;

    const coveredTopics = new Set<string>();
    lessonPlans
      .filter(lp => lp.classId === cls.id && lp.status !== TaskStatus.HAVENT_START)
      .forEach((lp: any) => {
        if (lp.topics) lp.topics.forEach((t: string) => coveredTopics.add(t));
        else if (lp.text) coveredTopics.add(lp.text);
      });

    const nextTopic = inventory.find((t: string) => !coveredTopics.has(t));
    if (nextTopic) return { type: 'CATCH_UP', text: nextTopic, label: 'Next in Syllabus' };

    const roadmap = (cls as any).syllabusRoadmap || {};
    const todayTopic = roadmap[lpFormData.date || ''];
    if (todayTopic) return { type: 'SCHEDULED', text: todayTopic, label: 'Scheduled for Today' };

    return null;
  };

  const suggestion = useMemo(() => getSmartSuggestion(), [cls, lessonPlans, lpFormData.date]);

  // --- HANDLERS ---

  const generateRoadmap = () => {
    if (!roadmapExamDate || !roadmapTopics.trim()) return alert("Please enter details");

    const topicsList = roadmapTopics.split('\n').filter(t => t.trim() !== '');
    const roadmapMap: Record<string, string> = {};

    const examDateObj = new Date(roadmapExamDate);
    let curr = new Date();
    let index = 0;

    const daysMap: Record<string, number> = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    const targetDay = daysMap[cls.classDay] ?? 1;

    while (index < topicsList.length && curr < examDateObj) {
      curr.setDate(curr.getDate() + 1);
      if (curr.getDay() === targetDay) {
        const dStr = curr.toISOString().split('T')[0];
        const isHoliday = settings.holidays.some(h => h.date === dStr);
        if (!isHoliday) {
          roadmapMap[dStr] = topicsList[index];
          index++;
        }
      }
    }

    const updatedClass = { ...cls, syllabusList: topicsList, syllabusRoadmap: roadmapMap };
    updateClass(updatedClass);
    setShowRoadmapModal(false);
    alert(`Roadmap Generated! ${topicsList.length} items added to inventory.`);
  };

  const handleSaveRoadmapLessons = async () => {
    const roadmap = (cls as any).syllabusRoadmap || {};
    let count = 0;
    for (const [date, topic] of Object.entries(roadmap)) {
      const exists = lessonPlans.some(lp => lp.classId === cls.id && lp.date === date);
      if (!exists) {
        const newPlan = {
          class_id: cls.id, date,
          category: 'Lecture',
          topic: topic as string,
          status: TaskStatus.HAVENT_START, materials: []
        };
        await supabase.from('lesson_plans').insert(newPlan);
        count++;
      }
    }
    alert(`Auto-filled ${count} lesson plans.`);
  };

  const handleQuickAddFromSuggestion = async (date: string, topic: string) => {
    const planId = Date.now().toString();
    const planData: LessonPlan = {
      id: planId, classId: cls.id, date,
      category: 'Lecture',
      text: topic,
      // @ts-ignore
      topics: [topic],
      status: TaskStatus.HAVENT_START, materials: []
    };
    await setDoc(doc(db, 'lessonPlans', planId), planData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newMedia = { name: file.name, url: '#' };
      setLpFormData(prev => ({ ...prev, materials: [...(prev.materials || []), newMedia] }));
    }
  };

  const handleSaveLessonPlan = async () => {
    const planId = activePlanId;
    const finalText = lpFormData.text || (lpFormData.topics && lpFormData.topics.length > 0 ? lpFormData.topics.join(', ') : '');

    const planData = {
      class_id: cls.id,
      date: lpFormData.date,
      category: lpFormData.category,
      status: lpFormData.status,
      topic: lpFormData.text,
      materials: lpFormData.materials
    };

    if (planId) {
      await supabase.from('lesson_plans').update(planData).eq('id', planId);
    } else {
      await supabase.from('lesson_plans').insert(planData);
    }
    setShowPlanningModal(false);
  };

  const handleToggleTopic = (topic: string) => {
    const currentTopics = lpFormData.topics || [];
    if (currentTopics.includes(topic)) {
      setLpFormData({ ...lpFormData, topics: currentTopics.filter(t => t !== topic) });
    } else {
      setLpFormData({ ...lpFormData, topics: [...currentTopics, topic] });
    }
  };

  const openNewPlanning = () => {
    setLpFormData({
      date: new Date().toISOString().split('T')[0],
      text: '', category: settings.lessonCategories[0], status: TaskStatus.HAVENT_START, materials: [],
      topics: []
    });
    setActivePlanId(null);
    setShowPlanningModal(true);
  };

  const archiveData = useMemo(() => {
    const roadmap = (cls as any).syllabusRoadmap || {};
    const dates = new Set([...lessonPlans.filter(lp => lp.classId === cls.id).map(lp => lp.date), ...Object.keys(roadmap)]);
    return Array.from(dates).sort().reverse().map(date => {
      const real = lessonPlans.find(lp => lp.classId === cls.id && lp.date === date);
      const suggested = roadmap[date];
      return { date, real, suggested };
    });
  }, [lessonPlans, cls]);

  const isTestDay = useMemo(() => {
    const plan = lessonPlans.find(lp => lp.classId === cls.id && lp.date === selectedDate);
    if (!plan) return false;
    const cat = (plan.category || '').toLowerCase();
    return cat.includes('test') || cat.includes('exam') || cat.includes('assessment') || cat.includes('quiz');
  }, [lessonPlans, cls.id, selectedDate]);

  const currentEnrolledIds = cls.enrolledStudentIds || [];
  const enrolledStudents = useMemo(() => students.filter(s => currentEnrolledIds.includes(s.id)), [students, currentEnrolledIds]);
  const availableStandards = useMemo(() => {
    const stds = students.map(s => s.standard).filter(Boolean) as string[];
    return Array.from(new Set(stds)).sort();
  }, [students]);
  const filteredLessonPlans = useMemo(() => lessonPlans.filter(lp => lp.classId === cls.id).sort((a, b) => b.date.localeCompare(a.date)), [lessonPlans, cls.id]);

  const handleEnroll = async (studentId: string) => {
    const currentList = cls.enrolledStudentIds || [];
    if (!currentList.includes(studentId)) {
      const newList = [...currentList, studentId];
      await supabase.from('classes').update({ enrolled_student_ids: newList }).eq('id', cls.id);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (window.confirm("Remove student from this class?")) {
      const list = (cls.enrolledStudentIds || []).filter(id => id !== studentId);
      await supabase.from('classes').update({ enrolled_student_ids: list }).eq('id', cls.id);
    }
  };

  const handleAttendanceChange = async (studentId: string, statusValue: string) => {
    const recordId = `${cls.id}-${studentId}-${selectedDate}`;
    const existing = attendance.find(a => a.classId === cls.id && a.studentId === studentId && a.date === selectedDate);

    if (existing?.status === statusValue) {
      await supabase.from('attendance_records').delete().match({ class_id: cls.id, student_id: studentId, date: selectedDate });
      return;
    }

    const record = {
      class_id: cls.id,
      student_id: studentId,
      date: selectedDate,
      status: statusValue as AttendanceStatus,
      performance_comment: existing?.performanceComment || ''
    };

    if (existing) {
      await supabase.from('attendance_records').update(record).match({ class_id: cls.id, student_id: studentId, date: selectedDate });
    } else {
      await supabase.from('attendance_records').insert(record);
    }
  };

  const updateAttendanceField = async (studentId: string, field: keyof AttendanceRecord, value: any) => {
    const existing = attendance.find(a => a.classId === cls.id && a.studentId === studentId && a.date === selectedDate);
    const dbField = field === 'performanceComment' ? 'performance_comment' : field === 'testScore' ? 'test_score' : field;

    const record = {
      class_id: cls.id,
      student_id: studentId,
      date: selectedDate,
      [dbField]: value
    };

    if (existing) {
      await supabase.from('attendance_records').update({ [dbField]: value }).match({ class_id: cls.id, student_id: studentId, date: selectedDate });
    } else {
      await supabase.from('attendance_records').insert({ ...record, status: 'PRESENT' });
    }
  };

  const updateExamScore = async (studentId: string, examName: string, score: string) => {
    const val = parseFloat(score) || 0;
    // For now, examResults might still be in Firebase or shared, let's keep logic simple
    // but the system is moving to Supabase
    await supabase.from('attendance_records').upsert({
      class_id: cls.id,
      student_id: studentId,
      date: selectedDate,
      test_score: val
    });
  };

  // --- RESTORED: Analytics Data (Fixes the crash) ---
  const analyticsData = useMemo(() => {
    const data = enrolledStudents.map(s => {
      const targetScore = examResults.find(r => r.classId === cls.id && r.studentId === s.id && r.examName === selectedGraphExam)?.score || 0;
      const latestIdx = examColumns.indexOf(selectedGraphExam);
      const previous = latestIdx > 0 ? (examResults.find(r => r.classId === cls.id && r.studentId === s.id && r.examName === examColumns[latestIdx - 1])?.score || 0) : 0;
      const improvement = previous > 0 ? ((targetScore - previous) / previous) * 100 : 0;
      return { id: s.id, name: s.name, current: targetScore, improvement };
    }).sort((a, b) => b.current - a.current);
    const average = data.length > 0 ? data.reduce((acc, curr) => acc + curr.current, 0) / data.length : 0;
    return { data, average };
  }, [enrolledStudents, examResults, examColumns, selectedGraphExam, cls.id]);

  const getAttendanceBtnStyle = (opt: typeof ATTENDANCE_OPTIONS[0], currentStatus: string | undefined) => {
    const isActive = currentStatus === opt.value;
    if (isActive) return `${opt.color} text-white shadow-md ${opt.shadow} border-transparent scale-110`;
    return 'bg-slate-50 text-slate-400 hover:bg-slate-200 border border-slate-100';
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.HAVENT_START: return 'bg-red-500';
      case TaskStatus.DOING: return 'bg-amber-400';
      case TaskStatus.COMPLETE: return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-4 bg-white border border-slate-200 hover:bg-slate-50 rounded-3xl shadow-sm transition-all group active:scale-95">
            <ChevronLeft className="w-6 h-6 text-slate-600 group-hover:theme-primary" />
          </button>
          <div>
            <h1 className="text-4xl font-black text-slate-800 flex items-center gap-4">
              <div className="w-6 h-12 rounded-full shadow-lg" style={{ backgroundColor: cls.themeColor }} />
              {cls.name}
              <span className="text-xl text-slate-300 font-bold ml-2">({enrolledStudents.length})</span>
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{cls.classDay}s at {cls.classTime}</p>

              {/* --- PACING WIDGET --- */}
              {pacingStats && (
                <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Syllabus Inventory</span>
                  <div className="w-24 h-2 bg-slate-100 rounded-full relative overflow-hidden">
                    <div className="absolute top-0 bottom-0 bg-slate-300 opacity-30" style={{ width: `${(pacingStats.target / pacingStats.total) * 100}%` }} />
                    <div className={`absolute top-0 bottom-0 ${pacingStats.color} transition-all duration-1000`} style={{ width: `${(pacingStats.actual / pacingStats.total) * 100}%` }} />
                  </div>
                  <span className={`text-[9px] font-black ${pacingStats.diff < 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {pacingStats.diff > 0 ? `+${pacingStats.diff}` : pacingStats.diff} Items
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowRoadmapModal(true)} className="bg-white border border-slate-200 text-slate-500 px-6 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2">
            <Map className="w-4 h-4" /> Syllabus Plan
          </button>

          <button onClick={() => setShowEnrolModal(true)} className="bg-white border border-slate-200 theme-primary px-8 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95">Registry Hub</button>
          <button onClick={openNewPlanning} className="theme-bg text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/10 hover:scale-105 transition-all active:scale-95 flex items-center gap-3"><Plus className="w-5 h-5" /> Schedule Lesson</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* --- ARCHIVE TABLE --- */}
        <div className="xl:col-span-4 bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4">
              <FileText className="w-8 h-8 theme-primary" /> Archive
            </h3>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 uppercase tracking-widest">{filteredLessonPlans.length} Logs</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                <tr>
                  <th className="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Real</th>
                  <th className="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {archiveData.map((item) => (
                  <tr key={item.date} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 text-[10px] font-black text-slate-500 w-16">{item.date.split('-').slice(1).join('/')}</td>

                    <td className="py-4">
                      {item.real ? (
                        <div className="flex items-center justify-between gap-2">
                          <div onClick={() => { setActivePlanId(item.real!.id); setLpFormData({ ...item.real!, topics: (item.real! as any).topics || [] }); setShowPlanningModal(true); }} className="cursor-pointer">
                            {/* Show actual topics if available, else text */}
                            <p className="text-[10px] font-bold text-slate-700 line-clamp-1">
                              {(item.real as any).topics?.length > 0 ? (item.real as any).topics[0] : (item.real.text || item.real.category)}
                            </p>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded text-white ${item.real.status === 'COMPLETE' ? 'bg-emerald-400' : 'bg-amber-400'}`}>{item.real.status === 'COMPLETE' ? 'DONE' : 'WIP'}</span>
                          </div>
                          <button onClick={() => onDeletePlan(item.real!.id)} className="text-red-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ) : <span className="text-[9px] text-slate-300 italic">Empty</span>}
                    </td>

                    <td className="py-4">
                      {item.suggested ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-bold text-blue-400 line-clamp-1" title={item.suggested}>{item.suggested}</span>
                          {!item.real && (
                            <button onClick={() => handleQuickAddFromSuggestion(item.date, item.suggested!)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><ArrowRight className="w-3 h-3" /></button>
                          )}
                        </div>
                      ) : <span className="text-[9px] text-slate-300">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE TRACKER */}
        <div className="xl:col-span-8 bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm h-[600px] flex flex-col">
          <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4">
              <Users className="w-8 h-8 theme-primary" /> Live Tracker
            </h3>
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-100">
              <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ChevronLeft className="w-5 h-5" /></button>
              <input type="date" className="bg-transparent border-none font-black text-sm text-slate-700 outline-none w-[140px]" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-slate-50 z-30">
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-40 border-r border-slate-100">Student</th>
                  <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Teacher Insights</th>
                  <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">{isTestDay ? 'Marks (%)' : 'Metric'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrolledStudents.map(student => {
                  const record = attendance.find(a => a.id === `${cls.id}-${student.id}-${selectedDate}`);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-6 sticky left-0 bg-white group-hover:bg-slate-50 z-20 border-r border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black theme-primary text-xs shadow-inner">{student.name.charAt(0)}</div>
                          <span className="font-black text-slate-800 text-sm whitespace-nowrap">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex justify-center gap-2">
                            {ATTENDANCE_OPTIONS.map(opt => (
                              <button key={opt.value} onClick={() => handleAttendanceChange(student.id, opt.value)} className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase transition-all ${getAttendanceBtnStyle(opt, record?.status)}`}>{opt.label}</button>
                            ))}
                          </div>
                          {record?.status === 'ABSENT' && (
                            <select className="w-full mt-1 p-2 bg-red-50 border border-red-100 rounded-lg text-[9px] font-black text-red-700 outline-none" value={record.reason || ''} onChange={(e) => updateAttendanceField(student.id, 'reason', e.target.value)}>
                              <option value="">Select Reason...</option>
                              {settings.absentReasons.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <AutoSaveInput className="w-full text-xs font-bold p-4 pr-12 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:bg-white focus:theme-border transition-all" placeholder="Observational feedback..." value={record?.performanceComment || ''} onSave={(val: string) => updateAttendanceField(student.id, 'performanceComment', val)} />
                            <button onClick={() => setShowFeedbackModal({ studentId: student.id, category: 'Teaching' })} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors">
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex flex-col gap-1">
                            {(['Teaching', 'Exercise', 'Test'] as any).map((cat: any) => (
                              <button key={cat} onClick={() => setShowFeedbackModal({ studentId: student.id, category: cat })} className="px-2 py-0.5 rounded-lg bg-slate-100 text-[8px] font-black text-slate-400 hover:bg-blue-50 hover:text-blue-500 uppercase tracking-tighter">
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right font-black text-slate-800 text-sm">
                        {isTestDay ? (
                          <div className="flex items-center justify-end gap-2">
                            <Calculator className="w-4 h-4 text-slate-300" />
                            <AutoSaveInput type="number" className="w-16 bg-white border border-slate-200 p-2 rounded-xl text-center outline-none focus:theme-border font-black" placeholder="0" value={record?.testScore || ''} onSave={(val: string) => updateAttendanceField(student.id, 'testScore', parseFloat(val))} />
                          </div>
                        ) : <span className="text-slate-300">--</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] p-16 border border-slate-200 shadow-sm space-y-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8"><div className="flex items-center gap-6"><div className="p-5 theme-light-bg rounded-[2.5rem]"><BarChart3 className="w-10 h-10 theme-primary" /></div><div><h3 className="text-3xl font-black text-slate-800">Exam Core</h3><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Analytical Performance Matrix</p></div></div><div className="flex gap-4"><button onClick={() => setIsEditingExams(!isEditingExams)} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isEditingExams ? 'theme-bg text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'}`}><Edit className="w-4 h-4 mr-2 inline" /> {isEditingExams ? 'Finalize Core' : 'Modify Registry'}</button>{isEditingExams && (<button onClick={() => { const n = `Exam ${examColumns.length + 1}`; setExamColumns([...examColumns, n]); setSelectedGraphExam(n); }} className="p-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-all"><Plus className="w-6 h-6" /></button>)}</div></div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-20">
          <div className="overflow-x-auto custom-scrollbar"><table className="w-full text-left border-collapse"><thead><tr className="border-b-2 border-slate-100"><th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>{examColumns.map((col, idx) => (<th key={idx} className="pb-6 px-4 text-center">{isEditingExams ? (<div className="flex items-center gap-2"><input className="w-24 text-[10px] font-black text-slate-800 border-b-2 border-slate-200 outline-none focus:theme-border pb-1" value={col} onChange={e => { const updated = [...examColumns]; updated[idx] = e.target.value; if (selectedGraphExam === col) setSelectedGraphExam(e.target.value); setExamColumns(updated); }} /><button onClick={() => setExamColumns(examColumns.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button></div>) : (<span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{col}</span>)}</th>))}<th className="pb-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">IMP%</th></tr></thead><tbody className="divide-y divide-slate-50">{enrolledStudents.map(student => { const res = analyticsData.data.find(d => d.id === student.id); return (<tr key={student.id} className="group hover:bg-slate-50 transition-colors"><td className="py-5 font-black text-slate-800 text-xs">{student.name}</td>{examColumns.map((col, idx) => (<td key={idx} className="py-5 px-4 text-center"><input type="number" className="w-16 bg-transparent text-center font-black text-slate-700 outline-none theme-primary hover:bg-white p-1 rounded-lg transition-all" value={examResults.find(r => r.classId === cls.id && r.studentId === student.id && r.examName === col)?.score || ''} onChange={e => updateExamScore(student.id, col, e.target.value)} /></td>))}<td className="py-5 text-right font-black"><div className={`flex items-center justify-end gap-2 text-xs ${res?.improvement && res.improvement > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>{res?.improvement ? `${res.improvement.toFixed(1)}%` : '0%'} {res?.improvement && res.improvement > 0 && <TrendingUp className="w-3 h-3" />}</div></td></tr>); })}</tbody></table></div>
          <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-100 flex flex-col relative overflow-hidden"><div className="flex items-center justify-between mb-10"><div className="space-y-1"><h4 className="text-xl font-black text-slate-800">Performance Map</h4><select className="text-[9px] font-black theme-primary uppercase tracking-widest bg-transparent border-none outline-none cursor-pointer" value={selectedGraphExam} onChange={e => setSelectedGraphExam(e.target.value)}>{examColumns.map(col => <option key={col} value={col}>{col} Analysis</option>)}</select></div><div className="px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Global Mean</p><p className="text-sm font-black theme-primary">{analyticsData.average.toFixed(1)}%</p></div></div><div className="flex-1 space-y-6 flex flex-col justify-start">{analyticsData.data.map(student => (<div key={student.id} className="group flex items-center gap-6"><span className="w-24 text-[10px] font-black text-slate-400 uppercase truncate text-right shrink-0">{student.name}</span><div className="flex-1 h-8 bg-white rounded-xl border border-slate-100 relative shadow-sm"><div className="h-full theme-bg transition-all duration-1000 rounded-r-lg overflow-hidden" style={{ width: `${student.current}%`, backgroundColor: cls.themeColor }} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700">{student.current}%</span><div className="absolute top-0 bottom-0 border-r-2 border-dotted border-black z-20 pointer-events-none transition-all duration-500" style={{ left: `${analyticsData.average}%` }} /></div></div>))}</div><div className="mt-10 flex justify-between px-2 pl-[120px] text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div></div>
        </div>
      </div>

      {showPlanningModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-[3.5rem] p-12 max-w-2xl w-full shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <button onClick={() => setShowPlanningModal(false)} className="absolute top-10 right-10 p-2 text-slate-300 hover:text-slate-500 transition-all active:scale-90"><X className="w-8 h-8" /></button>
            <h2 className="text-3xl font-black text-slate-800 mb-10">{activePlanId ? 'Refine Lesson' : 'New Plan'}</h2>

            {suggestion && !activePlanId && (
              <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">{suggestion.label}</p>
                  <p className="text-xs font-bold text-blue-800">{suggestion.text}</p>
                </div>
                <button onClick={() => handleToggleTopic(suggestion.text)} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all">Add to Plan</button>
              </div>
            )}

            <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Planned Date</label>
                  <input type="date" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" value={lpFormData.date} onChange={e => setLpFormData({ ...lpFormData, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category</label>
                  <select className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" value={lpFormData.category} onChange={e => setLpFormData({ ...lpFormData, category: e.target.value })}>
                    {settings.lessonCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Topics Covered</label>
                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-2xl p-2 custom-scrollbar bg-slate-50">
                  {((cls as any).syllabusList || []).length > 0 ? (
                    ((cls as any).syllabusList as string[]).map((topic, i) => (
                      <div key={i} onClick={() => handleToggleTopic(topic)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white cursor-pointer transition-all">
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${lpFormData.topics?.includes(topic) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                          {lpFormData.topics?.includes(topic) && <CheckSquare className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-xs font-bold ${lpFormData.topics?.includes(topic) ? 'text-emerald-700' : 'text-slate-600'}`}>{topic}</span>
                      </div>
                    ))
                  ) : <p className="text-xs text-slate-400 p-4 text-center italic">No syllabus topics defined. Use the Planner to add them.</p>}
                </div>
              </div>

              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Objectives / Notes</label><textarea placeholder="Additional details..." className="w-full h-32 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none font-medium leading-relaxed text-sm" value={lpFormData.text} onChange={e => setLpFormData({ ...lpFormData, text: e.target.value })} /></div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Materials</label><button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black theme-primary uppercase hover:underline flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Upload</button></div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                <div className="flex flex-wrap gap-2">{lpFormData.materials?.map((m, i) => (<div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700"><File className="w-3 h-3 theme-primary" /><span className="truncate max-w-[150px]">{m.name}</span><button onClick={() => setLpFormData(p => ({ ...p, materials: p.materials?.filter((_, idx) => idx !== i) }))} className="text-red-400 ml-1"><X className="w-3 h-3" /></button></div>))}</div>
              </div>

              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label><div className="flex gap-2">{[TaskStatus.HAVENT_START, TaskStatus.DOING, TaskStatus.COMPLETE].map(status => (<button key={status} onClick={() => setLpFormData({ ...lpFormData, status })} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${lpFormData.status === status ? getStatusColor(status) + ' text-white border-transparent' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{status.replace('_', ' ')}</button>))}</div></div>
            </div>

            <div className="mt-12 flex gap-4"><button onClick={() => setShowPlanningModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-500 font-black uppercase text-xs rounded-2xl">Discard</button><button onClick={handleSaveLessonPlan} className="flex-1 py-5 theme-bg text-white font-black uppercase text-xs rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Finalize Plan</button></div>
          </div>
        </div>
      )}

      {showRoadmapModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3.5rem] p-10 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <div><h2 className="text-3xl font-black text-slate-800">Annual Tracker</h2><p className="text-xs text-slate-400 mt-1">Syllabus Inventory & Schedule</p></div>
              <button onClick={() => setShowRoadmapModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Final Exam Date</label>
                <input type="date" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={roadmapExamDate} onChange={e => setRoadmapExamDate(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Topics (One per line)</label>
                <textarea
                  className="w-full h-48 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium text-sm"
                  placeholder="Chapter 1: Intro&#10;Chapter 2: Cells&#10;Quiz 1"
                  value={roadmapTopics}
                  onChange={e => setRoadmapTopics(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 font-bold mt-2 text-right">{roadmapTopics.split('\n').filter(t => t.trim()).length} Topics Entered</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => generateRoadmap()} className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 transition-all">Save as Draft</button>
                <button onClick={() => { generateRoadmap(); setTimeout(handleSaveRoadmapLessons, 500); }} className="flex-1 py-4 theme-bg text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] transition-all">Generate All</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEnrolModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-xl w-full shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">System Registry</h2>
              <button onClick={() => setShowEnrolModal(false)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input className="w-full py-5 pl-14 pr-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none theme-ring font-bold" placeholder="Query registry..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
              <div className="relative min-w-[150px]"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><select className="w-full py-5 pl-12 pr-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none theme-ring font-bold text-sm appearance-none" value={filterStandard} onChange={e => setFilterStandard(e.target.value)}><option value="">All Forms</option>{availableStandards.map(std => (<option key={std} value={std}>{std}</option>))}</select></div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-4 custom-scrollbar">
              {students.filter(s => !(cls.enrolledStudentIds || []).includes(s.id) && (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.standard && s.standard.toLowerCase().includes(searchTerm.toLowerCase()))) && (filterStandard === '' || s.standard === filterStandard)).map(student => (
                <div key={student.id} className="p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-all group">
                  <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black theme-primary">{student.name.charAt(0)}</div><div><p className="font-black text-slate-800">{student.name}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{student.standard || 'No Form'}</p></div></div>
                  <button onClick={() => handleEnroll(student.id)} className="p-4 theme-bg text-white rounded-2xl shadow-lg hover:scale-105 transition-all"><Plus className="w-5 h-5" /></button>
                </div>
              ))}
              {students.filter(s => !(cls.enrolledStudentIds || []).includes(s.id)).length === 0 && <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">No matching students found in registry.</div>}
            </div>
          </div>
        </div>
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="font-black text-slate-800 text-sm">Template Library</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{showFeedbackModal.category} • Select Feedback</p>
              </div>
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                {(['en', 'my', 'cn'] as const).map(l => (
                  <button key={l} onClick={() => setFeedbackLang(l)} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${feedbackLang === l ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {FEEDBACK_TEMPLATES[showFeedbackModal.category][feedbackLang].map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    updateAttendanceField(showFeedbackModal.studentId, 'performanceComment', t);
                    setShowFeedbackModal(null);
                  }}
                  className="w-full p-4 bg-slate-50 rounded-2xl text-left text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-transparent hover:border-blue-100"
                >
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => setShowFeedbackModal(null)} className="w-full mt-6 py-4 text-slate-400 font-black text-xs uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetails;

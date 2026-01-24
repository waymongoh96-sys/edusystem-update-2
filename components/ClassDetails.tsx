
import React, { useState, useMemo, useRef } from 'react';
import { 
  ChevronLeft, Plus, Edit, FileText, CheckCircle2, Clock, Trash2, 
  Users, ChevronRight, Search, X, BarChart3, TrendingUp, Paperclip, File, UserMinus, Filter
} from 'lucide-react';
import { 
  Class, User, LessonPlan, AttendanceRecord, SystemSettings, 
  TaskStatus, AttendanceStatus, ExamResult 
} from '../types';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

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
}

const ClassDetails: React.FC<ClassDetailsProps> = ({ 
  cls, students, lessonPlans, setLessonPlans, attendance, setAttendance, examResults, setExamResults, settings, onBack, onDeletePlan, updateClass 
}) => {
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showEnrolModal, setShowEnrolModal] = useState(false);
  const [showPlanningModal, setShowPlanningModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStandard, setFilterStandard] = useState('');
  const [isEditingExams, setIsEditingExams] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [examColumns, setExamColumns] = useState(['Mid-Term', 'Final Exam']);
  const [selectedGraphExam, setSelectedGraphExam] = useState(examColumns[0]);

  const enrolledStudents = useMemo(() => 
    students.filter(s => cls.enrolledStudentIds.includes(s.id)), 
    [students, cls.enrolledStudentIds]
  );

  const availableStandards = useMemo(() => {
    const stds = students.map(s => s.standard).filter(Boolean) as string[];
    return Array.from(new Set(stds)).sort();
  }, [students]);

  const filteredLessonPlans = useMemo(() => 
    lessonPlans.filter(lp => lp.classId === cls.id).sort((a,b) => b.date.localeCompare(a.date)),
    [lessonPlans, cls.id]
  );

  const calculateDefaultDate = () => {
    if (filteredLessonPlans.length > 0) {
      const lastDate = new Date(filteredLessonPlans[0].date);
      lastDate.setDate(lastDate.getDate() + 7);
      return lastDate.toISOString().split('T')[0];
    }
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = days.indexOf(cls.classDay);
    const now = new Date();
    let resultDate = new Date(now);
    resultDate.setDate(now.getDate() + 1);
    resultDate.setDate(resultDate.getDate() + (targetDay + 7 - resultDate.getDay()) % 7);
    return resultDate.toISOString().split('T')[0];
  };

  const [lpFormData, setLpFormData] = useState<Partial<LessonPlan>>({
    date: '', text: '', category: settings.lessonCategories[0], status: TaskStatus.HAVENT_START, materials: []
  });

  const openNewPlanning = () => {
    const defaultDate = calculateDefaultDate();
    setLpFormData({ date: defaultDate, text: '', category: settings.lessonCategories[0], status: TaskStatus.HAVENT_START, materials: [] });
    setActivePlanId(null);
    setShowPlanningModal(true);
  };

  const handleSaveLessonPlan = async () => {
    const planId = activePlanId || Date.now().toString();
    const planData: LessonPlan = { id: planId, classId: cls.id, ...(lpFormData as LessonPlan) };
    try {
      await setDoc(doc(db, 'lessonPlans', planId), planData);
      setShowPlanningModal(false);
    } catch (err) {
      console.error("Save plan failed:", err);
      alert("Permission denied. Ensure Firestore rules are set to public for authenticated users.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newMedia = { name: file.name, url: '#' };
      setLpFormData(prev => ({ ...prev, materials: [...(prev.materials || []), newMedia] }));
    }
  };

  const handleAttendanceChange = async (studentId: string, status: AttendanceStatus) => {
    const recordId = `${cls.id}-${studentId}-${selectedDate}`;
    const existing = attendance.find(a => a.id === recordId);
    
    // Toggle behavior: if the same status is clicked, delete the record (undo)
    if (existing?.status === status) {
      try {
        await deleteDoc(doc(db, 'attendance', recordId));
      } catch (err) {
        console.error("Failed to delete record:", err);
      }
      return;
    }

    const record: AttendanceRecord = {
      id: recordId,
      classId: cls.id,
      studentId,
      date: selectedDate,
      status,
      performanceComment: existing?.performanceComment || '',
      reason: existing?.reason || ''
    };
    await setDoc(doc(db, 'attendance', recordId), record);
  };

  const updateAttendanceField = async (studentId: string, field: keyof AttendanceRecord, value: string) => {
    const recordId = `${cls.id}-${studentId}-${selectedDate}`;
    const existing = attendance.find(a => a.id === recordId);
    const record: AttendanceRecord = {
      id: recordId,
      classId: cls.id,
      studentId,
      date: selectedDate,
      status: existing?.status || AttendanceStatus.PRESENT,
      performanceComment: existing?.performanceComment || '',
      [field]: value
    } as AttendanceRecord;
    await setDoc(doc(db, 'attendance', recordId), record);
  };

  const getAttendanceBtnColor = (status: AttendanceStatus, isActive: boolean) => {
    if (!isActive) return 'bg-slate-50 text-slate-400 hover:bg-slate-200';
    switch(status) {
      case AttendanceStatus.PRESENT: return 'bg-emerald-500 text-white shadow-md';
      case AttendanceStatus.ABSENT: return 'bg-red-500 text-white shadow-md';
      case AttendanceStatus.LATE: return 'bg-amber-400 text-white shadow-md';
      default: return 'bg-slate-400 text-white shadow-md';
    }
  };

  const updateExamScore = async (studentId: string, examName: string, score: string) => {
    const val = parseFloat(score) || 0;
    const examId = `${cls.id}-${studentId}-${examName}`;
    const record: ExamResult = { id: examId, classId: cls.id, studentId, examName, score: val };
    await setDoc(doc(db, 'examResults', examId), record);
  };

  const handleEnroll = (studentId: string) => {
    if (!cls.enrolledStudentIds.includes(studentId)) {
      const updatedClass = { ...cls, enrolledStudentIds: [...cls.enrolledStudentIds, studentId] };
      updateClass(updatedClass);
    }
  };

  const handleRemoveStudent = (studentId: string) => {
    if (window.confirm("Remove this student from the class? This action will not delete the student account itself.")) {
      const updatedClass = {
        ...cls,
        enrolledStudentIds: cls.enrolledStudentIds.filter(id => id !== studentId)
      };
      updateClass(updatedClass);
    }
  };

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

  const getStatusColor = (status: TaskStatus) => {
    switch(status) {
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
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">{cls.classDay}s at {cls.classTime}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowEnrolModal(true)} className="bg-white border border-slate-200 theme-primary px-8 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95">Registry Hub</button>
          <button onClick={openNewPlanning} className="theme-bg text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/10 hover:scale-105 transition-all active:scale-95 flex items-center gap-3"><Plus className="w-5 h-5" /> Schedule Lesson</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-4 bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm flex flex-col h-[600px]">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4">
                <FileText className="w-8 h-8 theme-primary" /> Archive
              </h3>
              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 uppercase tracking-widest">{filteredLessonPlans.length} Logs</span>
           </div>
           <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {filteredLessonPlans.map(lp => (
                <div key={lp.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-between hover:theme-border transition-all group shadow-sm">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${lp.status === TaskStatus.COMPLETE ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                      {lp.status === TaskStatus.COMPLETE ? <CheckCircle2 className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-800">{lp.date}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{lp.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setActivePlanId(lp.id); setLpFormData(lp); setShowPlanningModal(true); }} className="p-3 theme-primary hover:theme-light-bg rounded-xl transition-all"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => onDeletePlan(lp.id)} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div className="xl:col-span-8 bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm h-[600px] flex flex-col">
           <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4">
                <Users className="w-8 h-8 theme-primary" /> Live Tracker
              </h3>
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-100">
                <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                <input type="date" className="bg-transparent border-none font-black text-sm text-slate-700 outline-none w-[140px]" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ChevronRight className="w-5 h-5" /></button>
              </div>
           </div>
           <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="sticky top-0 bg-slate-50 z-30">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-40 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Student</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Teacher Insights</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrolledStudents.map(student => {
                    const record = attendance.find(a => a.id === `${cls.id}-${student.id}-${selectedDate}`);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-6 sticky left-0 bg-white group-hover:bg-slate-50 z-20 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black theme-primary text-xs shadow-inner">{student.name.charAt(0)}</div>
                              <button 
                                onClick={() => handleRemoveStudent(student.id)}
                                title="Remove Student"
                                className="absolute -top-2 -right-2 bg-white border border-slate-200 text-red-400 p-1 rounded-full shadow-sm hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <UserMinus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="font-black text-slate-800 text-sm whitespace-nowrap">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex justify-center gap-2">
                              {Object.values(AttendanceStatus).map(status => (
                                <button key={status} onClick={() => handleAttendanceChange(student.id, status as AttendanceStatus)} className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase transition-all ${getAttendanceBtnColor(status as AttendanceStatus, record?.status === status)}`}>{status.charAt(0)}</button>
                              ))}
                            </div>
                            {record?.status === AttendanceStatus.ABSENT && (
                              <select 
                                className="w-full mt-1 p-2 bg-red-50 border border-red-100 rounded-lg text-[9px] font-black text-red-700 outline-none"
                                value={record.reason || ''}
                                onChange={(e) => updateAttendanceField(student.id, 'reason', e.target.value)}
                              >
                                <option value="">Select Reason...</option>
                                {settings.absentReasons.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <input placeholder="Observational feedback..." className="w-full text-xs font-bold p-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:bg-white focus:theme-border transition-all" value={record?.performanceComment || ''} onChange={e => updateAttendanceField(student.id, 'performanceComment', e.target.value)} />
                        </td>
                      </tr>
                    );
                  })}
                  {enrolledStudents.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                        No students enrolled in this node yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] p-16 border border-slate-200 shadow-sm space-y-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="flex items-center gap-6">
             <div className="p-5 theme-light-bg rounded-[2.5rem]"><BarChart3 className="w-10 h-10 theme-primary" /></div>
             <div><h3 className="text-3xl font-black text-slate-800">Exam Core</h3><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Analytical Performance Matrix</p></div>
           </div>
           <div className="flex gap-4">
              <button onClick={() => setIsEditingExams(!isEditingExams)} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isEditingExams ? 'theme-bg text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'}`}><Edit className="w-4 h-4 mr-2 inline" /> {isEditingExams ? 'Finalize Core' : 'Modify Registry'}</button>
              {isEditingExams && (
                <button onClick={() => { const n = `Exam ${examColumns.length + 1}`; setExamColumns([...examColumns, n]); setSelectedGraphExam(n); }} className="p-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-all"><Plus className="w-6 h-6" /></button>
              )}
           </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-20">
          <div className="overflow-x-auto custom-scrollbar">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b-2 border-slate-100">
                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                    {examColumns.map((col, idx) => (
                      <th key={idx} className="pb-6 px-4 text-center">
                        {isEditingExams ? (
                          <div className="flex items-center gap-2">
                             <input className="w-24 text-[10px] font-black text-slate-800 border-b-2 border-slate-200 outline-none focus:theme-border pb-1" value={col} onChange={e => {
                               const updated = [...examColumns];
                               updated[idx] = e.target.value;
                               if (selectedGraphExam === col) setSelectedGraphExam(e.target.value);
                               setExamColumns(updated);
                             }} />
                             <button onClick={() => setExamColumns(examColumns.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                          </div>
                        ) : (<span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{col}</span>)}
                      </th>
                    ))}
                    <th className="pb-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">IMP%</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {enrolledStudents.map(student => {
                    const res = analyticsData.data.find(d => d.id === student.id);
                    return (
                      <tr key={student.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-5 font-black text-slate-800 text-xs">{student.name}</td>
                        {examColumns.map((col, idx) => (
                          <td key={idx} className="py-5 px-4 text-center">
                            <input type="number" className="w-16 bg-transparent text-center font-black text-slate-700 outline-none theme-primary hover:bg-white p-1 rounded-lg transition-all" value={examResults.find(r => r.classId === cls.id && r.studentId === student.id && r.examName === col)?.score || ''} onChange={e => updateExamScore(student.id, col, e.target.value)} />
                          </td>
                        ))}
                        <td className="py-5 text-right font-black"><div className={`flex items-center justify-end gap-2 text-xs ${res?.improvement && res.improvement > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>{res?.improvement ? `${res.improvement.toFixed(1)}%` : '0%'} {res?.improvement && res.improvement > 0 && <TrendingUp className="w-3 h-3" />}</div></td>
                      </tr>
                    );
                  })}
               </tbody>
             </table>
          </div>

          <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-100 flex flex-col relative overflow-hidden">
             <div className="flex items-center justify-between mb-10">
                <div className="space-y-1">
                  <h4 className="text-xl font-black text-slate-800">Performance Map</h4>
                  <select 
                    className="text-[9px] font-black theme-primary uppercase tracking-widest bg-transparent border-none outline-none cursor-pointer"
                    value={selectedGraphExam}
                    onChange={e => setSelectedGraphExam(e.target.value)}
                  >
                    {examColumns.map(col => <option key={col} value={col}>{col} Analysis</option>)}
                  </select>
                </div>
                <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Global Mean</p>
                   <p className="text-sm font-black theme-primary">{analyticsData.average.toFixed(1)}%</p>
                </div>
             </div>
             
             <div className="flex-1 space-y-6 flex flex-col justify-start">
                {analyticsData.data.map(student => (
                  <div key={student.id} className="group flex items-center gap-6">
                    <span className="w-24 text-[10px] font-black text-slate-400 uppercase truncate text-right shrink-0">{student.name}</span>
                    <div className="flex-1 h-8 bg-white rounded-xl border border-slate-100 relative shadow-sm">
                       <div className="h-full theme-bg transition-all duration-1000 rounded-r-lg overflow-hidden" style={{ width: `${student.current}%`, backgroundColor: cls.themeColor }} />
                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700">{student.current}%</span>
                       
                       <div className="absolute top-0 bottom-0 border-r-2 border-dotted border-black z-20 pointer-events-none transition-all duration-500" style={{ left: `${analyticsData.average}%` }} />
                    </div>
                  </div>
                ))}
             </div>
             <div className="mt-10 flex justify-between px-2 pl-[120px] text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
          </div>
        </div>
      </div>

      {showPlanningModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-[3.5rem] p-12 max-w-2xl w-full shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <button onClick={() => setShowPlanningModal(false)} className="absolute top-10 right-10 p-2 text-slate-300 hover:text-slate-500 transition-all active:scale-90"><X className="w-8 h-8" /></button>
            <h2 className="text-3xl font-black text-slate-800 mb-10">{activePlanId ? 'Refine Lesson' : 'New Plan'}</h2>
            <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Planned Date</label>
                  <input type="date" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" value={lpFormData.date} onChange={e => setLpFormData({...lpFormData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Modality</label>
                  <select className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" value={lpFormData.category} onChange={e => setLpFormData({...lpFormData, category: e.target.value})}>
                    {settings.lessonCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Objectives</label>
                <textarea placeholder="Outline goals..." className="w-full h-32 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none font-medium leading-relaxed text-sm" value={lpFormData.text} onChange={e => setLpFormData({...lpFormData, text: e.target.value})} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Materials</label>
                   <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black theme-primary uppercase hover:underline flex items-center gap-1">
                     <Paperclip className="w-3.5 h-3.5" /> Upload
                   </button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                <div className="flex flex-wrap gap-2">
                  {lpFormData.materials?.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700">
                      <File className="w-3 h-3 theme-primary" />
                      <span className="truncate max-w-[150px]">{m.name}</span>
                      <button onClick={() => setLpFormData(p => ({ ...p, materials: p.materials?.filter((_, idx) => idx !== i) }))} className="text-red-400 ml-1"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                 <div className="flex gap-2">
                   {[TaskStatus.HAVENT_START, TaskStatus.DOING, TaskStatus.COMPLETE].map(status => (
                     <button
                        key={status}
                        onClick={() => setLpFormData({...lpFormData, status})}
                        className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          lpFormData.status === status ? getStatusColor(status) + ' text-white border-transparent' : 'bg-slate-50 text-slate-400 border-slate-100'
                        }`}
                     >
                        {status.replace('_', ' ')}
                     </button>
                   ))}
                 </div>
              </div>
            </div>

            <div className="mt-12 flex gap-4">
              <button onClick={() => setShowPlanningModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-500 font-black uppercase text-xs rounded-2xl">Discard</button>
              <button onClick={handleSaveLessonPlan} className="flex-1 py-5 theme-bg text-white font-black uppercase text-xs rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Finalize Plan</button>
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
               <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input className="w-full py-5 pl-14 pr-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none theme-ring font-bold" placeholder="Query registry..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
               </div>
               <div className="relative min-w-[150px]">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                    className="w-full py-5 pl-12 pr-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none theme-ring font-bold text-sm appearance-none"
                    value={filterStandard}
                    onChange={e => setFilterStandard(e.target.value)}
                  >
                    <option value="">All Forms</option>
                    {availableStandards.map(std => (
                      <option key={std} value={std}>{std}</option>
                    ))}
                  </select>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-4 custom-scrollbar">
              {students
                .filter(s => 
                  !cls.enrolledStudentIds.includes(s.id) && 
                  (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.standard && s.standard.toLowerCase().includes(searchTerm.toLowerCase()))) &&
                  (filterStandard === '' || s.standard === filterStandard)
                )
                .map(student => (
                <div key={student.id} className="p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-all group">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black theme-primary">{student.name.charAt(0)}</div>
                     <div>
                        <p className="font-black text-slate-800">{student.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{student.standard || 'No Form'}</p>
                     </div>
                  </div>
                  <button onClick={() => handleEnroll(student.id)} className="p-4 theme-bg text-white rounded-2xl shadow-lg hover:scale-105 transition-all"><Plus className="w-5 h-5" /></button>
                </div>
              ))}
              {students.filter(s => !cls.enrolledStudentIds.includes(s.id) && (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.standard && s.standard.toLowerCase().includes(searchTerm.toLowerCase()))) && (filterStandard === '' || s.standard === filterStandard)).length === 0 && (
                <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                  No matching students found in registry.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetails;

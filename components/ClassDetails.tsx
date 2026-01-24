
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

  const enrolledStudents = useMemo(() => students.filter(s => cls.enrolledStudentIds.includes(s.id)), [students, cls.enrolledStudentIds]);
  const availableStandards = useMemo(() => Array.from(new Set(students.map(s => s.standard).filter(Boolean) as string[])).sort(), [students]);
  const filteredLessonPlans = useMemo(() => lessonPlans.filter(lp => lp.classId === cls.id).sort((a,b) => b.date.localeCompare(a.date)), [lessonPlans, cls.id]);

  const [lpFormData, setLpFormData] = useState<Partial<LessonPlan>>({ date: '', text: '', category: settings.lessonCategories[0], status: TaskStatus.HAVENT_START, materials: [] });

  // Fix: Added handleRemoveStudent function to remove a student from the class enrollment.
  const handleRemoveStudent = async (studentId: string) => {
    if (window.confirm("Remove this student from the class?")) {
      const updatedIds = cls.enrolledStudentIds.filter(id => id !== studentId);
      await updateClass({ ...cls, enrolledStudentIds: updatedIds });
    }
  };

  const handleSaveLessonPlan = async () => {
    const planId = activePlanId || Date.now().toString();
    const planData: LessonPlan = { id: planId, classId: cls.id, ...(lpFormData as LessonPlan) };
    await setDoc(doc(db, 'lessonPlans', planId), planData);
    setShowPlanningModal(false);
  };

  const handleAttendanceChange = async (studentId: string, status: AttendanceStatus) => {
    const recordId = `${cls.id}-${studentId}-${selectedDate}`;
    const existing = attendance.find(a => a.id === recordId);
    if (existing?.status === status) { await deleteDoc(doc(db, 'attendance', recordId)); return; }
    const record: AttendanceRecord = { id: recordId, classId: cls.id, studentId, date: selectedDate, status, performanceComment: existing?.performanceComment || '', testScore: existing?.testScore || '', reason: existing?.reason || '' };
    await setDoc(doc(db, 'attendance', recordId), record);
  };

  const updateAttendanceField = async (studentId: string, field: keyof AttendanceRecord, value: string) => {
    const recordId = `${cls.id}-${studentId}-${selectedDate}`;
    const existing = attendance.find(a => a.id === recordId);
    const record: AttendanceRecord = { id: recordId, classId: cls.id, studentId, date: selectedDate, status: existing?.status || AttendanceStatus.PRESENT, performanceComment: existing?.performanceComment || '', testScore: existing?.testScore || '', [field]: value } as AttendanceRecord;
    await setDoc(doc(db, 'attendance', recordId), record);
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6"><button onClick={onBack} className="p-4 bg-white border border-slate-200 hover:bg-slate-50 rounded-3xl shadow-sm group active:scale-95"><ChevronLeft className="w-6 h-6 text-slate-600 group-hover:theme-primary" /></button><div><h1 className="text-4xl font-black text-slate-800 flex items-center gap-4"><div className="w-6 h-12 rounded-full shadow-lg" style={{ backgroundColor: cls.themeColor }} />{cls.name}<span className="text-xl text-slate-300 font-bold ml-2">({enrolledStudents.length})</span></h1><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">{cls.classDay}s at {cls.classTime}</p></div></div>
        <div className="flex gap-4"><button onClick={() => setShowEnrolModal(true)} className="bg-white border border-slate-200 theme-primary px-8 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-sm">Registry Hub</button><button onClick={() => { setLpFormData({ date: new Date().toISOString().split('T')[0], text: '', category: settings.lessonCategories[0], status: TaskStatus.HAVENT_START, materials: [] }); setShowPlanningModal(true); }} className="theme-bg text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-3"><Plus className="w-5 h-5" /> Schedule Lesson</button></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-4 bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm flex flex-col h-[600px]"><div className="flex items-center justify-between mb-10"><h3 className="text-2xl font-black text-slate-800 flex items-center gap-4"><FileText className="w-8 h-8 theme-primary" /> Archive</h3><span className="text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 uppercase tracking-widest">{filteredLessonPlans.length} Logs</span></div><div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">{filteredLessonPlans.map(lp => (<div key={lp.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-between hover:theme-border group shadow-sm"><div className="flex items-center gap-6"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${lp.status === TaskStatus.COMPLETE ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>{lp.status === TaskStatus.COMPLETE ? <CheckCircle2 className="w-7 h-7" /> : <Clock className="w-7 h-7" />}</div><div><p className="text-lg font-black text-slate-800">{lp.date}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{lp.category}</p></div></div><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => { setActivePlanId(lp.id); setLpFormData(lp); setShowPlanningModal(true); }} className="p-3 theme-primary hover:theme-light-bg rounded-xl"><Edit className="w-5 h-5" /></button><button onClick={() => onDeletePlan(lp.id)} className="p-3 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 className="w-5 h-5" /></button></div></div>))}</div></div>
        <div className="xl:col-span-8 bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm h-[600px] flex flex-col"><div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6"><h3 className="text-2xl font-black text-slate-800 flex items-center gap-4"><Users className="w-8 h-8 theme-primary" /> Live Tracker</h3><div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-100"><button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ChevronLeft className="w-5 h-5" /></button><input type="date" className="bg-transparent border-none font-black text-sm text-slate-700 outline-none w-[140px]" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /><button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><ChevronRight className="w-5 h-5" /></button></div></div>
           <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 bg-slate-50 z-30"><tr className="border-b border-slate-200"><th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-40 border-r border-slate-100">Student</th><th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th><th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Test Score</th><th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Teacher Insights</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{enrolledStudents.map(student => { const record = attendance.find(a => a.id === `${cls.id}-${student.id}-${selectedDate}`); return (<tr key={student.id} className="hover:bg-slate-50/50 group"><td className="px-6 py-6 sticky left-0 bg-white group-hover:bg-slate-50 z-20 border-r border-slate-100"><div className="flex items-center gap-4"><div className="relative"><div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black theme-primary text-xs shadow-inner">{student.name.charAt(0)}</div><button onClick={() => handleRemoveStudent(student.id)} title="Remove Student" className="absolute -top-2 -right-2 bg-white border border-slate-200 text-red-400 p-1 rounded-full shadow-sm hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"><UserMinus className="w-3 h-3" /></button></div><span className="font-black text-slate-800 text-sm whitespace-nowrap">{student.name}</span></div></td><td className="px-6 py-6"><div className="flex flex-col items-center gap-2"><div className="flex justify-center gap-2">{Object.values(AttendanceStatus).map(status => (<button key={status} onClick={() => handleAttendanceChange(student.id, status as AttendanceStatus)} className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase transition-all ${record?.status === status ? 'bg-primary theme-bg text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-200'}`}>{status.charAt(0)}</button>))}</div></div></td>
                  <td className="px-6 py-6"><input type="number" placeholder="%" className="w-20 text-center text-xs font-black p-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none" value={record?.testScore || ''} onChange={e => updateAttendanceField(student.id, 'testScore', e.target.value)} /></td>
                  <td className="px-6 py-6"><input placeholder="Observational feedback..." className="w-full text-xs font-bold p-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:bg-white focus:theme-border transition-all" value={record?.performanceComment || ''} onChange={e => updateAttendanceField(student.id, 'performanceComment', e.target.value)} /></td>
                </tr>);})}</tbody>
              </table>
           </div>
        </div>
      </div>
      {showPlanningModal && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[90] p-4"><div className="bg-white rounded-[3.5rem] p-12 max-w-2xl w-full shadow-2xl relative"><button onClick={() => setShowPlanningModal(false)} className="absolute top-10 right-10 p-2 text-slate-300 hover:text-slate-500 transition-all"><X className="w-8 h-8" /></button><h2 className="text-3xl font-black text-slate-800 mb-10">{activePlanId ? 'Refine Lesson' : 'New Plan'}</h2><div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar"><div className="grid grid-cols-2 gap-8"><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Planned Date</label><input type="date" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" value={lpFormData.date} onChange={e => setLpFormData({...lpFormData, date: e.target.value})} /></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Modality</label><select className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" value={lpFormData.category} onChange={e => setLpFormData({...lpFormData, category: e.target.value})}>{settings.lessonCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Objectives</label><textarea placeholder="Outline goals..." className="w-full h-32 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none font-medium leading-relaxed text-sm" value={lpFormData.text} onChange={e => setLpFormData({...lpFormData, text: e.target.value})} /></div></div><div className="mt-12 flex gap-4"><button onClick={() => setShowPlanningModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-500 font-black uppercase text-xs rounded-2xl">Discard</button><button onClick={handleSaveLessonPlan} className="flex-1 py-5 theme-bg text-white font-black uppercase text-xs rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Finalize Plan</button></div></div></div>)}
    </div>
  );
};

export default ClassDetails;

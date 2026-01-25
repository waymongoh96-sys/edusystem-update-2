import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, BookOpen, Calendar, Clock, TrendingUp, 
  CheckCircle2, AlertCircle, ChevronLeft, BarChart3, Sparkles, FileText
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, Class, AttendanceRecord, ExamResult, AttendanceStatus } from '../types';

interface StudentDashboardProps {
  student: User;
  classes: Class[];
  attendance: AttendanceRecord[];
  examResults: ExamResult[];
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
  student, classes, attendance, examResults 
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // FIX: Updated logic to check BOTH new and legacy fields
  const enrolledClasses = useMemo(() => {
    return classes.filter(c => {
      // 1. Get the list (handle new field, old field, or empty)
      const ids = c.enrolledStudentIds || (c as any).studentIds || [];
      // 2. Safely check if student is included
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
        onBack={() => setSelectedClassId(null)} 
      />
    ) : null;
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Academic Portal</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Learner: {student.name}</p>
        </div>
        <div className="bg-white border border-slate-200 px-6 py-4 rounded-3xl shadow-sm flex items-center gap-4">
           <div className="w-10 h-10 theme-light-bg rounded-xl flex items-center justify-center"><BookOpen className="w-5 h-5 theme-primary" /></div>
           <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolled Labs</p><p className="text-sm font-black text-slate-800">{enrolledClasses.length} Classes</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {enrolledClasses.map(cls => (
          <div key={cls.id} onClick={() => setSelectedClassId(cls.id)} className="bg-white rounded-[3rem] p-10 border border-slate-200 hover:theme-border hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group relative overflow-hidden">
             <div className="w-2 h-20 absolute left-0 top-1/2 -translate-y-1/2 rounded-r-2xl" style={{ backgroundColor: cls.themeColor }} />
             <h3 className="text-2xl font-black text-slate-800 mb-8 group-hover:theme-primary transition-colors">{cls.name}</h3>
             <div className="space-y-5">
                <div className="flex items-center gap-4 text-slate-500"><Calendar className="w-5 h-5 opacity-40" /><span className="text-[10px] font-black uppercase tracking-widest">Every {cls.classDay}</span></div>
                <div className="flex items-center gap-4 text-slate-500"><Clock className="w-5 h-5 opacity-40" /><span className="text-[10px] font-black uppercase tracking-widest">{cls.classTime}</span></div>
             </div>
             <div className="mt-10 pt-10 border-t border-slate-100 flex justify-between items-center">
                <div className="flex -space-x-3">
                   {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-4 border-white bg-slate-100" />)}
                   <div className="w-8 h-8 rounded-full border-4 border-white theme-bg flex items-center justify-center text-[8px] font-black text-white">+</div>
                </div>
                <span className="text-[9px] font-black theme-primary uppercase tracking-widest">View Progress</span>
             </div>
          </div>
        ))}
        {enrolledClasses.length === 0 && (
          <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center">
            <GraduationCap className="w-16 h-16 text-slate-200 mb-6" />
            <p className="text-lg font-black text-slate-800">No Enrolled Classes</p>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Contact administrator for registry</p>
          </div>
        )}
      </div>
    </div>
  );
};

const StudentClassView: React.FC<{ 
  cls: Class; 
  student: User; 
  attendance: AttendanceRecord[]; 
  examResults: ExamResult[]; 
  onBack: () => void; 
}> = ({ cls, student, attendance, examResults, onBack }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const stats = useMemo(() => {
    const monthAtt = attendance.filter(a => new Date(a.date).getMonth() === selectedMonth);
    const presentCount = monthAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const attPercent = monthAtt.length > 0 ? (presentCount / monthAtt.length) * 100 : 0;
    const avgScore = examResults.length > 0 ? examResults.reduce((acc, curr) => acc + curr.score, 0) / examResults.length : 0;
    const latestExam = examResults.length > 0 ? [...examResults].sort((a,b) => b.id.localeCompare(a.id))[0] : null;
    return { attPercent, avgScore, latestExam };
  }, [attendance, examResults, selectedMonth]);

  const generateAIComment = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: "YOUR_API_KEY_HERE" }); // Ensure this is safe or from env
      const notes = attendance.map(a => `${a.date}: ${a.performanceComment}`).filter(n => n.length > 10).join('\n');
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Act as a supportive academic mentor. Based on these teacher notes for student ${student.name} in class ${cls.name}, provide a supportive 2-sentence summary of their performance and one encouraging tip for next month. 
        Teacher's Notes:
        ${notes || "The student has been attending class regularly and participating well."}`,
      });
      setAiAnalysis(response.text);
    } catch (e) {
      setAiAnalysis("You are showing great consistency in your learning path. Focus on maintaining this momentum!");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500 pb-20">
      <div className="flex items-center gap-6">
        <button onClick={onBack} className="p-4 bg-white border border-slate-200 hover:bg-slate-50 rounded-3xl shadow-sm transition-all group active:scale-95"><ChevronLeft className="w-6 h-6 text-slate-600 group-hover:theme-primary" /></button>
        <div><h1 className="text-4xl font-black text-slate-800">{cls.name} Analysis</h1><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Personal Progress Terminal</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-4">
           <div className="flex justify-between items-start">
              <div className="p-3 bg-emerald-50 rounded-2xl"><CheckCircle2 className="w-6 h-6 text-emerald-500" /></div>
              <select className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-xl border-none outline-none" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('default', {month: 'long'})}</option>)}
              </select>
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Attendance</p>
           <h4 className="text-4xl font-black text-slate-800">{stats.attPercent.toFixed(1)}%</h4>
           <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${stats.attPercent}%` }} /></div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-4">
           <div className="p-3 theme-light-bg rounded-2xl w-fit"><TrendingUp className="w-6 h-6 theme-primary" /></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Exam Score</p>
           <h4 className="text-4xl font-black text-slate-800">{stats.avgScore.toFixed(1)}%</h4>
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cumulative GPA across terms</p>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-4">
           <div className="p-3 bg-amber-50 rounded-2xl w-fit"><BarChart3 className="w-6 h-6 text-amber-500" /></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latest Exam Outcome</p>
           <h4 className="text-4xl font-black text-slate-800">{stats.latestExam?.score || 0}%</h4>
           <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest truncate">{stats.latestExam?.examName || 'No Exams Logged'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8 bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm flex flex-col h-[600px]">
           <h3 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-4"><FileText className="w-8 h-8 theme-primary" /> Attendance & Metric Log</h3>
           <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher Insights</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Metric</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.sort((a,b) => b.date.localeCompare(a.date)).map(record => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-6 font-black text-slate-800 text-xs">{record.date}</td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                          record.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          record.status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>{record.status}</span>
                      </td>
                      <td className="px-6 py-6 text-xs text-slate-500 font-medium leading-relaxed italic">"{record.performanceComment || 'Steady progress maintained.'}"</td>
                      <td className="px-6 py-6 text-right font-black text-slate-800 text-sm">{record.testScore ? `${record.testScore}%` : '--'}</td>
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                        No activity records found for this registry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>

        <div className="xl:col-span-4 bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm flex flex-col h-[600px] relative overflow-hidden">
           <div className="flex items-center gap-4 mb-10">
              <div className="p-4 theme-light-bg rounded-3xl"><Sparkles className="w-8 h-8 theme-primary" /></div>
              <div><h3 className="text-2xl font-black text-slate-800">Support Terminal</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Mentor Analysis</p></div>
           </div>
           
           <div className="flex-1 bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 relative group overflow-y-auto custom-scrollbar">
              {isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 theme-bg rounded-full animate-ping opacity-20" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synthesizing Data...</p>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-6">
                  <p className="text-base font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">"{aiAnalysis}"</p>
                  <div className="pt-6 border-t border-slate-200">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Growth Tip</p>
                     <p className="text-xs font-bold text-slate-500 mt-2">Active participation in classroom discussions often leads to better comprehension of complex topics.</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4">
                   <AlertCircle className="w-12 h-12 text-slate-200" />
                   <p className="text-sm font-bold text-slate-400 leading-relaxed uppercase tracking-widest">Request a synthesis of teacher insights and personalized growth strategies.</p>
                   <button onClick={generateAIComment} className="theme-bg text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/10 active:scale-95 transition-all">Analyze Performance</button>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

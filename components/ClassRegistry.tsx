
import React, { useState } from 'react';
import { Plus, Clock, Calendar, Users, X, BookOpen, ChevronRight, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { Class, SystemSettings, LessonPlan, TaskStatus } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface ClassRegistryProps {
  classes: Class[];
  onSelectClass: (id: string) => void;
  settings: SystemSettings;
  lessonPlans: LessonPlan[];
}

const ClassRegistry: React.FC<ClassRegistryProps> = ({ 
  classes, onSelectClass, settings, lessonPlans 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [showQuickPlan, setShowQuickPlan] = useState(false);
  const [formData, setFormData] = useState({
    name: '', themeColor: '#3b82f6', classDay: 'Monday', classTime: '09:00'
  });

  const getNextDateForDay = (dayName: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = days.indexOf(dayName);
    const now = new Date();
    
    let nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
    if (nextSunday.toDateString() === now.toDateString()) {
       nextSunday.setDate(now.getDate() + 7);
    }
    
    let resultDate = new Date(nextSunday);
    resultDate.setDate(nextSunday.getDate() + targetDay);
    return resultDate.toISOString().split('T')[0];
  };

  const [bulkPlans, setBulkPlans] = useState<Record<string, string>>({});

  const handleOpenQuickPlan = () => {
    const initialDates: Record<string, string> = {};
    classes.forEach(c => {
      initialDates[c.id] = getNextDateForDay(c.classDay);
    });
    setBulkPlans(initialDates);
    setShowQuickPlan(true);
  };

  const handleSaveBulkPlans = async () => {
    const batchPromises = (Object.entries(bulkPlans) as [string, string][]).map(([classId, date]) => {
      const planId = `bulk-${Date.now()}-${classId}`;
      const newPlan: LessonPlan = {
        id: planId,
        classId,
        date,
        text: '',
        category: settings.lessonCategories[0],
        status: TaskStatus.HAVENT_START,
        materials: []
      };
      return setDoc(doc(db, 'lessonPlans', planId), newPlan);
    });
    await Promise.all(batchPromises);
    setShowQuickPlan(false);
  };

  const handleOpenEdit = (e: React.MouseEvent, cls: Class) => {
    e.stopPropagation();
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      themeColor: cls.themeColor,
      classDay: cls.classDay,
      classTime: cls.classTime
    });
    setIsAdding(true);
  };

  const handleDeleteClass = async (e: React.MouseEvent, classId: string) => {
    e.stopPropagation();
    if (window.confirm("Permanently delete this classroom? All data will be lost.")) {
      await deleteDoc(doc(db, 'classes', classId));
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const classId = editingClass ? editingClass.id : Date.now().toString();
    const classData: Class = {
      id: classId,
      ...formData,
      teacherId: 't1', // Simplified
      enrolledStudentIds: editingClass ? editingClass.enrolledStudentIds : []
    };
    await setDoc(doc(db, 'classes', classId), classData);
    setIsAdding(false);
    setEditingClass(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">System Registry</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Operations</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleOpenQuickPlan} className="bg-white border border-slate-200 theme-primary px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"><Calendar className="w-5 h-5" /> Weekly Planner</button>
          <button onClick={() => { setEditingClass(null); setIsAdding(true); setFormData({name:'', themeColor:'#3b82f6', classDay:'Monday', classTime:'09:00'}); }} className="theme-bg text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/10 active:scale-95 transition-all flex items-center gap-2"><Plus className="w-5 h-5" /> New Classroom</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {classes.map(cls => (
          <div key={cls.id} onClick={() => onSelectClass(cls.id)} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 hover:theme-border hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden">
            <div className="w-2 h-16 absolute left-0 top-1/2 -translate-y-1/2 rounded-r-xl" style={{ backgroundColor: cls.themeColor }} />
            <div className="flex justify-between items-start mb-4">
               <h3 className="text-2xl font-black text-slate-800 group-hover:theme-primary transition-colors">{cls.name}</h3>
               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => handleOpenEdit(e, cls)} className="p-2 bg-slate-50 text-slate-400 hover:theme-primary rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={(e) => handleDeleteClass(e, cls.id)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
               </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-slate-500"><div className="p-2.5 bg-slate-50 rounded-xl group-hover:theme-light-bg group-hover:theme-primary transition-all"><Calendar className="w-4 h-4" /></div><span className="text-xs font-black uppercase tracking-widest">Every {cls.classDay}</span></div>
              <div className="flex items-center gap-4 text-slate-500"><div className="p-2.5 bg-slate-50 rounded-xl group-hover:theme-light-bg group-hover:theme-primary transition-all"><Clock className="w-4 h-4" /></div><span className="text-xs font-black uppercase tracking-widest">{cls.classTime}</span></div>
              <div className="flex items-center gap-4 text-slate-500"><div className="p-2.5 bg-slate-50 rounded-xl group-hover:theme-light-bg group-hover:theme-primary transition-all"><Users className="w-4 h-4" /></div><span className="text-xs font-black uppercase tracking-widest">{cls.enrolledStudentIds?.length || 0} Registered</span></div>
            </div>
          </div>
        ))}
      </div>

      {showQuickPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[3.5rem] p-12 max-w-3xl w-full shadow-2xl relative animate-in zoom-in-95">
             <button onClick={() => setShowQuickPlan(false)} className="absolute top-10 right-10 p-2 text-slate-300 hover:text-slate-500 transition-all active:scale-90"><X className="w-8 h-8" /></button>
             <h2 className="text-3xl font-black text-slate-800 mb-2">Weekly Operational Planner</h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Intelligent Scheduling Terminal</p>
             <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                {classes.map(cls => (
                  <div key={cls.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between group hover:bg-white hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg" style={{ backgroundColor: cls.themeColor }}>{cls.name.charAt(0)}</div>
                      <div><p className="font-black text-slate-800">{cls.name}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cls.classDay}s @ {cls.classTime}</p></div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Planned Execution</label>
                      <input type="date" className="bg-white border border-slate-200 p-3 rounded-xl font-black text-xs outline-none focus:theme-border transition-all" value={bulkPlans[cls.id]} onChange={e => setBulkPlans({...bulkPlans, [cls.id]: e.target.value})} />
                    </div>
                  </div>
                ))}
             </div>
             <div className="mt-12 flex gap-4">
               <button onClick={() => setShowQuickPlan(false)} className="flex-1 py-6 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-xs rounded-2xl">Cancel</button>
               <button onClick={handleSaveBulkPlans} className="flex-1 py-6 theme-bg text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"><CheckCircle2 className="w-5 h-5" /> Finalize Scheduling</button>
             </div>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[3.5rem] p-12 max-w-md w-full shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => {setIsAdding(false); setEditingClass(null);}} className="absolute top-10 right-10 p-2 text-slate-300 hover:text-slate-500 transition-all"><X className="w-8 h-8" /></button>
            <h2 className="text-3xl font-black text-slate-800 mb-10">{editingClass ? 'Edit Classroom' : 'New Classroom'}</h2>
            <form onSubmit={handleSaveClass} className="space-y-6">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Designation</label><input required placeholder="e.g. Advanced Bio" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none theme-ring font-bold text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Day</label><select className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" value={formData.classDay} onChange={e => setFormData({...formData, classDay: e.target.value})}>{DAYS_OF_WEEK.map(day => <option key={day} value={day}>{day}</option>)}</select></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Time</label><input type="time" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" value={formData.classTime} onChange={e => setFormData({...formData, classTime: e.target.value})} /></div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Theme Color</label>
                 <div className="flex gap-4 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                    {['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'].map(c => (
                      <button type="button" key={c} onClick={() => setFormData({...formData, themeColor: c})} className={`w-8 h-8 rounded-full border-4 ${formData.themeColor === c ? 'border-white shadow-lg scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                 </div>
              </div>
              <button type="submit" className="w-full theme-bg text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-6 transition-all active:scale-95">
                {editingClass ? 'Update Node' : 'Initialize Node'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassRegistry;

import React, { useState, useMemo } from 'react';
import { Plus, Clock, Calendar, Users, X, BookOpen, ChevronRight, CheckCircle2, Edit2, Trash2, Palette, GripVertical } from 'lucide-react';
import { Class, SystemSettings, LessonPlan, TaskStatus, User } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface ClassRegistryProps {
  classes: Class[];
  onSelectClass: (id: string) => void;
  settings: SystemSettings;
  lessonPlans: LessonPlan[];
  currentUser: User | null; // Added prop
}

const ClassRegistry: React.FC<ClassRegistryProps> = ({ 
  classes, onSelectClass, settings, lessonPlans, currentUser 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [showQuickPlan, setShowQuickPlan] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', themeColor: '#3b82f6', classDay: 'Monday', classTime: '09:00'
  });

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [classes]);

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
    if (window.confirm("Permanently delete this classroom? This will remove all associated logs and student records.")) {
      try {
        await deleteDoc(doc(db, 'classes', classId));
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Failed to delete. Check your Firebase permissions.");
      }
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
       alert("Error: No user logged in.");
       return;
    }

    const classId = editingClass ? editingClass.id : Date.now().toString();
    const classData: Class = {
      id: classId,
      ...formData,
      // CRITICAL FIX: Use the REAL user ID, not 't1'
      teacherId: editingClass ? editingClass.teacherId : currentUser.id, 
      enrolledStudentIds: editingClass ? editingClass.enrolledStudentIds : [],
      order: editingClass?.order ?? classes.length
    };
    
    try {
      await setDoc(doc(db, 'classes', classId), classData);
      setIsAdding(false);
      setEditingClass(null);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save data.");
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const oldIndex = sortedClasses.findIndex(c => c.id === draggedId);
    const newIndex = sortedClasses.findIndex(c => c.id === targetId);

    const reordered = [...sortedClasses];
    const [removed] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, removed);

    const batch = writeBatch(db);
    reordered.forEach((cls, idx) => {
      const ref = doc(db, 'classes', cls.id);
      batch.update(ref, { order: idx });
    });
    
    try {
      await batch.commit();
    } catch (err) {
      console.error("Batch update failed:", err);
    }
    setDraggedId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">System Registry</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Operations</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleOpenQuickPlan} className="bg-white border border-slate-200 theme-primary px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"><Calendar className="w-5 h-5" /> Weekly Planner</button>
          <button onClick={() => { setEditingClass(null); setIsAdding(true); setFormData({name:'', themeColor:'#3b82f6', classDay:'Monday', classTime:'09:00'}); }} className="theme-bg text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/10 active:scale-95 transition-all flex items-center gap-2"><Plus className="w-5 h-5" /> New Classroom</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedClasses.map(cls => (
          <div 
            key={cls.id} 
            draggable
            onDragStart={() => handleDragStart(cls.id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(cls.id)}
            onClick={() => onSelectClass(cls.id)} 
            className={`bg-white rounded-[2rem] p-6 border border-slate-200 hover:theme-border hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full min-h-[220px] ${draggedId === cls.id ? 'opacity-40 grayscale scale-95' : 'opacity-100'}`}
          >
            <div className="w-1.5 h-12 absolute left-0 top-8 rounded-r-lg" style={{ backgroundColor: cls.themeColor }} />
            
            <div className="flex justify-between items-start mb-4 gap-2">
               <div className="flex-1">
                 <h3 className="text-xl font-black text-slate-800 group-hover:theme-primary transition-colors leading-tight break-words pr-4">{cls.name}</h3>
               </div>
               <div className="flex flex-col gap-2 shrink-0">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={(e) => handleOpenEdit(e, cls)} className="p-2 bg-slate-50 text-slate-400 hover:theme-primary rounded-lg transition-all shadow-sm">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => handleDeleteClass(e, cls.id)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 rounded-lg transition-all shadow-sm">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-end opacity-20 group-hover:opacity-40 transition-opacity">
                    <GripVertical className="w-4 h-4 text-slate-600" />
                  </div>
               </div>
            </div>

            <div className="mt-auto space-y-3">
              <div className="flex items-center gap-3 text-slate-500"><Calendar className="w-3.5 h-3.5 opacity-40" /><span className="text-[10px] font-black uppercase tracking-widest">Every {cls.classDay}</span></div>
              <div className="flex items-center gap-3 text-slate-500"><Clock className="w-3.5 h-3.5 opacity-40" /><span className="text-[10px] font-black uppercase tracking-widest">{cls.classTime}</span></div>
              <div className="flex items-center gap-3 text-slate-500"><Users className="w-3.5 h-3.5 opacity-40" /><span className="text-[10px] font-black uppercase tracking-widest">{cls.enrolledStudentIds?.length || 0} Students</span></div>
            </div>
          </div>
        ))}
        {sortedClasses.length === 0 && (
          <div className="col-span-full py-20 bg-white border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-400">
             <BookOpen className="w-12 h-12 mb-4 opacity-20" />
             <p className="font-black uppercase tracking-widest text-xs">Registry Empty</p>
          </div>
        )}
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
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Designation</label>
                <input required placeholder="e.g. Advanced Bio" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none theme-ring font-bold text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Day</label>
                  <select className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" value={formData.classDay} onChange={e => setFormData({...formData, classDay: e.target.value})}>
                    {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Time</label>
                  <input type="time" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" value={formData.classTime} onChange={e => setFormData({...formData, classTime: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> Classroom Identity</label>
                 <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'].map(c => (
                      <button type="button" key={c} onClick={() => setFormData({...formData, themeColor: c})} className={`w-10 h-10 rounded-full border-4 transition-all ${formData.themeColor === c ? 'border-white shadow-lg scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c }} />
                    ))}
                 </div>
              </div>
              <button type="submit" className="w-full theme-bg text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-6 transition-all active:scale-95">
                {editingClass ? 'Update Registry' : 'Initialize Student Group'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassRegistry;

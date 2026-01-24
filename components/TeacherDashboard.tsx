
import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, CheckCircle2, 
  ChevronLeft, ChevronRight, ListChecks, ArrowRight, X, AlertCircle
} from 'lucide-react';
import { Task, Class, SystemSettings, TaskStatus } from '../types';

interface DashboardProps {
  tasks: Task[];
  classes: Class[];
  lessonPlans: any[];
  settings: SystemSettings;
  onClassClick: (id: string) => void;
  onTaskClick: () => void;
}

const TeacherDashboard: React.FC<DashboardProps> = ({ 
  tasks, classes, settings, onClassClick, onTaskClick 
}) => {
  const [viewMode, setViewMode] = useState<'WEEK' | 'MONTH'>('WEEK');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const today = new Date();

  // Helper to get local YYYY-MM-DD string without timezone shifts
  const toLocalDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
  };

  const currentWeekDates = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    return { lastDay, adjustedFirstDay };
  }, [currentDate]);

  const handlePrev = () => {
    const d = new Date(currentDate);
    viewMode === 'WEEK' ? d.setDate(d.getDate() - 7) : d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    viewMode === 'WEEK' ? d.setDate(d.getDate() + 7) : d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const getEventsForDate = (date: Date) => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = toLocalDateString(date);
    const dayClasses = classes.filter(c => c.classDay === dayName);
    const dayTasks = tasks.filter(t => t.dueDate === dateStr && t.status !== TaskStatus.COMPLETE);
    const isHoliday = settings.holidays.find(h => h.date === dateStr);
    return { dayClasses, dayTasks, isHoliday };
  };

  const getStatusColor = (status: TaskStatus) => {
    switch(status) {
      case TaskStatus.HAVENT_START: return 'bg-red-500';
      case TaskStatus.DOING: return 'bg-amber-400';
      case TaskStatus.COMPLETE: return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">System Terminal</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Operational Overview</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
              onClick={() => setViewMode('WEEK')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${viewMode === 'WEEK' ? 'bg-white shadow-sm theme-primary' : 'text-slate-500'}`}
            >
              WEEK
            </button>
            <button 
              onClick={() => setViewMode('MONTH')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${viewMode === 'MONTH' ? 'bg-white shadow-sm theme-primary' : 'text-slate-500'}`}
            >
              MONTH
            </button>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
            <span className="font-black text-[11px] uppercase tracking-widest min-w-[120px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={handleNext} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[calc(100vh-18rem)]">
        <div className="xl:col-span-8 overflow-hidden h-full">
          {viewMode === 'WEEK' ? (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 h-full">
              {currentWeekDates.map((date, idx) => {
                const { dayClasses, dayTasks, isHoliday } = getEventsForDate(date);
                const isToday = date.toDateString() === today.toDateString();
                return (
                  <div key={idx} className={`flex flex-col h-full rounded-[2.5rem] border transition-all ${isToday ? 'theme-border theme-light-bg shadow-lg' : 'bg-white border-slate-100'}`}>
                    <div className="p-4 text-center border-b border-inherit">
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isToday ? 'theme-primary' : 'text-slate-400'}`}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p className={`text-xl font-black ${isToday ? 'theme-primary' : 'text-slate-800'}`}>{date.getDate()}</p>
                    </div>
                    <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                      {isHoliday && (
                        <div className="p-3 rounded-2xl bg-red-50 border border-red-100 cursor-pointer" onClick={() => setSelectedEvent({ type: 'HOLIDAY', ...isHoliday })}>
                          <p className="text-[7px] font-black text-red-600 uppercase tracking-widest mb-1">Holiday</p>
                          <p className="text-[9px] font-bold text-red-800 leading-tight">{isHoliday.description}</p>
                        </div>
                      )}
                      {dayClasses.map(cls => (
                        <div 
                          key={cls.id} 
                          onClick={() => onClassClick(cls.id)}
                          className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:theme-border transition-all cursor-pointer group"
                        >
                          <div className="w-4 h-1 rounded-full mb-2" style={{ backgroundColor: cls.themeColor }} />
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{cls.classTime}</p>
                          <p className="text-[10px] font-black text-slate-800 group-hover:theme-primary truncate">{cls.name}</p>
                        </div>
                      ))}
                      {dayTasks.map(task => (
                        <div 
                          key={task.id} 
                          onClick={onTaskClick}
                          className="p-3 rounded-2xl bg-amber-50 border border-amber-100 shadow-sm hover:border-amber-400 transition-all cursor-pointer"
                        >
                          <p className="text-[7px] font-black text-amber-600 uppercase tracking-widest mb-1">Due</p>
                          <p className="text-[10px] font-bold text-slate-800 truncate">{task.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm h-full flex flex-col">
              <div className="grid grid-cols-7 gap-4 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 flex-1 overflow-y-auto custom-scrollbar">
                {Array.from({ length: daysInMonth.adjustedFirstDay }).map((_, i) => <div key={`empty-${i}`} className="bg-slate-50/50 rounded-lg" />)}
                {Array.from({ length: daysInMonth.lastDay }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const { dayClasses, dayTasks, isHoliday } = getEventsForDate(date);
                  const isToday = date.toDateString() === today.toDateString();
                  return (
                    <div key={day} className={`p-1.5 rounded-lg border flex flex-col h-full min-h-[100px] transition-all overflow-hidden ${isToday ? 'theme-border theme-light-bg' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                      <span className={`text-[10px] font-black mb-1 ${isToday ? 'theme-primary' : 'text-slate-800'}`}>{day}</span>
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {isHoliday && (
                          <div 
                            onClick={() => setSelectedEvent({ type: 'HOLIDAY', ...isHoliday })}
                            className="bg-red-500 text-white text-[7px] px-1.5 py-0.5 rounded-md font-black truncate cursor-pointer"
                          >
                            {isHoliday.description}
                          </div>
                        )}
                        {dayClasses.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => setSelectedEvent({ type: 'CLASS', ...c })} 
                            className="text-white text-[7px] px-1.5 py-0.5 rounded-md font-black truncate cursor-pointer hover:brightness-90" 
                            style={{ backgroundColor: c.themeColor }}
                          >
                            {c.name}
                          </div>
                        ))}
                        {dayTasks.map(t => (
                          <div 
                            key={t.id} 
                            onClick={() => setSelectedEvent({ type: 'TASK', ...t })} 
                            className="bg-amber-400 text-white text-[7px] px-1.5 py-0.5 rounded-md font-black truncate cursor-pointer hover:brightness-90"
                          >
                            {t.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-4 h-full overflow-hidden">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 theme-light-bg rounded-2xl">
                <CheckCircle2 className="w-6 h-6 theme-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">Priority Stream</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Obligations</p>
              </div>
            </div>
            
            <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
              {tasks.filter(t => t.status !== TaskStatus.COMPLETE).map(task => {
                const isLessonTask = task.id.startsWith('lp-');
                return (
                  <div 
                    key={task.id} 
                    onClick={isLessonTask ? () => onClassClick(task.id.split('-')[1]) : onTaskClick}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:theme-border hover:bg-white transition-all group cursor-pointer"
                  >
                    <div className={`text-[9px] font-black text-white px-2 py-0.5 rounded-lg shrink-0 uppercase w-10 text-center ${getStatusColor(task.status)}`}>
                      {task.category.substring(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-800 truncate">{task.name}</p>
                    </div>
                    <div className="text-[9px] font-black text-slate-400 whitespace-nowrap bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                      {task.dueDate}
                    </div>
                  </div>
                );
              })}
              {tasks.filter(t => t.status !== TaskStatus.COMPLETE).length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-20">
                  <CheckCircle2 className="w-16 h-16 mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest">Clear List</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-all active:scale-90">
                <X className="w-6 h-6 text-slate-400" />
              </button>
              
              <div className="mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
                  selectedEvent.type === 'CLASS' ? 'theme-bg' : selectedEvent.type === 'HOLIDAY' ? 'bg-red-500' : 'bg-amber-400'
                }`}>
                  {selectedEvent.type === 'CLASS' ? <CalendarIcon className="w-6 h-6 text-white" /> : 
                   selectedEvent.type === 'HOLIDAY' ? <AlertCircle className="w-6 h-6 text-white" /> :
                   <ListChecks className="w-6 h-6 text-white" />}
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">{selectedEvent.name || selectedEvent.description}</h3>
                <p className="text-[10px] font-black theme-primary uppercase tracking-[0.2em]">{selectedEvent.type} Details</p>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Date/Time</span>
                  <span className="font-black text-slate-700">
                    {selectedEvent.date || `${selectedEvent.classDay} ${selectedEvent.classTime}` || selectedEvent.dueDate}
                  </span>
                </div>
                {selectedEvent.category && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-400 uppercase text-[10px]">Category</span>
                    <span className="font-black theme-primary bg-primary-light px-2 py-0.5 rounded-lg border border-primary text-[10px] uppercase">
                      {selectedEvent.category}
                    </span>
                  </div>
                )}
                {selectedEvent.status && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-400 uppercase text-[10px]">Status</span>
                    <span className={`font-black text-white px-3 py-1 rounded-full text-[10px] uppercase ${getStatusColor(selectedEvent.status)}`}>
                      {selectedEvent.status.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setSelectedEvent(null)}
                className="w-full mt-10 py-4 theme-bg text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
              >
                Close Details
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, ListChecks, ArrowRight, X, AlertCircle, Eye, EyeOff, MessageSquare, Megaphone, Sparkles, PlusSquare
} from 'lucide-react';
import { Task, Class, SystemSettings, TaskStatus } from '../types';
import { supabase } from '../supabase';

interface DashboardProps {
  tasks: Task[];
  classes: Class[];
  lessonPlans: any[];
  settings: SystemSettings;
  onClassClick: (id: string) => void;
  onTaskClick: () => void;
}

const TeacherDashboard: React.FC<DashboardProps> = ({
  tasks, classes, lessonPlans, settings, onClassClick, onTaskClick
}) => {
  const [viewMode, setViewMode] = useState<'WEEK' | 'MONTH'>('WEEK');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postData, setPostData] = useState({ title: '', content: '', category: 'NEWS' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = new Date();

  const toLocalDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
  };

  const dynamicHours = useMemo(() => {
    const start = settings.startHour ?? 7;
    const end = settings.endHour ?? 19;
    return Array.from({ length: end - start + 1 }, (_, i) => i + start);
  }, [settings.startHour, settings.endHour]);

  const currentWeekDates = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    const allWeek = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

    if (settings.workingDays && settings.workingDays.length > 0) {
      return allWeek.filter(d => settings.workingDays.includes(d.toLocaleDateString('en-US', { weekday: 'long' })));
    }
    return allWeek;
  }, [currentDate, settings.workingDays]);

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
    switch (status) {
      case TaskStatus.HAVENT_START: return 'bg-red-500';
      case TaskStatus.DOING: return 'bg-amber-400';
      case TaskStatus.COMPLETE: return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  const getPlanStatusIcon = (status: string) => {
    switch (status) {
      case 'HAVENT_START': return '🔴';
      case 'DOING': return '🟡';
      case 'COMPLETE': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">System Terminal</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Operational Overview</p>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setShowPostModal(true)} className="theme-bg text-white px-6 py-4 rounded-2xl font-black text-[10px] shadow-lg shadow-blue-500/20 uppercase tracking-widest flex items-center gap-2">
            <PlusSquare className="w-4 h-4" /> Post Update
          </button>

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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[calc(100vh-18rem)]">
        <div className="xl:col-span-8 overflow-hidden h-full">
          {viewMode === 'WEEK' ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
              {/* Header Row */}
              <div className="flex border-b border-slate-100 bg-slate-50/50">
                <div className="w-20 shrink-0 p-4 border-r border-slate-100 text-center flex flex-col justify-center">
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Time</span>
                </div>
                {currentWeekDates.map((date, idx) => {
                  const isToday = date.toDateString() === today.toDateString();
                  return (
                    <div key={idx} className={`flex-1 p-4 text-center border-r border-slate-100 last:border-r-0 ${isToday ? 'theme-light-bg' : ''}`}>
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isToday ? 'theme-primary' : 'text-slate-400'}`}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p className={`text-lg font-black ${isToday ? 'theme-primary' : 'text-slate-800'}`}>{date.getDate()}</p>
                    </div>
                  );
                })}
              </div>

              {/* Body Grid */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {dynamicHours.map(hour => (
                  <div key={hour} className="flex min-h-[90px] border-b border-slate-50 last:border-b-0">
                    <div className="w-20 shrink-0 p-4 border-r border-slate-100 text-center">
                      <span className="text-[10px] font-black text-slate-400">{hour.toString().padStart(2, '0')}:00</span>
                    </div>
                    {currentWeekDates.map((date, dayIdx) => {
                      const { dayClasses, dayTasks, isHoliday } = getEventsForDate(date);
                      const hourClasses = dayClasses.filter(c => parseInt(c.classTime.split(':')[0]) === hour);

                      const dateStr = toLocalDateString(date);

                      return (
                        <div key={dayIdx} className="flex-1 p-1 flex flex-col gap-1 border-r border-slate-50 last:border-r-0 relative">
                          {hourClasses.map(cls => {
                            const activePlan = lessonPlans.find(lp => lp.classId === cls.id && lp.date === dateStr);

                            return (
                              <div
                                key={cls.id}
                                onClick={() => onClassClick(cls.id)}
                                className="p-2 rounded-xl text-white shadow-sm hover:brightness-95 transition-all cursor-pointer group h-full flex flex-col justify-center"
                                style={{ backgroundColor: cls.themeColor }}
                              >
                                <p className="text-[8px] font-black opacity-80 uppercase leading-none mb-1">{cls.classTime}</p>
                                <p className="text-[9px] font-black leading-tight line-clamp-1">{cls.name}</p>

                                {/* --- LESSON PLAN INDICATOR (TEXT WRAPPING FIX) --- */}
                                {activePlan && (
                                  <div className="mt-1.5 flex items-start gap-1.5 bg-black/20 rounded-lg px-2 py-1 backdrop-blur-sm w-full">
                                    <span className="text-[8px] leading-tight shrink-0 mt-[1px]">{getPlanStatusIcon(activePlan.status)}</span>
                                    <span className="text-[8px] font-bold text-white/90 break-words whitespace-normal leading-tight">
                                      {activePlan.topic || activePlan.text || activePlan.category}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {hour === 9 && isHoliday && (
                            <div className="absolute inset-x-1 top-1 p-2 rounded-xl bg-red-50 border border-red-100 z-10 shadow-sm" onClick={() => setSelectedEvent({ type: 'HOLIDAY', ...isHoliday })}>
                              <p className="text-[7px] font-black text-red-600 uppercase">Holiday</p>
                              <p className="text-[8px] font-bold text-red-800 truncate">{isHoliday.description}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
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

      {showPostModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <header className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Campus News</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Share updates with the community</p>
              </div>
              <button onClick={() => setShowPostModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </header>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Subject</label>
                <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none theme-border" placeholder="News title..." value={postData.title} onChange={e => setPostData({ ...postData, title: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Category</label>
                <div className="flex gap-2">
                  {['NEWS', 'EVENT', 'COMMUNITY'].map(cat => (
                    <button key={cat} onClick={() => setPostData({ ...postData, category: cat })} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${postData.category === cat ? 'theme-bg text-white' : 'bg-slate-50 text-slate-400'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">Content</label>
                <textarea className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-sm outline-none theme-border" placeholder="Describe the update..." value={postData.content} onChange={e => setPostData({ ...postData, content: e.target.value })} />
              </div>

              <button
                disabled={isSubmitting || !postData.title || !postData.content}
                onClick={async () => {
                  setIsSubmitting(true);
                  const { error } = await supabase.from('community_posts').insert({
                    title: postData.title,
                    content: postData.content,
                    category: postData.category,
                    status: 'PENDING',
                    created_at: new Date().toISOString()
                  });
                  if (error) alert(error.message);
                  else {
                    alert("Post submitted for Admin review!");
                    setShowPostModal(false);
                    setPostData({ title: '', content: '', category: 'NEWS' });
                  }
                  setIsSubmitting(false);
                }}
                className="w-full py-5 theme-bg text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Transmitting...' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;

import React, { useState } from 'react';
import { Plus, X, Calendar, Edit2, ListChecks, CheckCircle2, Trash2 } from 'lucide-react';
import { Task, TaskStatus, SystemSettings, User } from '../types';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface TaskBoardProps {
  tasks: Task[];
  settings: SystemSettings;
  currentUser: User | null; // <--- ADDED THIS
}

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, settings, currentUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Task>>({
    name: '', dueDate: '', category: settings.taskCategories[0], status: TaskStatus.HAVENT_START
  });

  const handleOpenEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setFormData(task);
    setIsAdding(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // SAFETY CHECK: Ensure we know who is creating the task
    if (!currentUser) {
      alert("Error: User not identified. Please reload.");
      return;
    }

    const taskId = editingTaskId || Date.now().toString();
    
    const taskData: Task = { 
      id: taskId, 
      ...(formData as Task),
      // CRITICAL FIX: Stamp the task with the Creator's ID
      userId: currentUser.id 
    };

    try {
      await setDoc(doc(db, 'tasks', taskId), taskData);
      closeModal();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm("Delete this task?")) {
      await deleteDoc(doc(db, 'tasks', taskId));
    }
  };

  const closeModal = () => {
    setIsAdding(false);
    setEditingTaskId(null);
    setFormData({ name: '', dueDate: '', category: settings.taskCategories[0], status: TaskStatus.HAVENT_START });
  };

  const moveTask = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      // Persist the userId when moving, just in case
      await setDoc(doc(db, 'tasks', taskId), { ...task, status: newStatus });
    }
  };

  const columns = [
    { id: TaskStatus.HAVENT_START, label: "To-Do List", color: "#ef4444" },
    { id: TaskStatus.DOING, label: "In Progress", color: "#fbbf24" },
    { id: TaskStatus.COMPLETE, label: "Completed", color: "#10b981" }
  ];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-4">
            <ListChecks className="w-10 h-10 theme-primary" />
            Task Management
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Operational Kanban</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="theme-bg text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/10 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-[calc(100vh-22rem)]">
        {columns.map(col => (
          <div 
            key={col.id} 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const taskId = e.dataTransfer.getData('taskId');
              moveTask(taskId, col.id);
            }}
            className="flex flex-col bg-slate-100/30 rounded-[2.5rem] border border-slate-200 overflow-hidden"
          >
            <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(col.id)}`} />
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">{col.label}</h3>
              </div>
              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                {tasks.filter(t => t.status === col.id).length}
              </span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
              {tasks.filter(t => t.status === col.id).map(task => (
                <div 
                  key={task.id} 
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:theme-border transition-all cursor-grab active:cursor-grabbing group relative"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[8px] font-black text-white px-2 py-0.5 rounded-lg shrink-0 uppercase w-10 text-center ${getStatusColor(task.status)}`}>
                      {task.category.substring(0, 3)}
                    </span>
                    <h4 className="text-[11px] font-black text-slate-800 flex-1 truncate">{task.name}</h4>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => handleOpenEdit(task)} className="p-1 text-slate-300 hover:theme-primary transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteTask(task.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {task.dueDate}</span>
                    {task.status === TaskStatus.COMPLETE && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === col.id).length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-10 py-20 italic font-black text-[10px] uppercase">
                   Empty Zone
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={closeModal} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-500 transition-all"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-black text-slate-800 mb-8">{editingTaskId ? 'Edit Task' : 'New Task'}</h2>
            <form onSubmit={handleCreateTask} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Task Title</label>
                 <input required placeholder="What needs to be done?" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none theme-ring font-bold text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Due Date</label>
                  <input type="date" required className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category</label>
                  <select className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {settings.taskCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Current Status</label>
                 <div className="flex gap-2">
                   {columns.map(c => (
                     <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormData({...formData, status: c.id})}
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${formData.status === c.id ? getStatusColor(c.id) + ' text-white border-transparent' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                     >
                       {c.label.substring(0, 4)}
                     </button>
                   ))}
                 </div>
              </div>
              <button type="submit" className="w-full theme-bg text-white py-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all mt-4">
                {editingTaskId ? 'Update Task' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;

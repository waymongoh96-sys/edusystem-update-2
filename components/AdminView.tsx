import React, { useState } from 'react';
import { 
  Plus, Users, Calendar, Megaphone, Receipt, 
  MessageSquare, ShieldCheck, Trash2, X 
} from 'lucide-react';
import { supabase } from '../supabase';
import { User, Announcement, Holiday } from '../types';

interface AdminViewProps {
  teachers: User[];
  students: User[];
  classes: any[];
  holidays: Holiday[];
}

const AdminView: React.FC<AdminViewProps> = ({ teachers, students, classes, holidays }) => {
  const [showModal, setShowModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDate, setNewDate] = useState('');

  // 1. Handle New Announcement
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        title: newTitle,
        content: newContent
      });
      if (error) throw error;
      alert('Announcement posted!');
      setShowModal(null);
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  // 2. Handle New Holiday
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('holidays').insert({
        name: newTitle,
        date: newDate,
        type: 'SCHOOL'
      });
      if (error) throw error;
      alert('Holiday added!');
      setShowModal(null);
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  // 3. Generate Student Invite Code
  const handleGenerateInvite = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const { error } = await supabase.from('invitation_codes').insert({
        code: code,
        standard: 'General',
        status: 'ACTIVE'
      });
      if (error) throw error;
      alert(`New Student Invite Code Generated: ${code}`);
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header with Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total Students" value={students.length} color="blue" />
        <StatCard icon={ShieldCheck} label="Teachers" value={teachers.length} color="emerald" />
        <StatCard icon={Calendar} label="Active Classes" value={classes.length} color="orange" />
        <StatCard icon={Megaphone} label="Holidays" value={holidays.length} color="indigo" />
      </div>

      {/* Admin Quick Actions - FIXED UI (width/padding) */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
        <h3 className="text-lg font-black uppercase tracking-widest mb-6">Terminal Commands</h3>
        <div className="flex flex-wrap gap-4">
          <ActionButton 
            label="New Announcement" 
            icon={Megaphone} 
            onClick={() => setShowModal('announcement')} 
            color="indigo" 
          />
          <ActionButton 
            label="New Holiday" 
            icon={Calendar} 
            onClick={() => setShowModal('holiday')} 
            color="orange" 
          />
          <ActionButton 
            label="Generate Student Invite" 
            icon={Plus} 
            onClick={handleGenerateInvite} 
            color="blue" 
          />
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm">
          <h3 className="font-black uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" /> User Directory (Teachers)
          </h3>
          <div className="space-y-3">
            {teachers.map(t => (
              <div key={t.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-sm">{t.name}</span>
                <span className="text-[10px] font-black uppercase text-slate-400">@{t.username}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals for Adding Data */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase tracking-widest">Create {showModal}</h3>
              <button onClick={() => setShowModal(null)}><X /></button>
            </div>
            <form onSubmit={showModal === 'announcement' ? handleAddAnnouncement : handleAddHoliday} className="space-y-4">
              <input 
                className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold" 
                placeholder="Title/Name" 
                onChange={e => setNewTitle(e.target.value)}
                required 
              />
              {showModal === 'announcement' ? (
                <textarea 
                  className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold h-32" 
                  placeholder="Content" 
                  onChange={e => setNewContent(e.target.value)}
                  required 
                />
              ) : (
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold" 
                  onChange={e => setNewDate(e.target.value)}
                  required 
                />
              )}
              <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs">
                {loading ? 'Submitting...' : 'Confirm Entry'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components with UI fixes for word clipping
const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5">
    <div className={`p-4 rounded-2xl bg-${color}-50 text-${color}-600`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  </div>
);

const ActionButton = ({ label, icon: Icon, onClick, color }: any) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-3 px-6 py-4 bg-slate-50 hover:bg-white border border-slate-100 rounded-2xl transition-all hover:shadow-lg group"
  >
    <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600 group-hover:scale-110 transition-transform`}>
      <Icon className="w-4 h-4" />
    </div>
    {/* whitespace-nowrap ensures words don't break/cut off */}
    <span className="text-xs font-black uppercase tracking-widest text-slate-700 whitespace-nowrap">
      {label}
    </span>
  </button>
);

export default AdminView;

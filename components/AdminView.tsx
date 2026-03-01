import React, { useState, useMemo, useEffect } from 'react';
import { User, UserStatus, Class, Role, Announcement, CommunityPost, Invoice, Holiday, InvitationCode } from '../types';
import {
  Plus, Users, Edit, Filter, Trash2, BookOpen,
  Briefcase, GraduationCap, AlertTriangle, Clock, Upload, X, Megaphone, Receipt, Share2, Calendar, Key, CheckSquare, Square, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../supabase';

interface AdminViewProps {
  teachers: User[];
  students: User[];
  classes: Class[];
  holidays: Holiday[];
}

const AdminView: React.FC<AdminViewProps> = ({ teachers, students, classes, holidays }) => {
  const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT' | 'CLASSES' | 'ANNOUNCEMENTS' | 'BILLING' | 'COMMUNITY' | 'HOLIDAYS' | 'INVITATIONS'>('TEACHER');
  const [isAdding, setIsAdding] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [teacherFilter, setTeacherFilter] = useState('ALL');

  // Announcement State
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    title: '', content: '', image_url: '', target_standard: '', target_student_ids: [], is_global: false
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Billing State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({
    student_id: '', amount: 0, due_date: new Date().toISOString().split('T')[0], status: 'UNPAID'
  });

  // Invitation State
  const [invitations, setInvitations] = useState<InvitationCode[]>([]);

  // User Form State
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', username: '', password: '', status: UserStatus.ACTIVE, age: 10, standard: '1'
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    if (activeTab === 'ANNOUNCEMENTS') {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (data) setAnnouncements(data);
    } else if (activeTab === 'BILLING') {
      const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (data) setInvoices(data);
    } else if (activeTab === 'INVITATIONS') {
      const { data } = await supabase.from('invitation_codes').select('*').order('created_at', { ascending: false });
      if (data) setInvitations(data);
    }
  };

  const stats = useMemo(() => {
    const filteredClasses = classes.filter(c => teacherFilter === 'ALL' || c.teacherId === teacherFilter);
    const totalEnrollments = filteredClasses.reduce((sum, cls) => sum + (cls.enrolledStudentIds?.length || 0), 0);
    return { totalClasses: filteredClasses.length, totalEnrollments, staffCount: teachers.length, studentCount: students.length };
  }, [classes, teacherFilter, teachers, students]);

  const handleSaveAnnouncement = async () => {
    const { error } = await supabase.from('announcements').insert([{
      ...newAnnouncement,
      target_student_ids: selectedStudents,
      published_by: 'admin-id' // Replace with real admin id
    }]);
    if (!error) {
      alert("Announcement Published!");
      setIsAdding(false);
      fetchData();
    }
  };

  const handleGenerateInvite = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from('invitation_codes').insert([{
      code,
      target_standard: formData.standard,
      target_name: formData.name,
      is_active: true
    }]);
    if (!error) {
      alert(`Invite Code Generated: ${code}`);
      fetchData();
    }
  };

  const handleCreateInvoice = async () => {
    const { error } = await supabase.from('invoices').insert([{
      ...newInvoice,
      balance: newInvoice.amount,
      currency: 'RM'
    }]);
    if (!error) {
      alert("Invoice Created!");
      setIsAdding(false);
      fetchData();
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-black text-slate-800">Admin Command Center</h1></div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border shadow-sm">
          <Filter className="w-5 h-5 text-slate-400" />
          <select className="bg-transparent font-bold text-xs outline-none" value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)}>
            <option value="ALL">Global Fleet View</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <StatCard icon={BookOpen} label="Classes" value={stats.totalClasses} color="blue" />
        <StatCard icon={Users} label="Enrollments" value={stats.totalEnrollments} color="purple" />
        <StatCard icon={Briefcase} label="Staff" value={stats.staffCount} color="emerald" />
        <StatCard icon={GraduationCap} label="Students" value={stats.studentCount} color="indigo" />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4 overflow-x-auto">
        {[
          { id: 'TEACHER', icon: Briefcase, label: 'Staff' },
          { id: 'STUDENT', icon: GraduationCap, label: 'Students' },
          { id: 'CLASSES', icon: BookOpen, label: 'Classrooms' },
          { id: 'ANNOUNCEMENTS', icon: Megaphone, label: 'Announcements' },
          { id: 'BILLING', icon: Receipt, label: 'Billing' },
          { id: 'COMMUNITY', icon: Share2, label: 'Community' },
          { id: 'HOLIDAYS', icon: Calendar, label: 'Holidays' },
          { id: 'INVITATIONS', icon: Key, label: 'Invites' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setIsAdding(false); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800">{activeTab} Management</h2>
        <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20">
          <Plus className="w-5 h-5" /> New {activeTab.slice(0, -1)}
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === 'ANNOUNCEMENTS' ? (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Announcement</th><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Target</th><th className="px-8 py-5 text-right text-[10px] font-black uppercase text-slate-400">Action</th></tr>
            </thead>
            <tbody className="divide-y">
              {announcements.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-8 py-5 font-bold text-slate-800">{a.title}</td>
                  <td className="px-8 py-5 text-xs text-slate-500">{a.is_global ? 'Global' : a.target_standard || 'Specific Students'}</td>
                  <td className="px-8 py-5 text-right"><button className="text-red-400 h-10 w-10 flex items-center justify-center rounded-lg hover:bg-red-50 ml-auto"><Trash2 className="w-5 h-5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === 'BILLING' ? (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Student</th><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Amount (RM)</th><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Status</th><th className="px-8 py-5 text-right text-[10px] font-black uppercase text-slate-400">Action</th></tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map(i => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-8 py-5 font-bold">{students.find(s => s.id === i.student_id)?.name || 'Unknown'}</td>
                  <td className="px-8 py-5 font-black text-slate-800">{i.amount.toFixed(2)}</td>
                  <td className="px-8 py-5"><span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black">{i.status}</span></td>
                  <td className="px-8 py-5 text-right"><button className="p-2 border rounded-lg text-slate-400 hover:text-blue-500"><Edit className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-20 text-center opacity-30"><Megaphone className="w-20 h-20 mx-auto mb-4" /><p className="font-black uppercase tracking-widest">Select category to view data</p></div>
        )}
      </div>

      {/* --- ADDING MODALS --- */}
      {isAdding && activeTab === 'ANNOUNCEMENTS' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-2xl shadow-2xl space-y-6">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-black">Publish Announcement</h2><button onClick={() => setIsAdding(false)}><X /></button></div>
            <div className="space-y-4">
              <input className="w-full p-4 border rounded-2xl font-bold" placeholder="Announcement Title" value={newAnnouncement.title} onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} />
              <textarea className="w-full p-4 border rounded-2xl h-32" placeholder="Main Content..." value={newAnnouncement.content} onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} />

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Target Grade/Standard</label>
                  <select className="w-full p-4 border rounded-2xl font-bold" value={newAnnouncement.target_standard} onChange={e => setNewAnnouncement({ ...newAnnouncement, target_standard: e.target.value })}>
                    <option value="">Specific Selection</option>
                    {Array.from(new Set(students.map(s => s.standard))).filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => setNewAnnouncement({ ...newAnnouncement, is_global: !newAnnouncement.is_global })} className={`p-4 rounded-2xl font-black border transition-all ${newAnnouncement.is_global ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>GLOBAL BROADCAST</button>
                </div>
              </div>

              {!newAnnouncement.is_global && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Students</label>
                    <button onClick={() => setSelectedStudents(selectedStudents.length === students.length ? [] : students.map(s => s.id))} className="text-[10px] font-black text-blue-500 uppercase">
                      {selectedStudents.length === students.length ? 'Deselect All' : 'Select All Members'}
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-50 grid grid-cols-2 gap-2">
                    {students.filter(s => !newAnnouncement.target_standard || s.standard === newAnnouncement.target_standard).map(s => (
                      <button key={s.id} onClick={() => setSelectedStudents(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${selectedStudents.includes(s.id) ? 'bg-white shadow-sm' : 'opacity-60'}`}>
                        {selectedStudents.includes(s.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                        <span className="text-xs font-bold">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleSaveAnnouncement} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Launch Announcement</button>
            </div>
          </div>
        </div>
      )}

      {isAdding && activeTab === 'BILLING' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl space-y-6">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-black">Issue Invoice</h2><button onClick={() => setIsAdding(false)}><X /></button></div>
            <div className="space-y-4">
              <select className="w-full p-4 border rounded-2xl font-bold" value={newInvoice.student_id} onChange={e => setNewInvoice({ ...newInvoice, student_id: e.target.value })}>
                <option value="">Select Student...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.standard})</option>)}
              </select>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">RM</span>
                <input type="number" className="w-full p-4 pl-12 border rounded-2xl font-black" placeholder="0.00" value={newInvoice.amount} onChange={e => setNewInvoice({ ...newInvoice, amount: parseFloat(e.target.value) })} />
              </div>
              <input type="date" className="w-full p-4 border rounded-2xl font-bold" value={newInvoice.due_date} onChange={e => setNewInvoice({ ...newInvoice, due_date: e.target.value })} />
              <button onClick={handleCreateInvoice} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Issue RM {newInvoice.amount?.toFixed(2)} Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className={`bg-white p-6 rounded-3xl border shadow-sm flex flex-col items-center group hover:border-${color}-200 transition-all`}>
    <div className={`p-4 rounded-2xl mb-3 bg-${color}-50 text-${color}-600 shadow-inner`}><Icon className="w-7 h-7" /></div>
    <h4 className="text-3xl font-black text-slate-800">{value}</h4>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
  </div>
);

export default AdminView;


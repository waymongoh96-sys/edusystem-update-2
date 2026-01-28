import React, { useState } from 'react';
import { Palette, ShieldAlert, Plus, Trash2, CheckCircle2, ListChecks, Calendar, Clock, Upload, X } from 'lucide-react';
import { SystemSettings, Holiday, User } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface SettingsProps {
  settings: SystemSettings;
  currentUser: User | null; 
}

const SettingsView: React.FC<SettingsProps> = ({ settings, currentUser }) => {
  const [newHoliday, setNewHoliday] = useState({ date: '', description: '' });
  const [newLabel, setNewLabel] = useState({ key: '' as keyof SystemSettings, val: '' });
  
  // --- NEW: Bulk Import State ---
  const [isBulkHolidayImporting, setIsBulkHolidayImporting] = useState(false);
  const [bulkHolidayData, setBulkHolidayData] = useState('');

  const themes = [
    { name: 'Default Blue', color: 'blue', hex: '#2563eb' },
    { name: 'Emerald Green', color: 'emerald', hex: '#059669' },
    { name: 'Midnight Indigo', color: 'indigo', hex: '#4f46e5' },
    { name: 'Sunset Orange', color: 'orange', hex: '#ea580c' }
  ];

  const updateSettings = async (key: keyof SystemSettings, val: any) => {
    if (!currentUser) return;
    const updated = { ...settings, [key]: val };
    await setDoc(doc(db, 'user_settings', currentUser.id), updated);
  };

  const addItem = (key: keyof SystemSettings) => {
    if (!newLabel.val.trim()) return;
    const list = settings[key] as string[];
    updateSettings(key, [...list, newLabel.val]);
    setNewLabel({ key: '' as any, val: '' });
  };

  const addHoliday = () => {
    if (!newHoliday.date || !newHoliday.description.trim()) return;
    const h: Holiday = { id: Date.now().toString(), ...newHoliday };
    updateSettings('holidays', [...settings.holidays, h]);
    setNewHoliday({ date: '', description: '' });
  };

  // --- NEW: Bulk Import Logic ---
  const handleBulkHolidayImport = () => {
    if (!bulkHolidayData.trim()) return;
    
    const lines = bulkHolidayData.split('\n');
    const newHolidays: Holiday[] = [];
    
    lines.forEach((line) => {
      // Expect format: YYYY-MM-DD, Description
      const parts = line.split(',');
      if (parts.length >= 2) {
        const date = parts[0].trim();
        const description = parts.slice(1).join(',').trim(); // Join rest in case desc has commas
        
        if (date && description) {
           newHolidays.push({
             id: `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
             date,
             description
           });
        }
      }
    });

    if (newHolidays.length > 0) {
      updateSettings('holidays', [...settings.holidays, ...newHolidays]);
      setBulkHolidayData('');
      setIsBulkHolidayImporting(false);
      alert(`Successfully added ${newHolidays.length} holidays.`);
    } else {
      alert("No valid holidays found. Format: YYYY-MM-DD, Description");
    }
  };

  const removeItem = (key: keyof SystemSettings, index: number) => {
    const list = settings[key] as any[];
    updateSettings(key, list.filter((_, i) => i !== index));
  };

  const toggleDay = (day: string) => {
    const current = settings.workingDays || [];
    const updated = current.includes(day) 
      ? current.filter(d => d !== day) 
      : [...current, day];
    const sorted = DAYS_OF_WEEK.filter(d => updated.includes(d));
    updateSettings('workingDays', sorted);
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="border-b border-slate-200 pb-10">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">Infrastructure</h1>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Environment Controls</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        {/* Dynamic Timetable Config */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
           <div className="flex items-center gap-4 mb-10">
              <div className="p-4 theme-light-bg rounded-3xl">
                <Clock className="w-8 h-8 theme-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">Dynamic Timetable</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calendar Grid Rules</p>
              </div>
           </div>

           <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Active Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button 
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${
                        (settings.workingDays || []).includes(day) 
                          ? 'theme-bg text-white theme-border shadow-md' 
                          : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                      }`}
                    >
                      {day.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Start Hour (24h)</label>
                  <input 
                    type="number" min="0" max="23"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm"
                    value={settings.startHour}
                    onChange={e => updateSettings('startHour', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">End Hour (24h)</label>
                  <input 
                    type="number" min="1" max="24"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm"
                    value={settings.endHour}
                    onChange={e => updateSettings('endHour', parseInt(e.target.value))}
                  />
                </div>
              </div>
           </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
           <div className="flex items-center gap-4 mb-10">
              <div className="p-4 theme-light-bg rounded-3xl">
                <Palette className="w-8 h-8 theme-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">Visual Identity</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interface Skin</p>
              </div>
           </div>

           <div className="grid grid-cols-1 gap-4">
              {themes.map(t => (
                <button
                 key={t.color}
                 onClick={() => updateSettings('themeColor', t.color)}
                 className={`w-full flex items-center justify-between p-6 rounded-[2rem] border-4 transition-all ${
                   settings.themeColor === t.color ? 'theme-border bg-slate-50 shadow-md' : 'border-transparent bg-slate-50 hover:bg-slate-100'
                 }`}
                >
                  <div className="flex items-center gap-6">
                     <div className="w-12 h-12 rounded-2xl shadow-lg border-4 border-white" style={{ backgroundColor: t.hex }} />
                     <span className="font-black text-slate-800 uppercase tracking-widest text-xs">{t.name}</span>
                  </div>
                  {settings.themeColor === t.color && <CheckCircle2 className="w-8 h-8 theme-primary" />}
                </button>
              ))}
           </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
           <div className="flex items-center gap-4 mb-10">
              <div className="p-4 theme-light-bg rounded-3xl">
                <ShieldAlert className="w-8 h-8 theme-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">Taxonomy</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Classification</p>
              </div>
           </div>

           <div className="space-y-10">
              {(['lessonCategories', 'taskCategories', 'absentReasons'] as const).map(key => (
                <div key={key} className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{key.replace(/([A-Z])/g, ' $1')}</label>
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-xs" 
                      value={newLabel.key === key ? newLabel.val : ''} 
                      onChange={e => setNewLabel({ key, val: e.target.value })} 
                      placeholder={`New ${key.slice(0, -1)}...`} 
                    />
                    <button onClick={() => addItem(key)} className="theme-bg text-white p-4 rounded-2xl"><Plus className="w-5 h-5" /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {settings[key].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 group">
                        {item}
                        <button onClick={() => removeItem(key, i)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200 xl:col-span-2">
           <div className="flex items-center justify-between mb-10">
             <div className="flex items-center gap-4">
                <div className="p-4 bg-red-50 rounded-3xl">
                  <Calendar className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Academic Calendar</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Holiday Schedule</p>
                </div>
             </div>
             <button onClick={() => setIsBulkHolidayImporting(true)} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-200 transition-all">
                <Upload className="w-4 h-4" /> Bulk Upload
             </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Effective Date</label>
                <input type="date" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} />
              </div>
              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label>
                <input className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold" placeholder="e.g. Lunar New Year" value={newHoliday.description} onChange={e => setNewHoliday({...newHoliday, description: e.target.value})} />
              </div>
              <div className="md:col-span-1 flex items-end">
                <button onClick={addHoliday} className="w-full theme-bg text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Add Holiday</button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {settings.holidays.map((h, i) => (
                <div key={h.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between group">
                  <div>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">{h.date}</p>
                    <p className="text-sm font-bold text-slate-800">{h.description}</p>
                  </div>
                  <button onClick={() => removeItem('holidays', i)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
              {settings.holidays.length === 0 && <p className="col-span-full py-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50">No holidays scheduled</p>}
           </div>
        </div>
      </div>

      {/* --- BULK IMPORT MODAL --- */}
      {isBulkHolidayImporting && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[3rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-black text-slate-800">Bulk Holiday Import</h2>
               <button onClick={() => setIsBulkHolidayImporting(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
             </div>
             
             <div className="space-y-4">
                <p className="text-xs text-slate-500">Format each line as: <span className="font-mono bg-slate-100 px-1 rounded">YYYY-MM-DD, Holiday Name</span></p>
                <textarea 
                  className="w-full h-60 border border-slate-200 bg-slate-50 rounded-3xl p-5 font-mono text-sm outline-none focus:border-slate-400 transition-colors resize-none" 
                  value={bulkHolidayData} 
                  onChange={e => setBulkHolidayData(e.target.value)} 
                  placeholder={`2024-01-01, New Year's Day\n2024-02-10, Chinese New Year\n2024-08-31, Merdeka Day`} 
                />
                <button onClick={handleBulkHolidayImport} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                  Import Holidays
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;

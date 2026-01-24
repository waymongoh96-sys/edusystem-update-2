
import React, { useState } from 'react';
import { Palette, ShieldAlert, Plus, Trash2, CheckCircle2, ListChecks, Calendar } from 'lucide-react';
import { SystemSettings, Holiday } from '../types';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface SettingsProps {
  settings: SystemSettings;
}

const SettingsView: React.FC<SettingsProps> = ({ settings }) => {
  const [newHoliday, setNewHoliday] = useState({ date: '', description: '' });
  const [newLabel, setNewLabel] = useState({ key: '' as keyof SystemSettings, val: '' });

  const themes = [
    { name: 'Default Blue', color: 'blue', hex: '#2563eb' },
    { name: 'Emerald Green', color: 'emerald', hex: '#059669' },
    { name: 'Midnight Indigo', color: 'indigo', hex: '#4f46e5' },
    { name: 'Sunset Orange', color: 'orange', hex: '#ea580c' }
  ];

  const updateSettings = async (key: keyof SystemSettings, val: any) => {
    const updated = { ...settings, [key]: val };
    await setDoc(doc(db, 'config', 'settings'), updated);
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

  const removeItem = (key: keyof SystemSettings, index: number) => {
    const list = settings[key] as any[];
    updateSettings(key, list.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="border-b border-slate-200 pb-10">
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">Infrastructure</h1>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Environment Controls</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
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
           <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-red-50 rounded-3xl">
                <Calendar className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">Academic Calendar</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Holiday Schedule</p>
              </div>
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
    </div>
  );
};

export default SettingsView;

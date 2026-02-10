import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { 
  Building2, 
  Edit3, 
  Trash2, 
  Plus, 
  Hash, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  X 
} from 'lucide-react';
import Notification from './Notification.jsx';
export default function Workspace() {
  const { lang, t } = useLanguage();
  const { user, token } = useAuth();
  const isArabic = lang === 'ar';
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [isDeleteWorkspaceModalOpen, setIsDeleteWorkspaceModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [notifications, setNotifications] = useState([]);
  const authHeaders = useCallback(() => ({
    'Accept-Language': lang,
    ...(token && { Authorization: `Bearer ${token}` }),
  }), [lang, token]);
  const addNotification = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeNotification(id), duration);
  }, []);
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  useEffect(() => {
    if (!loading && workspace) {
      const ctx = gsap.context(() => {
        gsap.from(".animate-header", { y: -20, opacity: 0, duration: 0.8, ease: "power4.out" });
        gsap.from(".animate-card", { 
          y: 30, 
          opacity: 0, 
          duration: 1, 
          stagger: 0.2, 
          ease: "expo.out",
          delay: 0.2 
        });
      }, containerRef);
      return () => ctx.revert();
    }
  }, [loading, workspace]);
  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/workspaces', { headers: authHeaders() });
        if (!res.ok) throw new Error('Failed to fetch workspaces');
        const data = await res.json();
        if (!data.workspaces || data.workspaces.length === 0) {
          setWorkspace(null);
          return;
        }
        const activeWs = data.workspaces.find(w => w.is_default) || data.workspaces[0];
        const detailsRes = await fetch(`/api/workspaces/${activeWs.id}`, { headers: authHeaders() });
        const details = await detailsRes.json();
        setWorkspace(details.workspace);
      } catch (err) {
        addNotification(err.message, 'error');
        setWorkspace(null);
      } finally { setLoading(false); }
    };
    if (user && token) fetchWorkspace();
  }, [user, token, lang, authHeaders, addNotification]);
  const handleNameEdit = async () => {
    if (!tempName.trim()) return addNotification('Name required', 'error');
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tempName }),
      });
      if (!res.ok) throw new Error('Update failed');
      const data = await res.json();
      setWorkspace({ ...workspace, name: data.name });
      setIsEditingName(false);
      addNotification(t('Workspace name updated'), 'success');
    } catch (err) { addNotification(err.message, 'error'); } 
    finally { setSaving(false); }
  };
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName, isDefault: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkspace(data.workspace);
      setIsCreateModalOpen(false);
      addNotification('Workspace created!', 'success');
    } catch (err) { addNotification(err.message, 'error'); } 
    finally { setSaving(false); }
  };
  const handleDeleteWorkspaceConfirmed = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      addNotification('Workspace deleted', 'success');
      setTimeout(() => window.location.href = '/dashboard', 1000);
    } catch (err) { addNotification('Delete failed', 'error'); }
  };
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="w-16 h-16 bg-black rounded-2xl"
      />
    </div>
  );
  return (
    <div ref={containerRef} dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[#FDFDFD] pb-20">
      {}
      <div className="fixed right-6 top-6 z-[100] space-y-3 max-w-md">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div key={n.id} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }}>
              <Notification message={n.message} type={n.type} onClose={() => removeNotification(n.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="max-w-7xl mx-auto px-6 pt-12">
        {}
        <header className="animate-header flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-black rounded-lg text-white">
                <Building2 size={20} />
              </div>
              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-black/40">
                {t('System OS')}
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-black uppercase italic">
              {t('Workspace')}
            </h1>
          </div>
          {!workspace && (
             <button
              onClick={() => setIsCreateModalOpen(true)}
              className="group flex items-center gap-3 bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.1)]"
            >
              <Plus size={20} />
              {t('Create Workspace')}
            </button>
          )}
        </header>
        {workspace && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {}
            <div className="animate-card lg:col-span-2 space-y-8">
              <div className="bg-white border border-black/5 rounded-[2.5rem] p-8 md:p-12 shadow-[0_40px_80px_rgba(0,0,0,0.03)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                  <Building2 size={200} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <label className="text-[10px] font-black tracking-[0.2em] uppercase text-black/30">
                      {t('Workspace Identity')}
                    </label>
                    <div className="h-px flex-1 bg-black/5 mx-4" />
                  </div>
                  {isEditingName ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <input
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        className="w-full text-3xl md:text-4xl font-bold bg-zinc-50 border-2 border-black rounded-2xl px-6 py-4 focus:outline-none"
                        autoFocus
                      />
                      <div className="flex gap-3">
                        <button onClick={handleNameEdit} className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform">
                          {t('Save Changes')}
                        </button>
                        <button onClick={() => setIsEditingName(false)} className="px-8 py-3 border border-black/10 rounded-xl font-bold hover:bg-zinc-50 transition-colors">
                          {t('Cancel')}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <h2 className="text-4xl md:text-5xl font-black text-black tracking-tight uppercase">
                        {workspace.name}
                      </h2>
                      <button 
                        onClick={() => { setIsEditingName(true); setTempName(workspace.name); }}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-black hover:text-white rounded-xl font-bold transition-all"
                      >
                        <Edit3 size={16} />
                        {t('Rename')}
                      </button>
                    </div>
                  )}
                  <div className="mt-12 p-6 bg-zinc-50 rounded-2xl border border-black/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-black/40 uppercase block mb-1">{t('Technical ID')}</span>
                      <code className="text-sm font-mono font-bold text-black/70 select-all">{workspace.id}</code>
                    </div>
                    <Hash size={24} className="text-black/10" />
                  </div>
                </div>
              </div>
              {}
              <div className="animate-card bg-zinc-950 text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <Info size={20} className="text-white/40" />
                  {t('Management Protocol')}
                </h3>
                <div className="space-y-6 text-white/60 leading-relaxed">
                  <p>{t('workspaceSettingsDescription')}</p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      'Reflect team branding',
                      'Access API integration',
                      'Manage team history',
                      'System-wide invitations'
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 size={16} className="text-white shrink-0 mt-0.5" />
                        {t(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            {}
            <div className="animate-card space-y-8">
              <div className="bg-red-50 border border-red-100 rounded-[2.5rem] p-8 md:p-10">
                <div className="p-3 bg-red-600 text-white w-fit rounded-xl mb-6 shadow-lg shadow-red-200">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-2xl font-black text-red-950 uppercase mb-4 tracking-tight">
                  {t('Danger Zone')}
                </h3>
                <p className="text-red-900/70 text-sm mb-8 font-medium leading-relaxed">
                  {t('workspaceDeletionWarning')}
                </p>
                <button
                  onClick={() => setIsDeleteWorkspaceModalOpen(true)}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-100 active:scale-95"
                >
                  {t('Delete Workspace')}
                </button>
              </div>
              <div className="bg-white border border-black/5 rounded-[2.5rem] p-8 text-center">
                 <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-black/20">
                    <Building2 size={32} />
                 </div>
                 <p className="text-xs font-bold text-black/40 uppercase">{t('Created On')}</p>
                 <p className="font-bold text-black">{new Date(workspace.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      {}
      <AnimatePresence>
        {}
        {isDeleteWorkspaceModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDeleteWorkspaceModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
              <div className="text-center">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={40} />
                </div>
                <h3 className="text-3xl font-black text-black uppercase tracking-tighter mb-4">{t('Confirm Deletion')}</h3>
                <p className="text-zinc-500 mb-8 font-medium">
                  {t('This will permanently delete the workspace and all related data.')}
                  <span className="block text-red-600 font-bold mt-2 uppercase text-xs tracking-widest">{t('Action is Irreversible')}</span>
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={handleDeleteWorkspaceConfirmed} className="py-4 bg-red-600 text-white rounded-2xl font-bold uppercase hover:bg-red-700 transition-all shadow-xl">
                    {t('Yes, Delete Everything')}
                  </button>
                  <button onClick={() => setIsDeleteWorkspaceModalOpen(false)} className="py-4 bg-zinc-100 text-black rounded-2xl font-bold uppercase hover:bg-zinc-200 transition-all">
                    {t('Abort Mission')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
               <div className="p-10 md:p-14">
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h3 className="text-4xl font-black text-black uppercase tracking-tighter italic">{t('Initialize')}</h3>
                      <p className="text-black/40 font-bold uppercase text-[10px] tracking-[0.2em]">{t('New Workspace Protocol')}</p>
                    </div>
                    <button onClick={() => setIsCreateModalOpen(false)} className="p-3 bg-zinc-100 rounded-full hover:bg-black hover:text-white transition-all">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-4 block">
                        {t('Workspace Designation')}
                      </label>
                      <input
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        className="w-full text-2xl font-bold bg-zinc-50 border-b-4 border-black px-0 py-4 focus:outline-none focus:bg-zinc-100 transition-all"
                        placeholder={t('e.g., Alpha Team')}
                      />
                    </div>
                    <button
                      onClick={handleCreateWorkspace}
                      disabled={saving || !newWorkspaceName.trim()}
                      className="w-full py-6 bg-black text-white rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-2xl"
                    >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : t('Create Workspace')}
                    </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
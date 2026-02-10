import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { 
  User, Edit3, Trash2, UserRoundPlus, Search, 
  ChevronLeft, ChevronRight, MoreVertical, Mail, ShieldCheck, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import Notification from './Notification.jsx';
const StaffCard = memo(({ member, t, onEdit, onDelete, isOpen, toggleMenu }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="staff-card group bg-white border border-black/5 p-8 rounded-[2.5rem] relative hover:shadow-2xl transition-all duration-500"
  >
    <div className="absolute top-6 right-6">
      <button 
        onClick={() => toggleMenu(isOpen ? null : member.id)}
        className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-black/30" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 mt-2 w-40 bg-white border border-black/5 shadow-2xl rounded-2xl overflow-hidden z-20"
          >
            <button onClick={() => onEdit(member)} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-zinc-50">
              <Edit3 size={14} /> {t('Edit')}
            </button>
            <button onClick={() => onDelete(member.id)} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50">
              <Trash2 size={14} /> {t('Delete')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    <div className="w-20 h-20 bg-zinc-950 rounded-3xl flex items-center justify-center mb-6 rotate-3 group-hover:rotate-0 transition-transform duration-500 shadow-xl">
      <User className="w-10 h-10 text-white" />
    </div>
    <h3 className="text-2xl font-black text-black tracking-tight mb-1 truncate">{member.name || 'Unnamed'}</h3>
    <div className="flex items-center gap-2 text-black/40 mb-6">
      <Mail size={12} />
      <span className="text-xs font-bold truncate">{member.email}</span>
    </div>
    <div className="pt-6 border-t border-black/5 flex items-center justify-between">
      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${member.role === 'manager' ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-black/60'}`}>
        {member.role || 'Staff'}
      </span>
      {member.role === 'manager' && <ShieldCheck size={16} className="text-blue-600" />}
    </div>
  </motion.div>
));
export default function StaffManagement() {
  const { user, token } = useAuth();
  const { lang, t } = useLanguage();
  const isArabic = lang === 'ar';
  const containerRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMemberId, setDeletingMemberId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openMenuId, setOpenMenuId] = useState(null);
  const authHeaders = useMemo(() => ({
    'Accept-Language': lang,
    ...(token && { Authorization: `Bearer ${token}` }),
    'Content-Type': 'application/json'
  }), [lang, token]);
  const addNotification = useCallback((message, type = 'success') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  }, []);
  useEffect(() => {
    if (!loading && workspace) {
      const ctx = gsap.context(() => {
        gsap.from(".animate-title", { opacity: 0, x: -30, duration: 0.8, ease: "power3.out" });
        gsap.from(".animate-controls", { opacity: 0, y: 20, duration: 0.8, delay: 0.2, ease: "power3.out" });
      }, containerRef);
      return () => ctx.revert();
    }
  }, [loading, workspace]);
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !token) return;
      try {
        setLoading(true);
        const res = await fetch('/api/workspaces', { headers: authHeaders });
        const data = await res.json();
        if (!data.workspaces?.length) return setLoading(false);
        const active = data.workspaces.find((w) => w.is_default) || data.workspaces[0];
        const detailsRes = await fetch(`/api/workspaces/${active.id}`, { headers: authHeaders });
        const details = await detailsRes.json();
        setWorkspace(details.workspace);
        setStaffMembers(details.members?.filter((m) => m.type === 'user') || []);
      } catch (err) {
        addNotification(err.message || 'Failed to load team data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authHeaders, user, token, addNotification]);
  const filteredAndSortedStaff = useMemo(() => {
    let result = [...staffMembers];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(m => 
        (m.name || '').toLowerCase().includes(term) || (m.email || '').toLowerCase().includes(term)
      );
    }
    result.sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'role') {
        const order = { manager: 1, staff: 2, user: 3 };
        return (order[a.role?.toLowerCase()] || 99) - (order[b.role?.toLowerCase()] || 99);
      }
      return 0;
    });
    return result;
  }, [staffMembers, searchTerm, sortBy]);
  const totalPages = Math.ceil(filteredAndSortedStaff.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedStaff.slice(start, start + itemsPerPage);
  }, [filteredAndSortedStaff, currentPage, itemsPerPage]);
  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const openAddModal = () => {
    setFormData({ name: '', email: '', password: '', role: 'staff' });
    setEditingMember(null);
    setActiveModal('add');
  };
  const openEditModal = useCallback((member) => {
    setEditingMember(member);
    setFormData({ name: member.name || '', email: member.email || '', password: '', role: member.role || 'staff' });
    setActiveModal('edit');
    setOpenMenuId(null);
  }, []);
  const openDeleteModal = useCallback((id) => {
    setDeletingMemberId(id);
    setActiveModal('delete');
    setOpenMenuId(null);
  }, []);
  const handleSaveStaff = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const url = editingMember 
        ? `/api/workspaces/${workspace.id}/members/${editingMember.id}` 
        : `/api/workspaces/${workspace.id}/staff`;
      const res = await fetch(url, {
        method: editingMember ? 'PUT' : 'POST',
        headers: authHeaders,
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');
      const savedMember = data.member || data.user || data;
      setStaffMembers(prev => editingMember 
        ? prev.map(m => m.id === editingMember.id ? savedMember : m) 
        : [...prev, savedMember]
      );
      addNotification(editingMember ? t('Staff Updated') : t('Staff Created'), 'success');
      setActiveModal(null);
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteStaffConfirmed = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/members/${deletingMemberId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) throw new Error();
      setStaffMembers(prev => prev.filter(m => m.id !== deletingMemberId));
      addNotification(t('Member removed'), 'success');
    } catch (err) {
      addNotification(t('Delete failed'), 'error');
    } finally {
      setActiveModal(null);
    }
  };
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-12 h-12 border-t-4 border-black rounded-full" />
    </div>
  );
  return (
    <div ref={containerRef} dir={isArabic ? 'rtl' : 'ltr'} className="px-6 py-12 max-w-7xl mx-auto">
      {}
      <div className="fixed right-6 top-6 z-[100] space-y-3">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div key={n.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Notification message={n.message} type={n.type} onClose={() => setNotifications(p => p.filter(x => x.id !== n.id))} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="animate-title">
          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-black/40 mb-2">{workspace?.name}</p>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-black uppercase italic">{t('Manage Staff')}</h1>
        </div>
        <button
          onClick={openAddModal}
          className="animate-title group flex items-center gap-3 bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl active:scale-95"
        >
          <UserRoundPlus className="w-5 h-5" />
          {t('Add Member')}
        </button>
      </div>
      {}
      <div className="animate-controls flex flex-col md:flex-row gap-4 mb-10 bg-white p-4 rounded-[2rem] border border-black/5 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("Search by name or email...")}
            className="w-full pl-12 pr-6 py-4 bg-zinc-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-medium"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-6 py-4 bg-zinc-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 font-bold uppercase text-xs tracking-widest cursor-pointer"
        >
          <option value="name-asc">A-Z</option>
          <option value="name-desc">Z-A</option>
          <option value="role">By Role</option>
        </select>
      </div>
      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {currentItems.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              t={t}
              isOpen={openMenuId === member.id}
              toggleMenu={setOpenMenuId}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
          ))}
        </AnimatePresence>
      </div>
      {}
      {totalPages > 1 && (
        <div className="mt-16 flex flex-col md:flex-row items-center justify-between bg-white p-6 rounded-3xl border border-black/5 gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-black uppercase tracking-widest">{t('Items per page')}</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-zinc-100 px-3 py-1 rounded-lg text-sm font-bold"
            >
              {[5, 10, 20, 50].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-6">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-3 hover:bg-zinc-100 rounded-xl disabled:opacity-20 transition-all"><ChevronLeft /></button>
            <span className="text-xs font-black uppercase tracking-[0.2em]">{t('Page')} {currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-3 hover:bg-zinc-100 rounded-xl disabled:opacity-20 transition-all"><ChevronRight /></button>
          </div>
        </div>
      )}
      {}
      <AnimatePresence>
        {(activeModal === 'add' || activeModal === 'edit') && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-3xl font-black uppercase italic">{editingMember ? t('Update Staff') : t('Add Staff')}</h3>
                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-all"><X /></button>
              </div>
              <form onSubmit={handleSaveStaff} className="space-y-6 text-black">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/30 block mb-2">{t('Full Name')} *</label>
                  <input name="name" value={formData.name} onChange={handleInputChange} className="w-full px-6 py-4 bg-zinc-50 rounded-2xl focus:ring-2 focus:ring-black/5 outline-none font-bold border border-transparent focus:border-black/10" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/30 block mb-2">{t('Email Address')} *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-6 py-4 bg-zinc-50 rounded-2xl focus:ring-2 focus:ring-black/5 outline-none font-bold border border-transparent focus:border-black/10" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/30 block mb-2">{editingMember ? t('New Password (Optional)') : t('Password *')}</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full px-6 py-4 bg-zinc-50 rounded-2xl focus:ring-2 focus:ring-black/5 outline-none font-bold border border-transparent focus:border-black/10" placeholder={editingMember ? "••••••••" : "Min 6 chars"} required={!editingMember} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/30 block mb-2">{t('Role')} *</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} className="w-full px-6 py-4 bg-zinc-50 rounded-2xl border-none font-bold uppercase text-xs tracking-widest cursor-pointer">
                    <option value="staff">Staff Member</option>
                    <option value="manager">Lead Manager</option>
                  </select>
                </div>
                <button disabled={saving} className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl flex items-center justify-center gap-3">
                  {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingMember ? t('Save Changes') : t('Create Member'))}
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {activeModal === 'delete' && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white rounded-[3rem] p-12 text-center max-w-md">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={40} /></div>
              <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter text-black">{t('Remove Member?')}</h3>
              <p className="text-zinc-500 font-medium mb-10">{t('This action cannot be undone and access will be revoked.')}</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleDeleteStaffConfirmed} className="py-4 bg-red-600 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-red-700 transition-all">{t('Confirm Removal')}</button>
                <button onClick={() => setActiveModal(null)} className="py-4 bg-zinc-100 text-black rounded-2xl font-black uppercase hover:bg-zinc-200 transition-all">{t('Cancel')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
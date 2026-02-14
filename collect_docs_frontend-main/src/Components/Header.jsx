import { useEffect, useState, useRef, useCallback, forwardRef, useMemo, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Users, Package, MessageSquare, UserCog, Building2, LogOut, X, Menu } from 'lucide-react';
import { gsap } from 'gsap';
import Notification from './Dashboard/Notification.jsx';

// 1. Memoize NavTab to prevent it from re-rendering when you type in the profile form
const NavTab = memo(forwardRef(({ to, icon, label, active, isArabic }, ref) => {
  const navigate = useNavigate();
  return (
    <button
      ref={ref}
      onClick={() => navigate(to)}
      className={`
        w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group
        ${isArabic ? 'flex-row-reverse text-right' : 'text-left'}
        ${active ? 'bg-white text-black shadow-xl scale-[1.02]' : 'text-white/40 hover:text-white hover:bg-white/5'}
      `}
    >
      <span className={`${active ? 'text-black' : 'text-white/40 group-hover:text-white transition-colors'}`}>
        {icon}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] flex-1">{label}</span>
      {active && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
    </button>
  );
}));

export default function Header() {
  const { user, logout, updateUser, token } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1280);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [formErrors, setFormErrors] = useState({});

  const sidebarRef = useRef(null);
  const navLinksRef = useRef([]);
  const overlayRef = useRef(null);

  const isArabic = lang === 'ar';
  const direction = isArabic ? 'rtl' : 'ltr';

  // 2. Optimized Resize: Uses a debounce to prevent 100s of state updates during drag
  useEffect(() => {
    let timeoutId = null;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const desktop = window.innerWidth > 1280;
        setIsDesktop(desktop);
        if (desktop) setIsMobileMenuOpen(false);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    document.documentElement.dir = direction;
    document.documentElement.lang = lang;
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [direction, lang]);

  // 3. Animation Performance: Use hardware acceleration (will-change)
  useEffect(() => {
    if (isDesktop) return;
    if (isMobileMenuOpen) {
      gsap.to(sidebarRef.current, { x: 0, duration: 0.5, ease: "power4.out" });
      gsap.to(overlayRef.current, { opacity: 1, pointerEvents: "auto", duration: 0.3 });
      gsap.fromTo(navLinksRef.current.filter(Boolean), 
        { x: isArabic ? 30 : -30, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.05, duration: 0.4, ease: "back.out(1.7)", delay: 0.1 }
      );
    } else {
      gsap.to(sidebarRef.current, { x: isArabic ? "100%" : "-100%", duration: 0.4, ease: "power2.in" });
      gsap.to(overlayRef.current, { opacity: 0, pointerEvents: "none", duration: 0.3 });
    }
  }, [isMobileMenuOpen, isDesktop, isArabic]);

  const showNotif = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const handleLogout = useCallback(() => {
    gsap.to("body", { opacity: 0, duration: 0.3, onComplete: () => {
      logout();
      navigate('/', { replace: true });
    }});
  }, [logout, navigate]);

  const openProfileModal = () => {
    setFormData({ name: user?.name || '', email: user?.email || '', password: '', confirmPassword: '' });
    setFormErrors({});
    setShowProfileModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name.trim()) errors.name = t('Name required');
    if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = t('Invalid email');
    if (formData.password && formData.password.length < 6) errors.password = t('Min 6 chars');
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = t('Mismatch');
    if (Object.keys(errors).length > 0) return setFormErrors(errors);

    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          ...(formData.password && { password: formData.password })
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      updateUser?.({ ...user, name: data.name, email: data.email });
      showNotif(t('Profile updated!'));
      setShowProfileModal(false);
    } catch (err) {
      showNotif(err.message, 'error');
    } finally { setLoading(false); }
  };

  const displayName = useMemo(() => 
    user?.name?.trim() || user?.email?.split('@')[0] || 'User', 
  [user]);

  const isClient = user?.userType === 'client' || user?.role === 'user';

  return (
    <>
      {!isDesktop && (
        <header className="fixed top-0 inset-x-0 z-[60] bg-black/90 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white flex items-center justify-center font-black text-black italic">D</div>
            <span className="font-bold tracking-tighter uppercase text-sm text-white">CollectDocs.</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2 active:scale-90 transition-transform">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>
      )}

      <div 
        ref={overlayRef}
        onClick={() => setIsMobileMenuOpen(false)}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] opacity-0 pointer-events-none lg:hidden will-change-opacity"
      />

      <aside
        ref={sidebarRef}
        dir={direction}
        className={`
          fixed inset-y-0 z-[80] w-72 xl:w-80 bg-[#080808] border-white/5 flex flex-col shadow-2xl will-change-transform
          ${isArabic ? 'border-l' : 'border-r'}
          ${isDesktop ? 'translate-x-0' : isArabic ? 'translate-x-full' : '-translate-x-full'}
        `}
      >
        <div className="p-8 pb-10">
          <div className={`flex items-center gap-3 mb-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 bg-white flex items-center justify-center shadow-lg shadow-white/5">
              <span className="text-black font-black text-xl italic">D</span>
            </div>
            <div className={isArabic ? 'text-right' : 'text-left'}>
              <h1 className="text-lg font-black tracking-tighter uppercase leading-none text-white">CollectDocs.</h1>
              <span className="text-[10px] text-white/30 tracking-[0.3em] uppercase">Intelligence OS</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className={`text-[10px] uppercase tracking-[0.2em] text-white/20 mb-4 px-4 ${isArabic ? 'text-right' : ''}`}>
            {t('Navigation')}
          </div>
          {isClient ? (
            <NavTab ref={el => navLinksRef.current[0] = el} to="/client-dashboard" icon={<MessageSquare size={18} />} label={t('Document Requests')} active={location.pathname.includes('requests')} isArabic={isArabic} />
          ) : (
            <>
              <NavTab ref={el => navLinksRef.current[0] = el} to="/dashboard/clients" icon={<Users size={18} />} label={t('Clients')} active={location.pathname.includes('clients')} isArabic={isArabic} />
              <NavTab ref={el => navLinksRef.current[1] = el} to="/dashboard/bundles" icon={<Package size={18} />} label={t('Bundles')} active={location.pathname.includes('bundles')} isArabic={isArabic} />
              <NavTab ref={el => navLinksRef.current[2] = el} to="/dashboard/requests" icon={<MessageSquare size={18} />} label={t('Requests')} active={location.pathname.includes('requests')} isArabic={isArabic} />
              {user?.role === 'manager' && (
                <>
                  <div className={`pt-6 pb-2 px-4 text-[10px] uppercase tracking-[0.2em] text-white/20 ${isArabic ? 'text-right' : ''}`}>{t('System')}</div>
                  <NavTab ref={el => navLinksRef.current[3] = el} to="/dashboard/staff-manage" icon={<UserCog size={18} />} label={t('Staff')} active={location.pathname.includes('staff-manage')} isArabic={isArabic} />
                  <NavTab ref={el => navLinksRef.current[4] = el} to="/dashboard/workspace" icon={<Building2 size={18} />} label={t('Workspace')} active={location.pathname.includes('workspace')} isArabic={isArabic} />
                </>
              )}
            </>
          )}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5 bg-black/40">
          <div className="flex items-center justify-between mb-4 bg-white/5 rounded-lg p-1">
            <button onClick={() => setLang('en')} className={`flex-1 text-[10px] py-2 rounded font-bold transition-all ${lang === 'en' ? 'bg-white text-black' : 'text-white/40'}`}>EN</button>
            <button onClick={() => setLang('ar')} className={`flex-1 text-[10px] py-2 rounded font-bold transition-all ${lang === 'ar' ? 'bg-white text-black' : 'text-white/40'}`}>AR</button>
          </div>
          <div className={`flex items-center gap-3 p-2 bg-white/[0.03] border border-white/5 rounded-xl ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
            <button onClick={openProfileModal} className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white hover:bg-white hover:text-black transition-all shrink-0 active:scale-95">
              {displayName.charAt(0).toUpperCase()}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate uppercase text-white">{displayName}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-widest">{user?.role || 'User'}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-white/20 hover:text-red-500 transition-colors active:scale-90">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {isDesktop && <div className="w-72 xl:w-80 shrink-0" />}

      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}

      {showProfileModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" dir={direction}>
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-black tracking-tight text-black italic">{t('EDIT PROFILE')}</h2>
              <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-black transition-colors p-2"><X /></button>
            </div>
            <form onSubmit={handleProfileSubmit} className="p-8 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">{t('Full Name')}</label>
                <input name="name" value={formData.name} onChange={handleInputChange} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all text-black" />
                {formErrors.name && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase">{formErrors.name}</p>}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">{t('Email Address')}</label>
                <input name="email" value={formData.email} onChange={handleInputChange} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all text-black" />
                {formErrors.email && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase">{formErrors.email}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">{t('New Pass')}</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all text-black" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">{t('Confirm')}</label>
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all text-black" />
                </div>
              </div>
              <button disabled={loading} className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50 mt-4 shadow-xl active:scale-[0.98]">
                {loading ? t('Syncing...') : t('Save Changes')}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

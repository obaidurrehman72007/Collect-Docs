import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { gsap } from 'gsap';
import Lenis from 'lenis';
const VisualNoise = () => (
  <div className="fixed inset-0 pointer-events-none z-[50] opacity-[0.015] mix-blend-multiply">
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
  </div>
);
const ParallaxGrid = ({ gridRef }) => (
  <div 
    ref={gridRef}
    className="fixed inset-[-10%] z-0 pointer-events-none opacity-[0.08]" 
    style={{ 
      backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`, 
      backgroundSize: '50px 50px' 
    }} 
  />
);
const InputField = ({ label, type, value, onChange, dir, placeholder }) => (
  <div className="group flex flex-col w-full gap-1 reveal-element">
    <label className="text-[9px] uppercase tracking-[0.3em] text-neutral-400 font-bold px-1">
      {label}
    </label>
    <div className="relative overflow-hidden">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        placeholder={placeholder}
        className="w-full bg-transparent border-b border-neutral-200 text-black py-4 text-sm font-medium
                   focus:outline-none focus:border-black transition-colors duration-500
                   placeholder:text-neutral-300 placeholder:font-light"
      />
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-black group-focus-within:w-full transition-all duration-700 ease-in-out" />
    </div>
  </div>
);
export default function Login() {
  const { user, login, register } = useAuth();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const gridRef = useRef(null);
  const heroRef = useRef(null);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const isRTL = lang === 'ar';
  useEffect(() => {
    if (user) {
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        navigate(userData.userType === 'client' ? '/client-dashboard' : '/dashboard', { replace: true });
      }
    }
    const lenis = new Lenis();
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    const ctx = gsap.context(() => {
      gsap.from(".reveal-element", { y: 40, opacity: 0, duration: 1.2, stagger: 0.1, ease: "power4.out" });
      const handleMouseMove = (e) => {
        const xPos = (e.clientX / window.innerWidth - 0.5);
        const yPos = (e.clientY / window.innerHeight - 0.5);
        gsap.to(gridRef.current, { x: xPos * 40, y: yPos * 40, duration: 1.2 });
        gsap.to(heroRef.current, { x: xPos * -20, y: yPos * -20, duration: 1.2 });
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }, containerRef);
    return () => { lenis.destroy(); ctx.revert(); };
  }, [user, navigate]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const endpoint = mode === 'signin' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'signin' 
        ? { email: email.trim(), password } 
        : { name: name.trim(), email: email.trim(), password, workspaceName: workspace.trim() };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'AUTH_PROTOCOL_FAILED');
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      mode === 'signin' ? await login(data.token, data.user) : await register(data.token, data.user);
      navigate(data.user.userType === 'client' ? '/client-dashboard' : '/dashboard');
    } catch (err) {
      setError(err.message.toUpperCase());
      gsap.to(".login-card", { x: 10, repeat: 3, yoyo: true, duration: 0.05 });
    } finally {
      setSubmitting(false);
    }
  };
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResetError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setResetMessage(isRTL ? 'تم إرسال الرابط بنجاح' : 'Reset link dispatched.');
      } else {
        setResetError(data.message);
      }
    } catch (err) {
      setResetError('COMM_LINK_FAILURE');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div ref={containerRef} className="min-h-screen bg-[#FDFDFD] text-black selection:bg-black selection:text-white font-sans antialiased overflow-hidden">
      <VisualNoise />
      <ParallaxGrid gridRef={gridRef} />
      <div className="relative z-10 min-h-screen container mx-auto flex flex-col lg:flex-row items-center justify-between px-10">
        {}
        <div ref={heroRef} className="w-full lg:w-1/2 flex flex-col gap-6 py-20 lg:py-0" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="reveal-element flex items-center gap-3">
            <span className="h-[1px] w-12 bg-black"></span>
            <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40">System_v3.0.4</span>
          </div>
          <h1 className="reveal-element text-8xl lg:text-[10rem] font-black tracking-tighter leading-[0.8] uppercase italic">
            Collect<br />
            <span className="text-neutral-200 not-italic">Docs.</span>
          </h1>
          <p className="reveal-element max-w-sm text-[11px] font-bold leading-relaxed text-neutral-400 uppercase tracking-[0.1em]">
            {isRTL 
              ? 'تشفير شامل. بنية تحتية سحابية متطورة. إدارة الوثائق للمحترفين.' 
              : 'End-to-end encryption. Neural routing. Institutional grade document management.'}
          </p>
          <div className="reveal-element flex gap-6 mt-4">
            {['en', 'ar'].map((l) => (
              <button key={l} onClick={() => setLang(l)} 
                className={`text-[10px] font-black tracking-widest uppercase pb-1 border-b-2 transition-all 
                ${lang === l ? 'border-black opacity-100' : 'border-transparent opacity-20 hover:opacity-100'}`}>
                {l === 'en' ? 'English' : 'العربية'}
              </button>
            ))}
          </div>
        </div>
        {}
        <div className="w-full lg:w-[460px] pb-20 lg:pb-0">
          <main className="login-card reveal-element bg-white border border-neutral-100 p-10 lg:p-14 shadow-2xl shadow-neutral-200/40">
            <div className="flex flex-col mb-12">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-3xl font-black tracking-tighter uppercase">
                  {mode === 'signin' ? (isRTL ? 'تسجيل الدخول' : 'Authorize') : (isRTL ? 'إنشاء حساب' : 'Initialize')}
                </h2>
                <span className="text-[9px] font-mono opacity-20">REF: 00-142</span>
              </div>
              <div className="h-[1px] bg-neutral-100 w-full"></div>
            </div>
            {error && <div className="mb-6 py-3 px-4 bg-black text-white text-[9px] font-bold uppercase tracking-widest text-center">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                {mode === 'signup' && (
                  <>
                    <InputField label={isRTL ? "الاسم" : "Operator Name"} type="text" value={name} onChange={setName} placeholder="IDENTIFY" dir={isRTL ? 'rtl' : 'ltr'} />
                    <InputField label={isRTL ? "مساحة العمل" : "Workspace"} type="text" value={workspace} onChange={setWorkspace} placeholder="DOMAIN" dir={isRTL ? 'rtl' : 'ltr'} />
                  </>
                )}
                <InputField label={isRTL ? "البريد الإلكتروني" : "Email"} type="email" value={email} onChange={setEmail} placeholder="USER@ROOT" dir="ltr" />
                <InputField label={isRTL ? "كلمة المرور" : "Passkey"} type="password" value={password} onChange={setPassword} placeholder="••••••••" dir="ltr" />
              </div>
              <div className="pt-6 space-y-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-black text-white py-5 font-black uppercase tracking-[0.4em] text-[10px] hover:bg-neutral-800 transition-all active:scale-[0.98] disabled:opacity-20"
                >
                  {submitting ? 'EXECUTING...' : (isRTL ? 'دخول النظام' : 'Verify Access')}
                </button>
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                  <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="hover:text-neutral-400 transition-colors">
                    {mode === 'signin' ? (isRTL ? '> إنشاء حساب' : '> Create Account') : (isRTL ? '> العودة' : '> Back to Login')}
                  </button>
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="opacity-30 hover:opacity-100 transition-opacity">
                    {isRTL ? 'فقدت السر؟' : 'Recover'}
                  </button>
                </div>
              </div>
            </form>
          </main>
        </div>
      </div>
      {}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-500">
          <div className="bg-white border border-neutral-200 shadow-2xl max-w-sm w-full p-10 relative">
            <button onClick={() => setShowForgotPassword(false)} className="absolute top-6 right-6 text-xs font-black">CLOSE [X]</button>
            <h2 className="text-xl font-black uppercase tracking-tighter mb-8">{isRTL ? 'استعادة الوصول' : 'Access Recovery'}</h2>
            {resetMessage ? (
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">{resetMessage}</p>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-6">
                <InputField label="Recovery Email" type="email" value={resetEmail} onChange={setResetEmail} placeholder="USER@ROOT" />
                {resetError && <p className="text-[9px] font-bold text-red-500 uppercase">{resetError}</p>}
                <button className="w-full bg-black text-white py-4 text-[10px] font-black uppercase tracking-widest">Send Link</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
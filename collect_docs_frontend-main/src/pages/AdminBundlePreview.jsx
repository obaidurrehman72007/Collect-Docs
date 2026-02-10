import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, FileText, AlertCircle, ArrowLeft, CheckCircle, XCircle,
  RefreshCw, Download, X, FileCog, Eye, Check, Trash2, Info,Clock
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
const AdminBundlePreview = () => {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const previewUrlsRef = useRef({});
  const fetchBundleRequest = useCallback(async () => {
    if (!shareToken) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/bundle-requests/public/${shareToken}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      setData(result.data || result);
    } catch (err) {
      setError(err.message || t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [shareToken, token, t]);
  useEffect(() => { fetchBundleRequest(); }, [fetchBundleRequest]);
  const updateFieldStatus = useCallback(async (submissionId, status, reason = null) => {
    if (!data) return;
    setUpdating(prev => ({ ...prev, [submissionId]: status }));
    const previousData = data;
    setData(prev => ({
      ...prev,
      requirements: prev.requirements.map(req => ({
        ...req,
        submissions: req.submissions?.map(sub => 
          sub.id === submissionId ? { ...sub, status, rejection_reason: reason } : sub
        )
      }))
    }));
    try {
      const res = await fetch(`/api/bundle-requests/${data.id}/submission/${submissionId}/${status}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch (err) {
      setData(previousData);
      alert(t('updateFailed'));
    } finally {
      setUpdating(prev => {
        const next = { ...prev };
        delete next[submissionId];
        return next;
      });
    }
  }, [data, token, t]);
  const getFileTypeCategory = (filename = '') => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['mp4', 'webm'].includes(ext)) return 'video';
    if (['mp3', 'wav'].includes(ext)) return 'audio';
    return 'other';
  };
  const fileEntries = useMemo(() => {
    if (!data?.requirements) return [];
    return data.requirements.flatMap(req => 
      (req.submissions || []).map(file => ({ ...file, reqName: req.name, reqDesc: req.description }))
    );
  }, [data]);
  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-8">
      <div className="relative">
        <Loader2 className="w-16 h-16 animate-spin text-black" />
        <div className="absolute inset-0 blur-xl bg-black/10 animate-pulse" />
      </div>
      <p className="mt-6 font-black uppercase tracking-widest text-xs">{t('Initializing Review...')}</p>
    </div>
  );
  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b-4 border-black px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-3 bg-black text-white rounded-2xl hover:scale-110 transition-transform active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">
                {data?.bundle?.name || 'Review Bundle'}
              </h1>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-2">
                Token: {shareToken?.slice(0, 12)}...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-6 py-3 border-2 border-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
              data?.status === 'approved' ? 'bg-emerald-400' : data?.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'
            }`}>
              {data?.status || 'Pending'}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-12">
        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Total Files', value: fileEntries.length, icon: <FileText />, color: 'bg-blue-500' },
            { label: 'Approved', value: fileEntries.filter(f => f.status === 'approved').length, icon: <CheckCircle />, color: 'bg-emerald-500' },
            { label: 'Pending', value: fileEntries.filter(f => f.status !== 'approved' && f.status !== 'rejected').length, icon: <Clock />, color: 'bg-amber-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border-2 border-black p-6 rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-5">
              <div className={`${stat.color} p-4 rounded-2xl text-white border-2 border-black shadow-md`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black tracking-tighter">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
        {}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {fileEntries.map((file, idx) => {
              const category = getFileTypeCategory(file.file_name);
              const isUpdating = updating[file.id];
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={file.id}
                  className="group relative bg-white border-2 border-zinc-200 rounded-[2.5rem] overflow-hidden hover:border-black transition-all hover:shadow-[20px_20px_0px_0px_rgba(0,0,0,0.05)]"
                >
                  {}
                  <div className={`absolute top-4 right-4 z-10 px-3 py-1 rounded-full border-2 border-black text-[9px] font-black uppercase tracking-tighter shadow-sm ${
                    file.status === 'approved' ? 'bg-emerald-400' : file.status === 'rejected' ? 'bg-red-400' : 'bg-white'
                  }`}>
                    {file.status}
                  </div>
                  {}
                  <div 
                    onClick={() => setPreviewFile({ ...file, category })}
                    className="aspect-square bg-zinc-100 flex items-center justify-center cursor-pointer overflow-hidden relative group-hover:bg-zinc-200 transition-colors"
                  >
                    {category === 'image' && file.base64 ? (
                      <img src={file.base64} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="text-zinc-400 group-hover:text-black transition-colors flex flex-col items-center gap-3">
                        <FileCog size={48} strokeWidth={1.5} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{category}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="bg-white p-4 rounded-full shadow-xl transform scale-50 group-hover:scale-100 transition-transform">
                        <Eye className="text-black" />
                      </div>
                    </div>
                  </div>
                  {}
                  <div className="p-6">
                    <h4 className="font-black uppercase tracking-tighter text-sm truncate">{file.reqName}</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase truncate mt-1">{file.file_name}</p>
                    {file.status === 'rejected' && file.rejection_reason && (
                      <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
                        <p className="text-[9px] font-black text-red-800 uppercase tracking-widest mb-1">Feedback</p>
                        <p className="text-xs italic text-red-600 leading-tight">"{file.rejection_reason}"</p>
                      </div>
                    )}
                    {}
                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <button
                        onClick={() => updateFieldStatus(file.id, 'approved')}
                        disabled={isUpdating || file.status === 'approved'}
                        className="flex items-center justify-center gap-2 py-3 bg-zinc-100 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-30 group/btn"
                      >
                        {isUpdating === 'approved' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('Approve')}</span>
                      </button>
                      <button
                        onClick={() => { setCurrentSubmissionId(file.id); setShowRejectModal(true); }}
                        disabled={isUpdating || file.status === 'rejected'}
                        className="flex items-center justify-center gap-2 py-3 bg-zinc-100 rounded-2xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-30"
                      >
                        {isUpdating === 'rejected' ? <Loader2 size={16} className="animate-spin" /> : <X size={16} strokeWidth={3} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('Reject')}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>
      {}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRejectModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white border-4 border-black rounded-[3rem] p-10 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]"
            >
              <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">{t('Provide Feedback')}</h3>
              <p className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest mb-8">{t('Why is this document being rejected?')}</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Image is too blurry or document expired..."
                className="w-full h-40 bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] p-6 focus:border-black transition-colors outline-none font-medium resize-none"
              />
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-black hover:bg-zinc-50 transition-colors"
                >
                  {t('Cancel')}
                </button>
                <button 
                  disabled={!rejectReason.trim()}
                  onClick={() => {
                    updateFieldStatus(currentSubmissionId, 'rejected', rejectReason);
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="flex-1 py-5 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
                >
                  {t('Confirm Reject')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black p-4 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 opacity-40 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:40px_40px]" 
            />
            <motion.button 
              whileHover={{ rotate: 90 }}
              onClick={() => setPreviewFile(null)}
              className="absolute top-8 right-8 text-white z-20 bg-white/10 p-4 rounded-full backdrop-blur-md"
            >
              <X size={32} />
            </motion.button>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              className="relative w-full h-full bg-white rounded-[4rem] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="flex-1 bg-zinc-100 flex items-center justify-center p-8 overflow-hidden">
                {previewFile.category === 'image' ? (
                  <img src={previewFile.base64} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
                ) : previewFile.category === 'pdf' ? (
                  <iframe src={previewFile.base64} className="w-full h-full rounded-2xl border-none" />
                ) : (
                  <div className="flex flex-col items-center gap-6">
                    <FileCog size={120} className="text-zinc-300" />
                    <p className="font-black uppercase tracking-widest">{t('Preview not supported for this format')}</p>
                    <a href={previewFile.base64} download={previewFile.file_name} className="px-8 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3">
                      <Download size={18} /> {t('Download Original')}
                    </a>
                  </div>
                )}
              </div>
              <div className="bg-white border-t-2 border-black p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-black text-white rounded-3xl flex items-center justify-center">
                    <Info size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">{previewFile.reqName}</h3>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{previewFile.file_name}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <a 
                    href={previewFile.base64} 
                    download={previewFile.file_name}
                    className="px-10 py-5 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-colors"
                  >
                    {t('Download File')}
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default AdminBundlePreview;
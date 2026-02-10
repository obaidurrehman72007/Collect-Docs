import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  Loader2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Download,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
const translations = {
  en: {
    dashboard: "Dashboard",
    totalRequests: "Total Requests",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    submitted: "Submitted",
    completed: "Completed",
    noRequests: "No document requests found",
    noRequestsDesc:
      "You'll see your document requests here when we need something from you.",
    uploadDocuments: "Upload Documents",
    reuploadDocuments: "Re-upload Documents",
    preview: "Preview",
    rejectionReason: "Rejection reason:",
    rejectionFallback: "No rejection reason provided by admin",
    searchPlaceholder: "Search requests...",
    sortNewest: "Newest first",
    sortOldest: "Oldest first",
    sortStatus: "By status",
    changePassword: "Change Password",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    passwordMin: "Password must be at least 6 characters",
    passwordsNoMatch: "Passwords do not match",
    passwordSuccess: "Password changed successfully!",
    passwordError: "Failed to change password",
    loading: "Loading...",
    error: "Something went wrong",
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    approvedDocuments: "Approved Documents",
    rejectedDocuments: "Rejected Documents",
    pendingDocuments: "Pending Documents",
    noDocuments: "No documents",
    download: "Download",
  },
  ar: {
    dashboard: "لوحة التحكم",
    totalRequests: "إجمالي الطلبات",
    pending: "معلق",
    approved: "مقبول",
    rejected: "مرفوض",
    submitted: "تم التقديم",
    completed: "مكتمل",
    noRequests: "لم يتم العثور على طلبات وثائق",
    noRequestsDesc: "ستظهر طلبات الوثائق هنا عندما نحتاج شيئاً منك.",
    uploadDocuments: "رفع الوثائق",
    reuploadDocuments: "إعادة رفع الوثائق",
    preview: "معاينة",
    rejectionReason: "سبب الرفض:",
    rejectionFallback: "لم يتم تقديم سبب الرفض من قبل الإدارة",
    searchPlaceholder: "البحث في الطلبات...",
    sortNewest: "الأحدث أولاً",
    sortOldest: "الأقدم أولاً",
    sortStatus: "حسب الحالة",
    changePassword: "تغيير كلمة المرور",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور",
    saveChanges: "حفظ التغييرات",
    cancel: "إلغاء",
    passwordMin: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    passwordsNoMatch: "كلمتا المرور غير متطابقتين",
    passwordSuccess: "تم تغيير كلمة المرور بنجاح!",
    passwordError: "فشل تغيير كلمة المرور",
    loading: "جاري التحميل...",
    error: "حدث خطأ ما",
    previous: "السابق",
    next: "التالي",
    page: "صفحة",
    of: "من",
    approvedDocuments: "الوثائق المقبولة",
    rejectedDocuments: "الوثائق المرفوضة",
    pendingDocuments: "الوثائق المعلقة",
    noDocuments: "لا توجد وثائق",
    download: "تحميل",
  },
};
const ClientDashboard = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { token: authToken } = useAuth();
  const t = translations[lang] || translations.en;
  const isArabic = lang === "ar";
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [largePreview, setLargePreview] = useState(null);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const formatSafeDate = useCallback(
    (dateValue, fallback = "—") => {
      if (!dateValue) return fallback;
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return fallback;
      return date.toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    [isArabic],
  );
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const token = authToken || localStorage.getItem("auth_token");
      if (!token) throw new Error("No authentication token");
      const res = await fetch("/api/bundle-requests/client", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to load requests");
      }
      const data = await res.json();
      setRequests(data.bundleRequests || []);
    } catch (err) {
      console.error("Fetch requests error:", err);
      setMessage(err.message || t.error);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, [authToken, t]);
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);
  const openPreview = useCallback(
    async (request) => {
      try {
        setPreviewLoading(true);
        setPreviewOpen(true);
        setPreviewData(null);
        const token = authToken || localStorage.getItem("auth_token");
        const res = await fetch(
          `/api/bundle-requests/public/${request.share_token}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );
        if (!res.ok) throw new Error("Failed to load preview");
        const data = await res.json();
        setPreviewData(data.data || data);
      } catch (err) {
        setPreviewData({ error: err.message || t.error });
      } finally {
        setPreviewLoading(false);
      }
    },
    [authToken, t],
  );
  const handleDownload = useCallback((item) => {
    if (!item?.base64) return;
    const link = document.createElement("a");
    link.href = item.base64;
    link.download = item.file_name || "document";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);
  const openLargePreview = useCallback((submission) => {
    setLargePreview(submission);
  }, []);
  const closeLargePreview = useCallback(() => {
    setLargePreview(null);
  }, []);
  const getFileIcon = useCallback((fileName = "", base64 = "") => {
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    const mime = base64?.split(";")[0]?.split(":")[1] || "";
    if (
      mime.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)
    ) {
      return <FileImage className="w-10 h-10 text-blue-500" />;
    }
    if (mime === "application/pdf" || ext === "pdf") {
      return <FileText className="w-10 h-10 text-red-500" />;
    }
    if (mime.startsWith("video/") || ["mp4", "webm", "ogg"].includes(ext)) {
      return <FileVideo className="w-10 h-10 text-purple-500" />;
    }
    if (
      mime.startsWith("audio/") ||
      ["mp3", "wav", "ogg", "m4a"].includes(ext)
    ) {
      return <FileAudio className="w-10 h-10 text-green-500" />;
    }
    if (
      [
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "txt",
        "csv",
        "json",
        "js",
        "ts",
        "jsx",
        "tsx",
      ].includes(ext)
    ) {
      return <FileCode className="w-10 h-10 text-gray-600" />;
    }
    return <File className="w-10 h-10 text-gray-500" />;
  }, []);
  const getFileTypeLabel = useCallback((base64 = "", fileName = "") => {
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    const mime = base64?.split(";")[0]?.split(":")[1] || "";
    if (mime.startsWith("image/")) return "Image";
    if (mime === "application/pdf") return "PDF";
    if (mime.startsWith("video/")) return "Video";
    if (mime.startsWith("audio/")) return "Audio";
    if (ext) return ext.toUpperCase();
    return "File";
  }, []);
  const filteredRequests = useMemo(() => {
    let result = [...requests];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          (r.bundle?.name || "").toLowerCase().includes(term) ||
          formatSafeDate(r.createdAt || r.created_at, "")
            .toLowerCase()
            .includes(term) ||
          (r.status || "").toLowerCase().includes(term),
      );
    }
    if (sortBy === "newest") {
      result.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at);
        const dateB = new Date(b.createdAt || b.created_at);
        return isNaN(dateB) || isNaN(dateA) ? 0 : dateB - dateA;
      });
    } else if (sortBy === "oldest") {
      result.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at);
        const dateB = new Date(b.createdAt || b.created_at);
        return isNaN(dateA) || isNaN(dateB) ? 0 : dateA - dateB;
      });
    } else if (sortBy === "status") {
      const order = {
        rejected: 0,
        pending: 1,
        submitted: 2,
        approved: 3,
        completed: 4,
      };
      result.sort(
        (a, b) =>
          (order[a.status?.toLowerCase()] ?? 5) -
          (order[b.status?.toLowerCase()] ?? 5),
      );
    }
    return result;
  }, [requests, searchTerm, sortBy, formatSafeDate]);
  const paginated = useMemo(
    () =>
      filteredRequests.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE,
      ),
    [filteredRequests, page],
  );
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const handleChangePassword = useCallback(
    async (e) => {
      e.preventDefault();
      setPwdError("");
      if (newPwd.length < 6) {
        setPwdError(t.passwordMin);
        return;
      }
      if (newPwd !== confirmPwd) {
        setPwdError(t.passwordsNoMatch);
        return;
      }
      try {
        setSavingPwd(true);
        const token = authToken || localStorage.getItem("auth_token");
        const res = await fetch("/api/clients/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: currentPwd,
            newPassword: newPwd,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setPwdModalOpen(false);
          setCurrentPwd("");
          setNewPwd("");
          setConfirmPwd("");
          setMessage(t.passwordSuccess);
          setMessageType("success");
        } else {
          setPwdError(data.message || t.passwordError);
        }
      } catch (err) {
        setPwdError(t.passwordError);
      } finally {
        setSavingPwd(false);
      }
    },
    [authToken, newPwd, confirmPwd, currentPwd, t],
  );
  const getStatusBadge = useCallback(
    (status) => {
      const s = status?.toLowerCase() || "pending";
      let bg = "bg-amber-100 text-amber-800";
      if (s === "approved") bg = "bg-emerald-100 text-emerald-800";
      if (s === "rejected") bg = "bg-red-100 text-red-800";
      if (s === "completed") bg = "bg-blue-100 text-blue-800";
      return (
        <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${bg}`}>
          {t[s] || t.pending}
        </span>
      );
    },
    [t],
  );
  const hasAnyRejectedSubmission = useCallback((requirements = []) => {
    return requirements.some((req) =>
      (req.submissions || []).some(
        (sub) => sub.status?.toLowerCase() === "rejected",
      ),
    );
  }, []);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-black mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">{t.loading}</p>
        </div>
      </div>
    );
  }
  const RequestCard = ({
    req,
    t,
    navigate,
    openPreview,
    hasAnyRejectedSubmission,
    formatSafeDate,
    getStatusBadge,
  }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);
    function handleMouse(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      x.set(event.clientX - (rect.left + rect.width / 2));
      y.set(event.clientY - (rect.top + rect.height / 2));
    }
    const status = req.status?.toLowerCase() || "pending";
    const hasRejection = hasAnyRejectedSubmission(req.requirements);
    let btnConfig = {
      label: t.uploadDocuments,
      style: "bg-zinc-900 text-white hover:bg-black",
      onClick: () => navigate(`/public/${req.share_token}`),
    };
    if (hasRejection) {
      btnConfig = {
        label: t.reuploadDocuments,
        style: "bg-rose-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
        onClick: () => navigate(`/public/${req.share_token}`),
      };
    } else if (["approved", "submitted", "completed"].includes(status)) {
      btnConfig = {
        label: t.preview,
        style:
          "border-2 border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white",
        onClick: () => openPreview(req),
      };
    }
    return (
      <motion.div
        style={{ rotateX, rotateY, perspective: 1000 }}
        onMouseMove={handleMouse}
        onMouseLeave={() => {
          x.set(0);
          y.set(0);
        }}
        className="group relative bg-white border-2 border-zinc-900 rounded-[2.5rem] p-8 shadow-[12px_12px_0px_0px_rgba(24,24,27,1)] transition-all hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
      >
        <div className="flex justify-between items-start mb-8">
          <div className="group-hover:rotate-12 transition-transform">
            <FileText size={28} strokeWidth={1.5} />
          </div>
          {getStatusBadge(req.status)}
        </div>
        <h3 className="text-2xl font-light tracking-tight text-zinc-900 mb-2 leading-tight min-h-[3.5rem] line-clamp-2">
          {req.bundle?.name || "Document Request"}
        </h3>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">
          {formatSafeDate(
            req.reviewed_at || req.createdAt || req.created_at,
            status === "pending"
              ? t.pending
              : status === "submitted"
                ? t.submitted
                : t.completed,
          )}
        </p>
        {hasRejection && (
          <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl">
            <p className="text-[10px] font-bold text-rose-800 uppercase mb-1">
              {t.rejectionReason}
            </p>
            <p className="text-xs text-rose-700 italic">
              {req.rejection_reason ||
                req.rejectionReason ||
                t.rejectionFallback}
            </p>
          </div>
        )}
        <div className="pt-6 border-t border-zinc-100 mb-8 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            {req.requirements?.length || 0} Files
          </span>
          <div className="flex -space-x-2">
            {[...Array(Math.min(3, req.requirements?.length || 0))].map(
              (_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border border-white bg-zinc-100 flex items-center justify-center"
                >
                  <div className="w-1 h-1 bg-zinc-400 rounded-full" />
                </div>
              ),
            )}
          </div>
        </div>
        <button
          onClick={btnConfig.onClick}
          className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${btnConfig.style}`}
        >
          {btnConfig.label}
          <ArrowUpRight size={14} strokeWidth={3} />
        </button>
      </motion.div>
    );
  };
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring', damping: 25, stiffness: 300 } 
    },
    exit: { opacity: 0, scale: 0.95, y: 10 }
  };
  const containerVariants = {
    visible: { transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  return (
    <div
      className={`min-h-screen bg-gray-50 ${isArabic ? "font-arabic direction-rtl" : ""}`}
    >
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-black">
            {t.dashboard}
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-1 min-w-[240px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-4 py-2 bg-white min-w-[160px]"
            >
              <option value="newest">{t.sortNewest}</option>
              <option value="oldest">{t.sortOldest}</option>
              <option value="status">{t.sortStatus}</option>
            </select>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-6 py-16">
        
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`mb-12 p-6 rounded-[2rem] border-2 border-black flex items-center gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${
                messageType === "success"
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-rose-100 text-rose-900"
              }`}
            >
              <div
                className={`p-2 rounded-full border-2 border-black ${messageType === "success" ? "bg-emerald-400" : "bg-rose-400"}`}
              >
                <AlertCircle size={20} strokeWidth={3} />
              </div>
              <span className="font-black text-xs uppercase tracking-[0.1em]">
                {message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {[
            {
              label: t.totalRequests,
              value: requests.length,
              color: "text-zinc-900",
            },
            {
              label: t.pending,
              value: requests.filter(
                (r) => r.status?.toLowerCase() === "pending",
              ).length,
              color: "text-zinc-400",
            },
            {
              label: t.submitted,
              value: requests.filter(
                (r) => r.status?.toLowerCase() === "submitted",
              ).length,
              color: "text-zinc-900",
            },
            {
              label: t.rejected,
              value: requests.filter(
                (r) => r.status?.toLowerCase() === "rejected",
              ).length,
              color: "text-rose-500",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="border-b-2 border-zinc-900 pb-6 group"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-2 group-hover:translate-x-2 transition-transform">
                {stat.label}
              </p>
              <p
                className={`text-5xl font-light tracking-tighter ${stat.color}`}
              >
                {stat.value.toString().padStart(2, "0")}
              </p>
            </motion.div>
          ))}
        </div>
        {}
        {paginated.length === 0 ? (
          <div className="bg-zinc-50 rounded-[4rem] border-2 border-dashed border-zinc-300 p-24 text-center">
            <div className="w-20 h-20 bg-white border border-zinc-200 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
              <FileText className="w-10 h-10 text-zinc-300" strokeWidth={1} />
            </div>
            <h2 className="text-2xl font-light tracking-tight text-zinc-900 mb-2">
              {t.noRequests}
            </h2>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto">
              {t.noRequestsDesc}
            </p>
          </div>
        ) : (
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
            {paginated.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                t={t}
                navigate={navigate}
                openPreview={openPreview}
                hasAnyRejectedSubmission={hasAnyRejectedSubmission}
                formatSafeDate={formatSafeDate}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        )}
        {}
        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-8 mt-24">
            <div className="flex items-center gap-12">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-14 h-14 border-2 border-zinc-900 rounded-full flex items-center justify-center hover:bg-zinc-900 hover:text-white disabled:opacity-20 transition-all active:scale-90"
              >
                <ChevronLeft size={24} strokeWidth={2} />
              </button>
              <div className="flex gap-3">
                {[...Array(totalPages)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 transition-all duration-500 rounded-full ${
                      page === i + 1 ? "w-12 bg-zinc-900" : "w-2 bg-zinc-200"
                    }`}
                  />
                ))}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-14 h-14 border-2 border-zinc-900 rounded-full flex items-center justify-center hover:bg-zinc-900 hover:text-white disabled:opacity-20 transition-all active:scale-90"
              >
                <ChevronRight size={24} strokeWidth={2} />
              </button>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Showing Page {page} of {totalPages}
            </p>
          </div>
        )}
      </main>
      {}
      <AnimatePresence>
      {previewOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-950/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 md:p-8"
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white rounded-[3rem] shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-zinc-200"
          >
            {/* Header: Minimalist & Clean */}
            <div className="px-10 py-8 border-b border-zinc-100 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 block mb-1">
                  {previewData?.bundle?.name || "Verification Portal"}
                </span>
                <h2 className="text-3xl font-light tracking-tighter text-zinc-900">
                  {t.preview} <span className="font-bold text-zinc-400">// Archive</span>
                </h2>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="group p-4 hover:bg-zinc-900 rounded-full transition-all duration-300"
              >
                <X size={24} className="group-hover:text-white transition-colors" strokeWidth={1.5} />
              </button>
            </div>

            {/* Content Area */}
            <div className="overflow-y-auto custom-scrollbar bg-[#fcfcfc]">
              {previewLoading ? (
                <div className="py-40 flex flex-col items-center justify-center">
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <Loader2 size={48} className="text-zinc-900" />
                  </motion.div>
                  <p className="mt-6 text-xs font-black uppercase tracking-widest text-zinc-400">Syncing Data...</p>
                </div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="p-10 space-y-24"
                >
                  {(previewData?.requirements || []).map((req) => {
                    const sections = [
                      { id: 'approved', label: t.approvedDocuments, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', docs: req.submissions?.filter(s => s.status === "approved") || [] },
                      { id: 'pending', label: t.pendingDocuments, icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-50', docs: req.submissions?.filter(s => s.status === "pending" || !s.status) || [] },
                      { id: 'rejected', label: t.rejectedDocuments, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50', docs: req.submissions?.filter(s => s.status === "rejected") || [] },
                    ];

                    return (
                      <motion.div key={req.id} variants={itemVariants} className="group/section">
                        {/* Requirement Title with modern line-thru effect */}
                        <div className="flex items-center gap-6 mb-12">
                          <h3 className="text-xl font-bold tracking-tight text-zinc-900 uppercase italic">
                            {req.name || "Requirement"}
                          </h3>
                          <div className="h-[1px] flex-1 bg-gradient-to-r from-zinc-200 to-transparent" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                          {sections.map((sec) => (
                            <div key={sec.id} className="space-y-6">
                              <div className={`flex items-center gap-3 ${sec.color}`}>
                                <sec.icon size={18} strokeWidth={2.5} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{sec.label}</span>
                                <span className="ml-auto text-[10px] font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                                  {sec.docs.length}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                {sec.docs.length === 0 ? (
                                  <div className="col-span-2 h-24 rounded-3xl border border-dashed border-zinc-200 flex items-center justify-center">
                                    <span className="text-[10px] uppercase font-bold text-zinc-300 tracking-tighter">Empty Slot</span>
                                  </div>
                                ) : (
                                  sec.docs.map((sub, i) => (
                                    <motion.div
                                      key={i}
                                      whileHover={{ y: -5, scale: 1.02 }}
                                      onClick={() => openLargePreview(sub)}
                                      className="relative aspect-[3/4] bg-white rounded-2xl border border-zinc-200 overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 group/card"
                                    >
                                      {sub.base64?.startsWith("data:image/") ? (
                                        <img src={sub.base64} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-110" alt="" />
                                      ) : (
                                        <div className="h-full flex flex-col items-center justify-center bg-zinc-50">
                                          <div className="p-4 bg-white rounded-2xl shadow-sm mb-2">
                                            {getFileIcon(sub.file_name, sub.base64)}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Sophisticated Overlay */}
                                      <div className="absolute inset-0 bg-zinc-900/60 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleDownload(sub); }}
                                          className="p-3 bg-white text-zinc-900 rounded-full hover:bg-zinc-900 hover:text-white transition-colors"
                                        >
                                          <Download size={18} />
                                        </button>
                                      </div>

                                      {/* Label bar */}
                                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                        <p className="text-[9px] font-medium text-white truncate uppercase tracking-tighter">
                                          {sub.file_name || "Document"}
                                        </p>
                                      </div>
                                    </motion.div>
                                  ))
                                )}
                              </div>
                              
                              {/* Rejection Note - Mature style */}
                              {sec.id === 'rejected' && sec.docs[0]?.rejection_reason && (
                                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                  <p className="text-[10px] text-rose-600 leading-relaxed italic">
                                    &ldquo;{sec.docs[0].rejection_reason}&rdquo;
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* Footer / Status Summary */}
            <div className="px-10 py-6 bg-zinc-50 border-t border-zinc-100 flex justify-center">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">
                    End of Document Record
                </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
      {}
      {largePreview && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4"
          onClick={closeLargePreview}
        >
          <div
            className="relative max-w-5xl w-full max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {}
            <button
              onClick={closeLargePreview}
              className="absolute -top-14 right-0 text-white bg-black hover:bg-zinc-800 p-3 rounded-2xl border-2 border-white/20 transition-all active:scale-90"
            >
              <X size={28} strokeWidth={3} />
            </button>
            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] border-4 border-black flex flex-col">
              {}
              <div className="p-6 border-b-4 border-black flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                <div className="min-w-0">
                  <h3 className="text-2xl font-black uppercase tracking-tighter truncate leading-none">
                    {largePreview.file_name || "Document Preview"}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-zinc-100 border border-black rounded text-[10px] font-black uppercase tracking-widest">
                      {getFileTypeLabel(
                        largePreview.base64,
                        largePreview.file_name,
                      )}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(largePreview)}
                  className="flex items-center gap-2 bg-emerald-500 text-black px-6 py-3 rounded-2xl border-2 border-black font-black uppercase tracking-tighter hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all active:translate-x-0 active:translate-y-0 active:shadow-none"
                >
                  <Download size={20} strokeWidth={3} />
                  {t.download}
                </button>
              </div>
              {}
              <div className="p-4 sm:p-8 bg-zinc-100 flex items-center justify-center min-h-[50vh] max-h-[75vh] overflow-y-auto">
                {largePreview.base64?.startsWith("data:image/") ? (
                  <div className="p-2 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <img
                      src={largePreview.base64}
                      alt={largePreview.file_name}
                      className="max-h-[65vh] w-full object-contain rounded-xl"
                    />
                  </div>
                ) : largePreview.base64?.startsWith("data:application/pdf") ? (
                  <div className="w-full h-[70vh] border-4 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <iframe
                      src={largePreview.base64}
                      className="w-full h-full bg-white"
                      title={largePreview.file_name}
                    />
                  </div>
                ) : largePreview.base64?.startsWith("data:video/") ? (
                  <div className="border-4 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-black">
                    <video
                      src={largePreview.base64}
                      controls
                      className="max-h-[65vh] w-full"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : largePreview.base64?.startsWith("data:audio/") ? (
                  <div className="w-full max-w-xl bg-white p-10 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex flex-col items-center gap-6">
                      <div className="p-4 bg-zinc-100 rounded-2xl border-2 border-black">
                        <File size={40} className="text-black" />
                      </div>
                      <audio controls className="w-full">
                        <source src={largePreview.base64} />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 px-6 bg-white rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md">
                    <div className="w-24 h-24 bg-zinc-100 border-4 border-black rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
                      <File className="w-12 h-12 text-black" strokeWidth={3} />
                    </div>
                    <p className="text-xl font-black uppercase tracking-tighter mb-2">
                      Preview Unavailable
                    </p>
                    <p className="text-sm font-bold text-zinc-500 mb-6">
                      This file format cannot be displayed directly in the
                      browser.
                    </p>
                    <button
                      onClick={() => handleDownload(largePreview)}
                      className="w-full py-3 bg-black text-white rounded-xl font-black uppercase tracking-widest text-xs transition-transform active:scale-95"
                    >
                      Download to View
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {pwdModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">{t.changePassword}</h2>
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.currentPassword}
                </label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.newPassword}
                </label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.confirmPassword}
                </label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  required
                />
              </div>
              {pwdError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {pwdError}
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setPwdModalOpen(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-3 hover:bg-gray-50 transition-colors font-medium"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingPwd}
                  className="flex-1 bg-black text-white rounded-lg py-3 hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
                >
                  {savingPwd ? t.loading : t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ClientDashboard;

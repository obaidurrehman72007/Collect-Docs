import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import Header from '../Components/Header.jsx';
import { X, Download, Maximize2, FileText, Image as ImageIcon, File } from 'lucide-react';

const ClientPortal = () => {
  const { shareToken } = useParams();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  
  const [bundleRequest, setBundleRequest] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const TIMEOUT_MS = 10000;
  const MAX_RETRIES = 3;

  const isRTL = lang === 'ar';

  const fetchBundleRequest = useCallback(async (attempt = 1) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    try {
      setLoading(attempt === 1);
      setError(null);
      
      const response = await fetch(`${API_BASE}/bundle-requests/client/${shareToken}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      setBundleRequest(data);
      setRequirements(processRequirements(data));
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < MAX_RETRIES && error.name !== 'AbortError') {
        setTimeout(() => fetchBundleRequest(attempt + 1), 2000);
        setRetryCount(attempt);
        return;
      }
      
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [shareToken, API_BASE]);

  const processRequirements = useCallback((data) => {
    try {
      if (data.requirements?.length) {
        return data.requirements.map(req => normalizeRequirement(req));
      }
      
      const template = JSON.parse(data.bundle?.template || data.Bundle?.template || '[]');
      const files = parseLegacyFiles(data.notes || data.files || '[]');
      
      return template.map((req, i) => ({
        ...normalizeRequirement(req),
        files: files[i] || [],
        status: files[i]?.length ? 'uploaded' : 'pending'
      }));
    } catch {
      return [];
    }
  }, []);

  const normalizeRequirement = useCallback((req) => ({
    id: req.id || `req_${Math.random().toString(36).slice(2)}`,
    name: req.name || req.label || req.title || 'Requirement',
    description: req.description || req.placeholder || '',
    type: req.type?.toLowerCase() || 'file',
    files: req.files || req.submissions || [],
    submitted_value: req.submitted_value || req.value || req.text || '',
    status: req.status || (req.files?.length ? 'uploaded' : 'pending'),
    required: req.required !== false
  }), []);

  const parseLegacyFiles = useCallback((notes) => {
    try {
      const files = JSON.parse(notes);
      const filesByReq = {};
      files.forEach(file => {
        const match = file.fieldname?.match(/field_(\d+)/);
        const index = match ? parseInt(match[1]) - 1 : 0;
        filesByReq[index] = filesByReq[index] || [];
        filesByReq[index].push(normalizeFile(file));
      });
      return filesByReq;
    } catch {
      return {};
    }
  }, []);

  const normalizeFile = useCallback((file) => ({
    filename: file.filename || file.path,
    originalname: file.originalname || file.name || 'file',
    size: file.size || 0,
    mimetype: file.mimetype || 'application/octet-stream'
  }), []);

  useEffect(() => {
    if (shareToken) {
      fetchBundleRequest();
    } else {
      setError('Invalid token');
      setLoading(false);
    }
  }, [shareToken, fetchBundleRequest]);

  const getFileUrl = useCallback((file) => {
    const filename = file.filename || file.path;
    return `${API_BASE.replace('/api', '')}/uploads/${filename}`;
  }, [API_BASE]);

  const openPreview = useCallback((file) => {
    setPreviewFile(file);
    setShowPreviewModal(true);
  }, []);

  const closePreview = useCallback(() => {
    setShowPreviewModal(false);
    setPreviewFile(null);
  }, []);

  const isImageFile = useCallback((file) => /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(file.originalname || file.filename || ''), []);
  const isPdfFile = useCallback((file) => /\.pdf$/i.test(file.originalname || file.filename || ''), []);
  const getFileTypeIcon = useCallback((file) => {
    if (isImageFile(file)) return ImageIcon;
    if (isPdfFile(file)) return FileText;
    return File;
  }, [isImageFile, isPdfFile]);

  const pageTitle = useMemo(() => 
    bundleRequest?.bundle?.name 
      ? `${bundleRequest.bundle.name} - Submission Review` 
      : 'Document Submission Portal'
  , [bundleRequest]);

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading submission</h2>
          <p className="text-gray-600">Fetching your documents {retryCount > 0 && `(Retry ${retryCount}/${MAX_RETRIES})`}</p>
        </div>
      </div>
    );
  }

  if (error || !bundleRequest) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4 text-center border border-red-200">
          <div className="w-24 h-24 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl" role="img" aria-label="error">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Submission not found</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">{error || 'Request expired or invalid'}</p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-2xl font-bold hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all"
              aria-label="Retry loading submission"
            >
              🔄 Retry
            </button>
            <button 
              onClick={() => navigate('/dashboard/requests', { replace: true })}
              className="w-full bg-gray-500 text-white py-3 px-6 rounded-2xl font-bold hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all"
              aria-label="Go back to dashboard"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <header className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl mb-12 border border-white/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-4xl lg:text-5xl font-black bg-linear-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3 leading-tight">
                  {bundleRequest.bundle?.name || 'Document Review'}
                </h1>
                <p className="text-xl text-gray-700 max-w-2xl leading-relaxed">
                  {bundleRequest.bundle?.description || 'Review your uploaded documents and status'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 min-w-0">
                <span className={`px-6 py-4 rounded-2xl font-bold text-lg shadow-lg whitespace-nowrap ${
                  bundleRequest.status === 'approved' 
                    ? 'bg-emerald-100 text-emerald-800 border-4 border-emerald-200 ring-4 ring-emerald-100/50' 
                    : bundleRequest.status === 'rejected' 
                    ? 'bg-red-100 text-red-800 border-4 border-red-200 ring-4 ring-red-100/50'
                    : bundleRequest.submitted_at 
                    ? 'bg-blue-100 text-blue-800 border-4 border-blue-200 ring-4 ring-blue-100/50'
                    : 'bg-yellow-100 text-yellow-800 border-4 border-yellow-200 ring-4 ring-yellow-100/50'
                }`}>
                  {bundleRequest.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                </span>
                {bundleRequest.submitted_at && (
                  <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium whitespace-nowrap">
                    📅 {new Date(bundleRequest.submitted_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            
            {bundleRequest.rejection_reason && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <span className="font-semibold text-red-800 block mb-1">Rejection reason:</span>
                <span className="text-red-700 text-sm">{bundleRequest.rejection_reason}</span>
              </div>
            )}
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {requirements.length === 0 ? (
              <div 
                className="col-span-full text-center py-24 bg-white/60 rounded-3xl backdrop-blur-xl border-2 border-dashed border-gray-300"
                role="status"
                aria-label="No requirements"
              >
                <div className="w-28 h-28 bg-linear-to-br from-gray-200 to-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-8 opacity-60">
                  <span className="text-4xl" role="img" aria-label="empty">📋</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4">No requirements</h3>
                <p className="text-xl text-gray-600 max-w-lg mx-auto">
                  Contact administrator for bundle configuration
                </p>
              </div>
            ) : (
              requirements.map((req, index) => (
                <article 
                  key={req.id} 
                  className="group bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-gray-200 hover:-translate-y-1 h-full flex flex-col"
                  role="region"
                  aria-labelledby={`req-title-${req.id}`}
                >
                  <header className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg shrink-0 transition-all group-hover:scale-105 ${
                      req.type === 'file' 
                        ? 'bg-linear-to-br from-blue-500 to-blue-600' 
                        : req.type === 'text' || req.type === 'textarea'
                        ? 'bg-linear-to-br from-emerald-500 to-emerald-600'
                        : 'bg-linear-to-br from-purple-500 to-purple-600'
                    } text-white`}>
                      {req.type === 'file' ? '📁' : req.type === 'text' || req.type === 'textarea' ? '✏️' : '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 id={`req-title-${req.id}`} className="text-2xl font-bold text-gray-900 group-hover:text-gray-950 transition-colors truncate">
                        {req.name}
                      </h4>
                      {req.description && (
                        <p className="text-sm text-gray-600 truncate mt-1">{req.description}</p>
                      )}
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-md whitespace-nowrap ${
                      req.status === 'approved' 
                        ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-200' 
                        : req.status === 'rejected' 
                        ? 'bg-red-100 text-red-800 border-2 border-red-200'
                        : req.status === 'uploaded' 
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-200'
                        : 'bg-yellow-100 text-yellow-800 border-2 border-yellow-200'
                    }`}>
                      {req.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </header>

                  <div className="flex-1 space-y-6">
                    {(req.submitted_value || req.value) && (
                      <div className="p-6 bg-linear-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-emerald-200">
                          <span className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-bold text-sm">T</span>
                          <span className="font-semibold text-emerald-800 text-sm uppercase tracking-wide">Text response</span>
                        </div>
                        <p className="text-lg text-gray-900 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                          {(req.submitted_value || req.value).slice(0, 500)}
                          {((req.submitted_value || req.value).length > 500) && <span className="text-sm text-gray-500">…</span>}
                        </p>
                      </div>
                    )}

                    {req.files?.length > 0 ? (
                      <>
                        <div className="flex items-center gap-3 mb-6">
                          <span className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center font-bold text-sm">F</span>
                          <span className="font-semibold text-blue-800 text-sm uppercase tracking-wide">
                            Files ({req.files.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-4 max-h-80 overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-gray-300">
                          {req.files.map((file, fIndex) => {
                            const fileUrl = getFileUrl(file);
                            const Icon = getFileTypeIcon(file);
                            return (
                              <div
                                key={fIndex}
                                onClick={() => openPreview(file)}
                                className="group relative p-4 bg-linear-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-200 overflow-hidden h-32 flex flex-col justify-between cursor-pointer"
                              >
                                <div className="flex-1 flex items-center justify-center min-h-20">
                                  {isImageFile(file) ? (
                                    <img 
                                      src={fileUrl} 
                                      alt={file.originalname}
                                      className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-linear-to-br from-gray-400 to-gray-500 flex items-center justify-center rounded-xl">
                                      <Icon className="w-12 h-12 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3 space-y-1">
                                  <p className="font-semibold text-sm text-gray-900 truncate leading-tight">
                                    {file.originalname}
                                  </p>
                                  <p className="text-xs text-gray-500 flex items-center justify-between">
                                    <span>{formatFileSize(file.size)}</span>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                      View
                                    </span>
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div 
                        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-3xl p-12 bg-linear-to-b from-gray-50 to-gray-100 hover:border-gray-400 transition-all cursor-default h-80"
                        role="img"
                        aria-label="No files uploaded"
                      >
                        <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center mb-6 opacity-50">
                          <span className="text-3xl">📎</span>
                        </div>
                        <h4 className="font-bold text-xl text-gray-700 mb-2">{req.name}</h4>
                        <p className="text-gray-500 text-sm text-center">No files uploaded</p>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>

          <footer className="mt-16 text-center">
            <p className="text-sm text-gray-500">
              Powered by DocCollection • Secure document portal
            </p>
          </footer>
        </div>
      </main>

      {showPreviewModal && previewFile && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={closePreview}>
          <div 
            className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 truncate max-w-md">
                {previewFile.originalname}
              </h3>
              <div className="flex items-center gap-3">
                <a
                  href={getFileUrl(previewFile)}
                  download={previewFile.originalname}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-900 transition font-medium"
                >
                  <Download size={18} />
                  Download
                </a>
                <button
                  onClick={closePreview}
                  className="p-2 hover:bg-gray-200 rounded-xl transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-8 max-h-[70vh] overflow-auto">
              {isImageFile(previewFile) ? (
                <img 
                  src={getFileUrl(previewFile)} 
                  alt={previewFile.originalname}
                  className="max-w-full max-h-full mx-auto rounded-2xl shadow-lg"
                />
              ) : isPdfFile(previewFile) ? (
                <iframe
                  src={getFileUrl(previewFile)}
                  className="w-full h-[70vh] rounded-2xl shadow-lg"
                  title={previewFile.originalname}
                />
              ) : (
                <div className="text-center py-24">
                  <FileText className="w-32 h-32 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">No preview available</h3>
                  <p className="text-gray-600 mb-8">This file type cannot be previewed</p>
                  <a
                    href={getFileUrl(previewFile)}
                    download={previewFile.originalname}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-900 transition"
                  >
                    <Download size={20} />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const isImageFile = (file) => /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(file.originalname || file.filename || '');
const isPdfFile = (file) => /\.pdf$/i.test(file.originalname || file.filename || '');
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default ClientPortal;
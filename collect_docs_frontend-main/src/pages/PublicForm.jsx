// src/pages/PublicForm.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader2, FileText, X, Upload } from 'lucide-react';

const PublicForm = () => {
  const { shareToken } = useParams();
  const { token } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isResubmission, setIsResubmission] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [justSubmitted, setJustSubmitted] = useState(false);

  const [filesState, setFilesState] = useState({});
  const previewUrlsRef = useRef({});
  const formRef = useRef(null);
  const isArabic = lang === 'ar';

  // ────────────────────────────────────────────────
  // Fetch bundle data
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!shareToken) {
      setError('Invalid share token');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/bundle-requests/public/${shareToken}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to load request');

        const data = await res.json();
        const bundleData = data.data || data;
        setBundle(bundleData);

        if (bundleData.status === 'rejected') setIsResubmission(true);
      } catch (err) {
        setError(err.message || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      // Cleanup previews
      Object.values(previewUrlsRef.current).forEach(URL.revokeObjectURL);
      previewUrlsRef.current = {};
    };
  }, [shareToken, token]);

  // ────────────────────────────────────────────────
  // Calculate progress
  // ────────────────────────────────────────────────
  const calculateProgress = useCallback(() => {
    if (!bundle?.requirements?.length) return setProgress(100);

    const total = bundle.requirements.length;
    let filled = 0;
    bundle.requirements.forEach((_, i) => {
      if (filesState[i]?.file) filled++;
    });
    setProgress(Math.round((filled / total) * 100));
  }, [bundle?.requirements, filesState]);

  useEffect(() => calculateProgress(), [filesState, calculateProgress]);

  // ────────────────────────────────────────────────
  // Handle file changes
  // ────────────────────────────────────────────────
  const handleFileChange = useCallback(
    (e, idx) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (previewUrlsRef.current[idx]) URL.revokeObjectURL(previewUrlsRef.current[idx]);

      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current[idx] = previewUrl;

      setFilesState((prev) => ({
        ...prev,
        [idx]: { file, previewUrl, name: file.name, type: file.type },
      }));

      calculateProgress();
    },
    [calculateProgress]
  );

  const removeFile = useCallback(
    (idx) => {
      if (previewUrlsRef.current[idx]) {
        URL.revokeObjectURL(previewUrlsRef.current[idx]);
        delete previewUrlsRef.current[idx];
      }
      setFilesState((prev) => {
        const copy = { ...prev };
        delete copy[idx];
        return copy;
      });
      calculateProgress();
    },
    [calculateProgress]
  );

  // ────────────────────────────────────────────────
  // Handle submit
  // ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    Object.entries(filesState).forEach(([i, { file }]) => {
      formData.append(`field_file_${i}`, file);
    });
    formData.append('shareToken', shareToken);
    formData.append('isResubmission', isResubmission.toString());

    try {
      const res = await fetch(`/api/bundle-requests/${shareToken}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Submission failed');

      setSuccessMessage(
        isResubmission
          ? lang === 'ar'
            ? 'دوبارہ جمع کامیاب'
            : 'Resubmitted successfully'
          : lang === 'ar'
          ? 'جمع کامیاب'
          : 'Submitted successfully'
      );
      setJustSubmitted(true);

      setTimeout(() => navigate('/', { replace: true }), 1800);

      // Reset
      formRef.current?.reset();
      setFilesState({});
      Object.values(previewUrlsRef.current).forEach(URL.revokeObjectURL);
      previewUrlsRef.current = {};
      setProgress(0);
      setIsResubmission(false);
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────
  if (justSubmitted)
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${isArabic ? 'direction-rtl' : ''}`}>
        <div className="max-w-lg w-full mx-4 bg-white border-2 border-black rounded-3xl shadow-xl p-10 text-center">
          <div className="text-8xl mb-8">🎉</div>
          <h2 className="text-4xl font-bold text-black mb-6">{t('Thank You!')}</h2>
          <p className="text-xl text-gray-800 mb-10">{successMessage}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full py-5 px-10 bg-black text-white text-xl font-bold rounded-2xl hover:bg-gray-900 transition-all shadow-lg"
          >
            {t('Back to Home')}
          </button>
        </div>
      </div>
    );

  if (loading)
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${isArabic ? 'direction-rtl' : ''}`}>
        <div className="text-center p-12">
          <Loader2 className="animate-spin h-16 w-16 text-black mx-auto mb-6" />
          <p className="text-xl font-medium text-black">{t('Loading form...')}</p>
        </div>
      </div>
    );

  if (error || !bundle?.requirements?.length)
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${isArabic ? 'direction-rtl' : ''}`}>
        <div className="bg-white p-12 rounded-3xl border-2 border-black max-w-md w-full mx-4 text-center shadow-lg">
          <h1 className="text-4xl font-bold text-black mb-6">{error ? 'Error' : 'Invalid Link'}</h1>
          <p className="text-lg text-gray-700 mb-10">
            {error || t('Please contact the administrator or try a different link.')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-black text-white px-10 py-5 rounded-2xl font-bold hover:bg-gray-900 transition-all shadow-md"
          >
            {t('Back to Home')}
          </button>
        </div>
      </div>
    );

  // Filter fields
  const fieldsToShow = isResubmission
    ? bundle.requirements.filter((r) => r.status === 'rejected')
    : bundle.requirements;
  const requiredFields = fieldsToShow.filter((f) => f.is_mandatory);
  const optionalFields = fieldsToShow.filter((f) => !f.is_mandatory);

 
  const renderField = (field, index) => {
    const fileData = filesState[index];
    const hasFile = !!fileData?.file;

    return (
      <div
        key={index}
        className={`border-2 ${hasFile ? 'border-green-600 bg-green-50' : 'border-gray-300'} rounded-2xl p-6 transition-all`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
          <div className="flex-1">
            <p className="font-bold text-xl text-black">
              {field.name} {field.is_mandatory && <span className="text-red-600">*</span>}
            </p>
            <p className="text-base text-gray-700 mt-2">{field.description || t('Drop file here or click to upload')}</p>
          </div>

          <label
            htmlFor={`file-${index}`}
            className="cursor-pointer bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-900 transition flex items-center gap-3 shrink-0"
          >
            <Upload size={20} />
            {t('Choose File')}
          </label>
          <input
            type="file"
            id={`file-${index}`}
            name={`field_file_${index}`}
            accept={field.accepted_types?.join(',') || 'image/jpeg,image/png,application/pdf'}
            required={!hasFile && field.is_mandatory}
            className="hidden"
            onChange={(e) => handleFileChange(e, index)}
          />
        </div>

        {hasFile && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-5 flex-1">
              {fileData.type.startsWith('image/') ? (
                <img src={fileData.previewUrl} alt={fileData.name} className="w-24 h-24 object-cover rounded-lg shadow-sm" />
              ) : fileData.type === 'application/pdf' ? (
                <iframe src={fileData.previewUrl} className="w-24 h-24 rounded-lg" title={fileData.name} />
              ) : (
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText size={40} className="text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{fileData.name}</p>
                <p className="text-sm text-gray-600">{t('uploaded') || 'Uploaded'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeFile(index)}
              className="p-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition"
              title={t('Remove file')}
            >
              <X size={24} />
            </button>
          </div>
        )}

        {/* Previous Submissions */}
        {field.submissions?.length > 0 && (
          <div className="mt-8">
            <h4 className="font-bold text-lg mb-4">{t('Previous Submissions')}</h4>
            <div className="space-y-6">
              {field.submissions.map((sub, subIdx) => (
                <div key={subIdx} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-medium text-gray-900">{sub.file_name} - {sub.status}</p>
                    {sub.rejection_reason && (
                      <p className="text-sm text-red-600">
                        {t('Reason')}: {sub.rejection_reason}
                      </p>
                    )}
                  </div>
                  {sub.base64 ? (
                    sub.file_name.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={sub.base64} className="w-full h-96 rounded-lg" title={sub.file_name} />
                    ) : (
                      <img src={sub.base64} alt={sub.file_name} className="w-full max-h-96 object-contain rounded-lg" />
                    )
                  ) : (
                    <div className="text-center py-10 text-gray-500">{t('No preview available')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 ${isArabic ? 'font-arabic direction-rtl text-right' : ''}`}>
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Progress Bar */}
        <div className="bg-white border-2 border-gray-300 rounded-3xl p-8 shadow-md">
          <h3 className="text-3xl font-bold text-black mb-6">{t('Upload Progress')}</h3>
          <div className="flex flex-col sm:flex-row justify-between text-base font-medium mb-4 gap-4">
            <span>{progress}% • {progress}/{fieldsToShow.length} {t('documents')}</span>
            <span className="text-right sm:text-left">
              {t('required')}: {requiredFields.filter((_, i) => filesState[i]?.file).length} / {requiredFields.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden">
            <div className="bg-black h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-12">
          {/* Required Documents */}
          {requiredFields.map((field, idx) => renderField(field, idx))}
          {/* Optional Documents */}
          {optionalFields.map((field, idx) => renderField(field, requiredFields.length + idx))}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || loading || !bundle?.requirements?.length}
            className="w-full bg-black text-white py-3.5 px-7 rounded-lg text-xl font-bold shadow-2xl hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin" />
                {t('Submitting...')}
              </div>
            ) : isResubmission ? t('Resubmit Documents') : t('Submit Documents')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PublicForm;

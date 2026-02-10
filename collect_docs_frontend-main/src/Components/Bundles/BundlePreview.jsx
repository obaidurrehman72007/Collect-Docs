import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

const BundlePreview = () => {
  const { bundleId } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage(); // ← now using context

  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState({});

  const isArabic = lang === 'ar';

  const getFieldLabel = (field) => {
    if (field?.translations?.[lang]?.label) return field.translations[lang].label;
    return field?.name || 'Unnamed Field';
  };

  useEffect(() => {
    const fetchBundle = async () => {
      if (!bundleId) {
        setError('Missing bundle ID');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/bundles/${bundleId}/preview`, {
          headers: { 'Accept-Language': lang },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        setBundle(data);

        const initialUploaded = {};
        const reqs = Array.isArray(data.requirements) ? data.requirements : [];
        reqs.forEach((field) => {
          if (field?.name) {
            initialUploaded[field.name] = false;
          }
        });
        setUploadedFiles(initialUploaded);
      } catch (err) {
        console.error('Bundle fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBundle();
  }, [bundleId, lang]);

  const requirements = Array.isArray(bundle?.requirements) ? bundle.requirements : [];
  const requiredDocs = requirements.filter((f) => f?.required === true);
  const optionalDocs = requirements.filter((f) => !f?.required);

  const totalDocs = requirements.length;
  const requiredDocsCount = requiredDocs.length;
  const uploadedRequired = Object.values(uploadedFiles).filter(Boolean).length;
  const progressPercentage =
    requiredDocsCount > 0 ? Math.round((uploadedRequired / requiredDocsCount) * 100) : 0;

  const handleFileSelect = (fieldName) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [fieldName]: true,
    }));
    setUploadedCount((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-white ${isArabic ? 'direction-rtl' : ''}`}>
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-lg text-black font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-white ${isArabic ? 'direction-rtl' : ''}`}>
        <div className="bg-white p-10 rounded-2xl border-2 border-black max-w-md w-full mx-4 text-center shadow-sm">
          <h1 className="text-4xl sm:text-5xl font-bold text-black mb-4">{t('Bundle NotFound')}</h1>
          <p className="text-gray-700 mb-8">{error || t('Bundle Not Found')}</p>
          <Link
            to="/dashboard/bundles"
            className="inline-block bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition-all"
          >
            {t('backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  const clientName = bundle?.clientName || user?.name;
  const clientEmail = bundle?.clientEmail || user?.email;
  const handlerName = bundle?.clientName || user?.name;

  return (
    <div className={`bg-white py-12 px-4 sm:px-6 lg:px-8 ${isArabic ? 'direction-rtl text-right' : ''}`}>
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header Card */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="flex flex-col gap-6">
            <Link
              to="/dashboard/bundles"
              className="inline-flex items-center text-black font-bold text-lg hover:text-gray-700 transition-colors w-fit"
            >
              {t('backToDashboard')}
            </Link>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
              <div className="space-y-4">
                <h2 className="text-4xl sm:text-5xl font-bold text-black">Document Upload Portal</h2>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-black flex items-center gap-3">
                    <span className="text-2xl">👤</span> {clientName}
                  </p>
                  <p className="text-lg font-medium text-black flex items-center gap-3">
                    <span className="text-2xl">✉️</span> {clientEmail}
                  </p>
                </div>
              </div>

              <div className="text-right space-y-2">
                <p className="text-sm text-gray-600">{t('Handled By')}</p>
                <p className="text-xl font-bold text-black">{handlerName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
       <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
  <h3 className="text-2xl font-bold text-black mb-6">{t('Upload Progress')}</h3>

  <div className="flex justify-between text-sm text-black font-medium mb-3">
    <span>
      {uploadedCount} {t('of Documents').replace('{total}', totalDocs)}
    </span>
    <span>
      {t('Required Uploaded')
        .replace('{uploaded}', uploadedRequired)
        .replace('{required}', requiredDocsCount)}
    </span>
  </div>

  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
    <div
      className="bg-black h-full rounded-full transition-all duration-500"
      style={{ width: `${progressPercentage}%` }}
    ></div>
  </div>
</div>

        {/* Required Documents */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
          <h3 className="text-2xl font-bold text-black mb-8">{t('Required Documents')}</h3>

          <div className="space-y-6">
            {requiredDocs.map((field, idx) => (
              <div
                key={idx}
                className="border border-gray-400 rounded-xl p-6 transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div className="flex-1">
                    <p className="font-bold text-lg text-black">
                      {getFieldLabel(field)} <span className="text-black">*</span>
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{t('Drop Or Click')}</p>
                  </div>
                  <button
                    onClick={() => handleFileSelect(getFieldLabel(field))}
                    className="bg-black text-white px-7 py-3.5 rounded-xl font-medium hover:bg-gray-900 transition shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    {t('Choose File')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optional Documents */}
        {optionalDocs.length > 0 && (
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-black mb-8">{t('Optional Documents')}</h3>

            <div className="space-y-6">
              {optionalDocs.map((field, idx) => (
                <div
                  key={idx}
                  className="border border-gray-400 rounded-xl p-6 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="flex-1">
                      <p className="font-bold text-lg text-black">{getFieldLabel(field)}</p>
                      <p className="text-sm text-gray-700 mt-1">{t('Drop Or Click')}</p>
                    </div>
                    <button
                      onClick={() => handleFileSelect(getFieldLabel(field))}
                      className="bg-black text-white px-7 py-3.5 rounded-xl font-medium hover:bg-gray-900 transition shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                      {t('Choose File')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BundlePreview;
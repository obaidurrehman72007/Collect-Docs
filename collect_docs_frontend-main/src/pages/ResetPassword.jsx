import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isArabic = lang === 'ar';

  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(isArabic ? 'رابط إعادة تعيين غير صالح أو مفقود' : 'Invalid or missing reset link');
    }
  }, [token, isArabic]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (newPassword !== confirmPassword) {
      setError(isArabic ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      setSubmitting(false);
      return;
    }

    if (newPassword.length < 6) {
      setError(isArabic ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
          // ← removed email completely
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.message || (isArabic ? 'حدث خطأ أثناء إعادة التعيين' : 'Failed to reset password'));
      }
    } catch (err) {
      setError(isArabic ? 'فشل الاتصال بالخادم' : 'Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl text-center">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-8">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {isArabic ? 'تم إعادة تعيين كلمة المرور بنجاح' : 'Password Reset Successfully'}
          </h2>
          <p className="text-gray-600 text-lg">
            {isArabic ? 'جاري توجيهك إلى صفحة تسجيل الدخول...' : 'Redirecting to login page...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${isArabic ? 'font-arabic direction-rtl' : ''}`}>
      <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            {isArabic ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
          </h1>
          {/* Removed email display */}
        </div>

        {error && (
          <div className="mb-8 p-5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-7">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isArabic ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full px-5 py-3.5 rounded-xl border border-gray-300 shadow-sm focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-colors"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full px-5 py-3.5 rounded-xl border border-gray-300 shadow-sm focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-colors"
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !token}
            className={`w-full py-4 px-6 bg-black text-white rounded-xl font-medium text-lg
                       hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2
                       disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200`}
          >
            {submitting
              ? isArabic ? 'جاري المعالجة...' : 'Processing...'
              : isArabic ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
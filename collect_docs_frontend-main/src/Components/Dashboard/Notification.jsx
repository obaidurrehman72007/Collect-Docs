
import React, { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext.jsx';


import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';

export const NotificationToaster = () => (
  <Toaster
    position="top-right"
    toastOptions={{
      duration: 5000,
      style: {
        maxWidth: '420px',
        borderRadius: '12px',
        padding: '0',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    }}
  />
);

const COLORS = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-600',
    text: 'text-green-900',
    icon: 'text-green-600',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-600',
    text: 'text-red-900',
    icon: 'text-red-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-600',
    text: 'text-blue-900',
    icon: 'text-blue-600',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-600',
    text: 'text-amber-900',
    icon: 'text-amber-600',
  },
};

const Notification = ({
  message,
  type = 'info',
  onClose,
  duration = 5000,
  style,
}) => {
  const { isRtl } = useLanguage();

  useEffect(() => {
    if (!message) return;

    const color = COLORS[type] || COLORS.info;

    const toastId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    toast(
      (t) => (
        <div
          className={`
            flex items-center justify-between gap-3
            w-full min-w-[320px] max-w-[420px]
            p-4 rounded-xl
            border-l-4 ${color.border}
            ${color.bg}
            ${color.text}
            shadow-lg
          `}
          dir='ltr'
          style={style}
        >
          {/* Lucide icons instead of text symbols */}
          <div className={`shrink-0 ${color.icon}`}>
            {type === 'success' && <CheckCircle2 size={24} strokeWidth={2.5} />}
            {type === 'error'   && <AlertCircle    size={24} strokeWidth={2.5} />}
            {type === 'info'    && <Info           size={24} strokeWidth={2.5} />}
            {type === 'warning' && <AlertTriangle  size={24} strokeWidth={2.5} />}
          </div>

          <div className="flex-1 text-sm font-medium leading-tight">
            {message}
          </div>

          <button
            onClick={() => toast.dismiss(t.id)}
            className={`
              shrink-0 text-xl font-bold leading-none
              opacity-70 hover:opacity-100
              transition-opacity
            `}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ),
      {
        id: toastId,
        duration,
        position: isRtl ? 'top-right' : 'top-left',
        style: {
      background: 'transparent',
      boxShadow: 'none',
      border: 'none',
      padding: 0,
    },
        onDismiss: () => {
          if (onClose) onClose();
        },
      }
    );

    return () => {
      toast.dismiss(toastId);
    };
  }, [message, type, duration, onClose, style, isRtl]);

  return null;
};

export default Notification;
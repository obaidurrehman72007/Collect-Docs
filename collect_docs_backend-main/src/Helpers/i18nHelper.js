// src/helpers/i18n.js - GLOBAL LANGUAGE SYSTEM (EN/AR)
import cookieParser from 'cookie-parser';

let globalLang = 'en';

const translations = {
  en: {
    common: {
      success: "Success",
      loading: "Loading...",
      error: "Error",
      create: "Created successfully",
      delete: "Deleted successfully",
      update: "Updated successfully"
    },
    bundle: {
      noFields: "No Fields Defined",
      noFieldsDesc: "This bundle has no requirements. Create fields in Admin Dashboard first.",
      backToDashboard: "← Back to Dashboard",
      fieldsRequired: "Fields Required",
      required: "Required",
      submitForm: "Submit Form",
      bundleLoaded: "Bundle loaded successfully",
      oneField: "1 field",
      fieldsCount: "{{count}} fields"
    },
    errors: {
      notFound: "Not found",
      serverError: "Server error",
      unauthorized: "Unauthorized",
      validation: "Validation failed"
    },
    dashboard: {
      bundles: "Bundles",
      clients: "Clients",
      requests: "Requests",
      createNew: "Create New"
    }
  },
  ar: {
    common: {
      success: "نجح",
      loading: "جار التحميل...",
      error: "خطأ",
      create: "تم الإنشاء بنجاح",
      delete: "تم الحذف بنجاح",
      update: "تم التحديث بنجاح"
    },
    bundle: {
      noFields: "لا توجد حقول محددة",
      noFieldsDesc: "هذه الحزمة لا تحتوي على متطلبات. أنشئ الحقول في لوحة الإدارة أولاً.",
      backToDashboard: "← العودة إلى لوحة التحكم",
      fieldsRequired: "الحقول المطلوبة",
      required: "مطلوب",
      submitForm: "إرسال النموذج",
      bundleLoaded: "تم تحميل الحزمة بنجاح",
      oneField: "حقل واحد",
      fieldsCount: "{{count}} حقول"
    },
    errors: {
      notFound: "غير موجود",
      serverError: "خطأ في الخادم",
      unauthorized: "غير مصرح",
      validation: "فشل التحقق"
    },
    dashboard: {
      bundles: "الحزم",
      clients: "العملاء",
      requests: "الطلبات",
      createNew: "إنشاء جديد"
    }
  }
};

// 🔥 CORE FUNCTIONS
const t = (key, lang = globalLang, params = {}) => {
  try {
    const keys = key.split('.');
    let translation = translations[lang] || translations.en;
    
    for (const k of keys) {
      translation = translation[k];
      if (!translation) return key;
    }

    Object.keys(params).forEach(p => {
      translation = translation.replace(new RegExp(`{{${p}}}`, 'g'), params[p]);
    });
    
    return translation;
  } catch {
    return key;
  }
};

const tp = (singular, plural, count, lang = globalLang) => {
  return count === 1 ? t(singular, lang) : t(plural, lang, { count });
};

// 🔥 MIDDLEWARE - AUTO LANGUAGE DETECTION
export const i18nMiddleware = (req, res, next) => {
  // 1. COOKIE > 2. HEADER > 3. GLOBAL
  let lang = 'en';
  
  // Cookie
  if (req.cookies && req.cookies.lang) {
    lang = req.cookies.lang;
  } 
  // Header
  else if (req.headers['accept-language']?.includes('ar')) {
    lang = 'ar';
  }
  
  globalLang = lang;
  
  // 🔥 ATTACH TO REQUEST
  req.t = (key, params) => t(key, lang, params);
  req.tp = (singular, plural, count) => tp(singular, plural, count, lang);
  req.lang = lang;
  
  res.locals.t = req.t; // For templates
  
  next();
};

// 🔥 EXPORTS
export default {
  t,
  tp,
  middleware: i18nMiddleware,
  setGlobalLang: (lang) => globalLang = lang,
  getGlobalLang: () => globalLang
};

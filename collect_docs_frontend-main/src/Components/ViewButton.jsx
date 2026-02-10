// // src/Components/ViewButton.jsx - ✅ Uses shareToken + client route
// import React, { useState } from 'react';
// import { Eye, ExternalLink, Loader2 } from 'lucide-react';

// const ViewButton = ({ requestId, className = '' }) => {
//   const [loading, setLoading] = useState(false);

//   const handleView = async () => {
//     if (loading) return;
    
//     setLoading(true);
//     console.log('🔍 [ViewButton] Fetching bundle preview (shareToken):', requestId);
    
//     try {
//       // ✅ Hit backend admin preview data route: /api/bundle-requests/client/:shareToken
//       const response = await fetch(`/api/bundle-requests/client/${requestId}`, {
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       });
      
//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}));
//         throw new Error(errorData.message || `HTTP ${response.status}`);
//       }
      
//       const data = await response.json();
      
//       // 🚀 Optional debug logs
//       console.log('✅ [ViewButton] Preview data:', data);
//       console.table({
//         'Bundle ID': data.bundle?.id,
//         'Name': data.bundle?.name,
//         'Description': data.bundle?.description,
//         'Requirements Count': data.requirements?.length || 0,
//       });
      
//       // ✅ Open the React admin preview route that uses AdminBundlePreview
//       const previewUrl = `/admin/bundles/preview/${requestId}`;
//       console.log('🔗 [ViewButton] Preview URL:', previewUrl);
//       window.open(previewUrl, '_blank');
      
//     } catch (error) {
//       console.error('❌ [ViewButton] Error:', error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <button
//       onClick={handleView}
//       disabled={loading}
//       className={`
//         ${className}
//         inline-flex items-center gap-2 px-4 py-2 
//         bg-linear-to-r from-emerald-500 to-emerald-600 
//         hover:from-emerald-600 hover:to-emerald-700 
//         text-white font-semibold rounded-xl shadow-lg 
//         hover:shadow-xl transition-all duration-200 
//         disabled:opacity-70 disabled:cursor-not-allowed
//         focus:outline-none focus:ring-4 focus:ring-emerald-300
//       `}
//     >
//       {loading ? (
//         <Loader2 className="w-4 h-4 animate-spin" />
//       ) : (
//         <>
//           <Eye className="w-4 h-4" />
//           View
//         </>
//       )}
//       <ExternalLink className="w-3 h-3 opacity-75" />
//     </button>
//   );
// };

// export default ViewButton;

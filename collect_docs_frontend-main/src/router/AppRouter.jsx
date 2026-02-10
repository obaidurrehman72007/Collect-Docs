import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

import Login from '../Components/Auth/Login.jsx';
import Header from '../Components/Header.jsx';

import AdminDashboard from '../pages/AdminDashboard.jsx';
import ClientDashboard from '../Components/Dashboard/ClientDashboard.jsx';
import ClientPortal from '../pages/ClientPortal.jsx';
import PublicForm from '../pages/PublicForm.jsx';
import BundlePreview from '../Components/Bundles/BundlePreview.jsx';
import AdminBundlePreview from '../pages/AdminBundlePreview.jsx';
import Workspace from '../Components/Dashboard/Workspace.jsx';
import ResetPassword from '../pages/ResetPassword.jsx';
import StaffManagement from '../Components/Dashboard/StaffManagenent.jsx';

// function MainLayout({ children, showHeader = true }) {
//   const { isRtl } = useLanguage();

//   return (
//     <div
//       className="max-h-screen flex flex-col bg-white w-screen"
//       dir={isRtl() ? 'rtl' : 'ltr'}
//     >
//       {showHeader && (
//         <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
//           <Header />
//         </header>
//       )}

//       <div className="flex bg-white min-h-screen">
//         <div className="hidden lg:block xl:w-80 shrink-0" />

//         <main
//           className={`
//             overflow-x-hidden
//             transition-all duration-300
//             w-full
//             text-black
//             relative
//             bg-white
//             mx-auto
//             ${showHeader ? 'p-6 pt-20 lg:pt-20' : 'pt-0'}
//           `}
//         >
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }
function MainLayout({ children, showHeader = true }) {
  const { isRtl } = useLanguage();

  return (
    <div
      className="max-h-screen flex flex-col bg-white w-screen"
      dir={isRtl() ? 'rtl' : 'ltr'}
    >
      {showHeader && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
          <Header />
        </header>
      )}

      <div className="flex bg-white min-h-screen">
        {showHeader && <div className="hidden lg:block xl:w-80 shrink-0" />}

        <main
          className={`
            overflow-x-hidden transition-all duration-300
            w-full text-black relative bg-white mx-auto
            ${showHeader ? 'p-6 pt-20 lg:pt-20' : 'pt-0'}
          `}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminDashboardLayout() {
  return (
    <MainLayout showHeader={true}>
      <Routes>
        <Route index element={<Navigate to="clients" replace />} />
        <Route path="clients" element={<AdminDashboard />} />
        <Route path="bundles" element={<AdminDashboard />} />
        <Route path="requests" element={<AdminDashboard />} />
        <Route path="workspace" element={<Workspace />} />
        <Route path="staff-manage" element={<StaffManagement />} />
      </Routes>
    </MainLayout>
  );
}

function PrivateRoute({ children, allowedUserTypes = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;

  if (allowedUserTypes.length > 0 && !allowedUserTypes.includes(user.userType)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

const ClientOnly = (props) => <PrivateRoute allowedUserTypes={['client']} {...props} />;
const AdminOnly = (props) => <PrivateRoute allowedUserTypes={['user', 'admin']} {...props} />;

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Navigate
      to={user.userType === 'client' ? '/client-dashboard' : '/dashboard/clients'}
      replace
    />
  );
}

export default function AppRouter() {
  const { isRtl } = useLanguage();

  return (
    <BrowserRouter>
      <style>{`
        :root {
          --header-height: 80px;
        }
        [dir="rtl"] .text-left   { text-align: right; }
        [dir="rtl"] .text-right  { text-align: left;  }
      `}</style>

      <div dir={isRtl() ? 'rtl' : 'ltr'}>
        <Routes>
          <Route
            path="/public/:shareToken"
            element={
              <ClientOnly>
                <MainLayout>
                  <PublicForm />
                </MainLayout>
              </ClientOnly>
            }
          />

          <Route
            path="/bundle-requests/client/:shareToken"
            element={
              <MainLayout>
                <ClientPortal />
              </MainLayout>
            }
          />

          <Route
            path="/dashboard/bundles/:bundleId/preview"
            element={
              <MainLayout>
                <BundlePreview />
              </MainLayout>
            }
          />

          <Route
            path="/admin/bundles/preview/:shareToken"
            element={
              <MainLayout>
                <AdminBundlePreview />
              </MainLayout>
            }
          />

          <Route
            path="/bundle-request/:shareToken"
            element={
              <MainLayout>
                <AdminBundlePreview />
              </MainLayout>
            }
          />

          <Route
            path="/login"
            element={
              <MainLayout showHeader={false}>
                <Login />
              </MainLayout>
            }
          />

          <Route
            path="/reset-password"
            element={
              <MainLayout showHeader={false}>
                <ResetPassword />
              </MainLayout>
            }
          />

          <Route
            path="/client-dashboard/*"
            element={
              <ClientOnly>
                <MainLayout>
                  <ClientDashboard />
                </MainLayout>
              </ClientOnly>
            }
          />

          <Route
            path="/dashboard/*"
            element={
              <AdminOnly>
                <AdminDashboardLayout />
              </AdminOnly>
            }
          />

          <Route path="/" element={<RootRedirect />} />

          <Route
            path="*"
            element={
              <MainLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-gray-500">
                  <h1 className="text-7xl font-bold mb-4">404</h1>
                  <p className="text-xl">Page not found</p>
                </div>
              </MainLayout>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
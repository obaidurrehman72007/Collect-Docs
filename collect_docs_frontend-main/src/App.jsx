// src/App.jsx
import React, { useState, useEffect } from 'react';
import AppRouter from './router/AppRouter.jsx';
import AppInitialLoader from './Components/AppInitialLoader.jsx';
import { NotificationToaster } from './Components/Dashboard/Notification.jsx'; // adjust path

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Replace with real loading logic if needed
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {isLoading && <AppInitialLoader />}

      {!isLoading && (
        <>
          <AppRouter />
          <NotificationToaster /> 
        </>
      )}
    </>
  );
}
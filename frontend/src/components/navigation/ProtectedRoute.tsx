import { bootstrapAuth } from '../../services/api';
import { Button } from '../ui/Button';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../feedback/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isInitializing, initializationError } = useAuthStore();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <LoadingSpinner size="lg" label="Restoring secure session..." />
        <p className="text-xs text-slate-400">Verifying credentials with HireFlow gateway</p>
      </div>
    );
  }

  if (initializationError) return <div role="alert" className="space-y-4 p-8"><p>{initializationError}</p><Button onClick={() => void bootstrapAuth()}>Retry connection</Button></div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-navy-900 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-navy-800 tracking-wide">Loading KnowTheTask...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="max-w-md w-full bg-white p-8 border border-slate-200 rounded-xl text-center shadow-sm">
          <h2 className="text-xl font-bold text-navy-950 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your role does not have authorization to view this section.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-5 py-2.5 bg-navy-950 text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}

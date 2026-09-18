import React from 'react';
import { Navbar } from './Navbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  systemStatus?: 'UP' | 'DOWN' | 'CHECKING';
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  systemStatus,
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar systemStatus={systemStatus} />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} HireFlow ATS. Built with React 18, Vite, TypeScript, Express, and MongoDB.
          </p>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <span>Secure hiring workflows</span>
            <span>•</span>
            <span className="text-teal-600">Production MERN Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, LogOut, User, LayoutDashboard, ExternalLink, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { logoutApi } from '../../services/api';
import { Button } from '../ui/Button';

interface NavbarProps {
  systemStatus?: 'UP' | 'DOWN' | 'CHECKING';
}

export const Navbar: React.FC<NavbarProps> = ({ systemStatus = 'CHECKING' }) => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutApi();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Hire<span className="text-teal-600">Flow</span>
                </span>
                <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500">Applicant Tracking System</p>
            </div>
          </Link>

          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-teal-700 transition-colors"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>
              <Link to="/jobs" className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700">Jobs</Link>
              {user?.role === 'candidate' && <Link to="/applications" className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700">Applications</Link>}
              {user?.role === 'candidate' && <Link to="/candidate/profile" className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700">Profile</Link>}
              {(user?.role === 'recruiter' || user?.role === 'admin') && <Link to="/recruiter/jobs" className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700">Recruiting</Link>}
              {user?.role === 'recruiter' && <Link to="/recruiter/company" className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700">Company</Link>}
              <Link to="/notifications" aria-label="Notifications" className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700"><Bell className="h-4 w-4" /></Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Health Indicator Pill */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  systemStatus === 'UP'
                    ? 'bg-emerald-400'
                    : systemStatus === 'DOWN'
                    ? 'bg-rose-400'
                    : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  systemStatus === 'UP'
                    ? 'bg-emerald-500'
                    : systemStatus === 'DOWN'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="font-medium text-slate-700">
              API: {systemStatus === 'UP' ? 'Online' : systemStatus === 'DOWN' ? 'Offline' : 'Connecting...'}
            </span>
          </div>

          <a
            href="/api/v1/health"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-teal-600 transition-colors"
          >
            <span>Raw Health</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          {/* User Profile / Auth Actions */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-xs font-bold">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-slate-800 leading-tight">
                    {user.fullName}
                  </p>
                  <p className="text-[10px] capitalize text-slate-500">
                    {user.role}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                title="Sign out of current session"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm" leftIcon={<User className="h-3.5 w-3.5" />}>
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      {isAuthenticated && <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden"><Link to="/dashboard" className="whitespace-nowrap rounded px-2 py-1 text-xs font-semibold">Dashboard</Link><Link to="/jobs" className="whitespace-nowrap rounded px-2 py-1 text-xs font-semibold">Jobs</Link>{user?.role === 'candidate' && <Link to="/applications" className="whitespace-nowrap rounded px-2 py-1 text-xs font-semibold">Applications</Link>}{user?.role === 'candidate' && <Link to="/candidate/profile" className="whitespace-nowrap rounded px-2 py-1 text-xs font-semibold">Profile</Link>}{user?.role === 'recruiter' && <Link to="/recruiter/jobs" className="whitespace-nowrap rounded px-2 py-1 text-xs font-semibold">Recruiting</Link>}<Link to="/notifications" className="whitespace-nowrap rounded px-2 py-1 text-xs font-semibold">Notifications</Link></nav>}
    </header>
  );
};

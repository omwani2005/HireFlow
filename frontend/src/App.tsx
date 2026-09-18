import { AccountPage } from './features/auth/pages/AccountPage';
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/navigation/ProtectedRoute';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { JobListingsPage } from './features/jobs/JobListingsPage';
import { JobDetailsPage } from './features/jobs/JobDetailsPage';
import { MyApplicationsPage } from './features/applications/MyApplicationsPage';
import { RoleGuard } from './components/navigation/RoleGuard';
import { RecruiterJobsPage } from './features/recruiter/RecruiterJobsPage';
import { RecruiterJobFormPage } from './features/recruiter/RecruiterJobFormPage';
import { RecruiterJobDetailsPage } from './features/recruiter/RecruiterJobDetailsPage';
import { RecruiterApplicantsPage } from './features/recruiter/RecruiterApplicantsPage';
import { CandidateProfilePage } from './features/candidate/CandidateProfilePage';
import { OverviewPage } from './features/dashboard/OverviewPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { RecruiterCompanyPage } from './features/recruiter/RecruiterCompanyPage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { checkApiHealth, bootstrapAuth } from './services/api';
import { HealthData } from './types/api';
import { useAuthStore } from './store/authStore';
import {
  Server,
  Database,
  Clock,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  KeyRound,

} from 'lucide-react';

// Landing Page Component for public visitors
const HomePage: React.FC<{ health: HealthData | null; isLoading: boolean; fetchHealth: () => void }> = ({
  health,
  isLoading,
  fetchHealth,
}) => {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300 border border-teal-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Secure applicant tracking, from application to hire</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              HireFlow ATS Platform
            </h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Enterprise Recruitment & Applicant Tracking System built on production MERN with dual-token sliding sessions, multi-device rotation, and RBAC.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Go to Dashboard ({user?.role})
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Backend Health Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-teal-100 bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-700">API Status</CardTitle>
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <Server className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <span className="text-xs text-slate-400">Connecting...</span>
            ) : (
              <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                {health?.status || 'Unavailable'}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Environment: <span className="font-semibold uppercase">{health?.environment || 'development'}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-teal-100 bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-700">MongoDB Session DB</CardTitle>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Database className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <span className="text-xs text-slate-400">Probing...</span>
            ) : (
              <div className="text-2xl font-bold text-slate-900 capitalize flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                {health?.database || 'unavailable'}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Multi-Device Sessions & TTL purge active
            </p>
          </CardContent>
        </Card>

        <Card className="border-teal-100 bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-700">Server Uptime</CardTitle>
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <span className="text-xs text-slate-400">Calculating...</span>
            ) : (
              <div className="text-2xl font-bold text-slate-900">
                {health ? `${health.uptime}s` : '0s'}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Live Health Verification Available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="p-3 w-fit rounded-xl bg-teal-50 text-teal-700 mb-2">
              <KeyRound className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Sliding Session Security</CardTitle>
            <CardDescription className="text-xs">
              15-minute access token in memory with 7-day HTTP-only refresh cookies. Rotated on every cycle.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Link to="/login" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
              <span>Test Sign In</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-3 w-fit rounded-xl bg-teal-50 text-teal-700 mb-2">
              <UserCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Role-Based Accounts</CardTitle>
            <CardDescription className="text-xs">
              Separate portals and capabilities for Candidates (resume, applications) and Recruiters (requisitions, pipeline).
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Link to="/register" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
              <span>Test Registration</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-3 w-fit rounded-xl bg-teal-50 text-teal-700 mb-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Multi-Device Audit</CardTitle>
            <CardDescription className="text-xs">
              View all active device logins, revoke specific compromised devices, or logout from all devices simultaneously.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <Link to="/dashboard" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
              <span>View Sessions</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardFooter>
        </Card>
      </div>

      <div className="flex justify-center pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHealth}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Ping Health Check API
        </Button>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(true);

  const fetchHealth = async () => {
    try {
      setIsLoadingHealth(true);
      const data = await checkApiHealth();
      setHealth(data);
    } catch {
      // health check failure caught
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    // 1. Check API health
    fetchHealth();
    // 2. Silent bootstrap of authentication from HTTP-only cookie
    bootstrapAuth();
  }, []);

  const getSystemStatus = () => {
    if (isLoadingHealth) return 'CHECKING';
    if (!health || health.status !== 'UP') return 'DOWN';
    return 'UP';
  };

  return (
    <BrowserRouter>
      <DashboardLayout systemStatus={getSystemStatus()}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                health={health}
                isLoading={isLoadingHealth}
                fetchHealth={fetchHealth}
              />
            }
          />
          <Route path="/forgot-password" element={<AccountPage mode="forgot-password" />} />
          <Route path="/reset-password" element={<AccountPage mode="reset-password" />} />
          <Route path="/verify-email" element={<AccountPage mode="verify-email" />} />
          <Route path="/resend-verification" element={<AccountPage mode="resend-verification" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/jobs" element={<JobListingsPage />} />
          <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
          <Route path="/applications" element={<ProtectedRoute><MyApplicationsPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/candidate/profile" element={<ProtectedRoute><RoleGuard allowedRoles={['candidate']}><CandidateProfilePage /></RoleGuard></ProtectedRoute>} />
          <Route path="/recruiter/jobs" element={<ProtectedRoute><RoleGuard allowedRoles={['recruiter', 'admin']}><RecruiterJobsPage /></RoleGuard></ProtectedRoute>} />
          <Route path="/recruiter/company" element={<ProtectedRoute><RoleGuard allowedRoles={['recruiter']}><RecruiterCompanyPage /></RoleGuard></ProtectedRoute>} />
          <Route path="/recruiter/jobs/new" element={<ProtectedRoute><RoleGuard allowedRoles={['recruiter', 'admin']}><RecruiterJobFormPage /></RoleGuard></ProtectedRoute>} />
          <Route path="/recruiter/jobs/:jobId" element={<ProtectedRoute><RoleGuard allowedRoles={['recruiter', 'admin']}><RecruiterJobDetailsPage /></RoleGuard></ProtectedRoute>} />
          <Route path="/recruiter/jobs/:jobId/edit" element={<ProtectedRoute><RoleGuard allowedRoles={['recruiter', 'admin']}><RecruiterJobFormPage /></RoleGuard></ProtectedRoute>} />
          <Route path="/recruiter/jobs/:jobId/applicants" element={<ProtectedRoute><RoleGuard allowedRoles={['recruiter', 'admin']}><RecruiterApplicantsPage /></RoleGuard></ProtectedRoute>} />
          <Route path="/recruiter/jobs/:jobId/pipeline" element={<ProtectedRoute><RoleGuard allowedRoles={['recruiter', 'admin']}><RecruiterApplicantsPage /></RoleGuard></ProtectedRoute>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <OverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          {/* Catch-all redirect to home */}
          <Route
            path="*"
            element={
              <HomePage
                health={health}
                isLoading={isLoadingHealth}
                fetchHealth={fetchHealth}
              />
            }
          />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
};

export default App;

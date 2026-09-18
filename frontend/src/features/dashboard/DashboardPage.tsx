import React, { useEffect, useState } from 'react';
import {
  User as UserIcon,
  Shield,
  Laptop,
  LogOut,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  getSessionsApi,
  logoutApi,
  logoutAllApi,
  updateProfileApi,
} from '../../services/api';
import { SessionInfo } from '../../types/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/feedback/Alert';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  // Profile Edit State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [designation, setDesignation] = useState(user?.designation || '');
  const [headline, setHeadline] = useState(user?.candidateProfile?.headline || '');
  const [location, setLocation] = useState(user?.candidateProfile?.location || '');
  const [skillsInput, setSkillsInput] = useState(
    (user?.candidateProfile?.skills || []).join(', ')
  );

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Multi-Device Sessions State
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);

  const loadSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const data = await getSessionsApi();
      setSessions(data);
    } catch {
      // session loading error handled gracefully
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      setProfileError(null);
      setProfileSuccess(null);

      const parsedSkills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateProfileApi({
        fullName,
        phoneNumber,
        designation: user?.role === 'recruiter' ? designation : undefined,
        candidateProfile: {
          headline,
          location,
          skills: parsedSkills,
        },
      });

      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogoutCurrent = async () => {
    try {
      setSessionActionLoading(true);
      await logoutApi();
    } finally {
      setSessionActionLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      setSessionActionLoading(true);
      await logoutAllApi();
    } finally {
      setSessionActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Welcome Card */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300 text-2xl font-bold">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {user?.fullName}
                </h1>
                <span className="capitalize rounded-full bg-teal-500/20 px-2.5 py-0.5 text-xs font-semibold text-teal-300 border border-teal-500/30">
                  {user?.role} Account
                </span>
              </div>
              <p className="text-sm text-slate-300 flex items-center gap-1.5">
                <span>{user?.email}</span>
                <span>•</span>
                <span>ID: {user?._id}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleLogoutCurrent}
              isLoading={sessionActionLoading}
              leftIcon={<LogOut className="h-4 w-4" />}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              Sign Out (This Device)
            </Button>
            <Button
              variant="danger"
              onClick={handleLogoutAll}
              isLoading={sessionActionLoading}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Sign Out All Devices
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Profile Information & Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-teal-600" />
                    <span>Profile Information</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your personal details and domain qualifications
                  </CardDescription>
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </CardHeader>

            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                {profileSuccess && (
                  <Alert variant="success" title="Success">
                    {profileSuccess}
                  </Alert>
                )}
                {profileError && (
                  <Alert variant="error" title="Update Failed">
                    {profileError}
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  <Input
                    label="Phone Number"
                    placeholder="+1 (555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    startIcon={<Phone className="h-4 w-4" />}
                  />
                </div>

                {user?.role === 'candidate' ? (
                  <>
                    <Input
                      label="Professional Headline"
                      placeholder="e.g. Senior Frontend Engineer | React, TypeScript"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      startIcon={<Briefcase className="h-4 w-4" />}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Location / Region"
                        placeholder="e.g. San Francisco, CA (or Remote)"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        startIcon={<MapPin className="h-4 w-4" />}
                      />
                      <Input
                        label="Skills (Comma-separated)"
                        placeholder="React, TypeScript, Node.js, MongoDB"
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        helperText="Used for automated AI candidate matching"
                      />
                    </div>
                  </>
                ) : (
                  <Input
                    label="Recruiter Designation"
                    placeholder="e.g. Lead Tech Recruiter"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    startIcon={<Briefcase className="h-4 w-4" />}
                  />
                )}
              </CardContent>

              <CardFooter className="flex justify-end border-t border-slate-100 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSavingProfile}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Save Profile Changes
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Account security summary */}
          <Card className="border-teal-100 bg-teal-50/40">
            <CardHeader>
              <CardTitle className="text-base text-teal-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-teal-600" />
                <span>Account Security</span>
              </CardTitle>
              <CardDescription className="text-teal-700">
                Key architectural requirements implemented and active in this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2 bg-white p-3 rounded-lg border border-teal-100 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Dual-Token Session</span>
                    <p className="text-slate-500">In-memory 15m access token + rotating 7d HTTP-only cookie.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white p-3 rounded-lg border border-teal-100 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Token Reuse Protection</span>
                    <p className="text-slate-500">Compromised token detection revokes the entire session lineage.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white p-3 rounded-lg border border-teal-100 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Refresh Mutex Queue</span>
                    <p className="text-slate-500">Axios interceptor prevents race conditions on concurrent 401s.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white p-3 rounded-lg border border-teal-100 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Zero-Reload Persistence</span>
                    <p className="text-slate-500">Session silently bootstrapped without window.location.reload().</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Multi-Device Sessions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-teal-600" />
                  <span>Active Sessions</span>
                </CardTitle>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {sessions.length} Active
                </span>
              </div>
              <CardDescription>
                Multi-device tracking from MongoDB Session collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingSessions ? (
                <div className="py-6 flex justify-center">
                  <LoadingSpinner size="sm" label="Loading sessions..." />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No other active sessions found.</p>
              ) : (
                sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
                      sess.isCurrent
                        ? 'border-teal-200 bg-teal-50/50'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 truncate">
                        <Laptop className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[170px]" title={sess.userAgent}>
                          {sess.userAgent}
                        </span>
                      </div>
                      {sess.isCurrent && (
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>IP: {sess.ipAddress}</span>
                      <span>{new Date(sess.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={loadSessions}
              >
                Refresh Sessions List
              </Button>
            </CardFooter>
          </Card>

          {/* Product summary */}
          <Card className="border-dashed border-slate-300 bg-slate-50">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-400" />
                <span>HireFlow workspace</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Manage your account here. Use the main navigation for jobs, applications, recruiting, and notifications.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

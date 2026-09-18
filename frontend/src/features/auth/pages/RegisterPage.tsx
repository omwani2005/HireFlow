import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, User, Mail, Lock, Building, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/Card';
import { Alert } from '../../../components/feedback/Alert';
import { registerApi } from '../../../services/api';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [headline, setHeadline] = useState('');
  const [designation, setDesignation] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await registerApi({
        fullName,
        email,
        password,
        role,
        headline: role === 'candidate' ? headline : undefined,
        designation: role === 'recruiter' ? designation : undefined,
      });

      navigate('/login', { replace: true, state: { message: 'Account created. Check your email for a verification link before signing in.' } });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Join HireFlow
          </h1>
          <p className="text-sm text-slate-500">
            Create your account to start managing hiring pipelines or applying to top roles
          </p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Create an Account</CardTitle>
            <CardDescription>Select your account type to customize your experience</CardDescription>

            {/* Role Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 mt-3 border border-slate-200">
              <button
                type="button"
                onClick={() => setRole('candidate')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  role === 'candidate'
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Job Candidate</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('recruiter')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  role === 'recruiter'
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="h-3.5 w-3.5" />
                <span>Recruiter / HR</span>
              </button>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="error" title="Registration Error">
                  {error}
                </Alert>
              )}

              <Input
                label="Full Name"
                type="text"
                placeholder="e.g. Jordan Lee"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                startIcon={<User className="h-4 w-4" />}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="jordan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                startIcon={<Mail className="h-4 w-4" />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="At least 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                startIcon={<Lock className="h-4 w-4" />}
                helperText="Use 12?72 characters"
                required
              />

              {role === 'candidate' ? (
                <Input
                  label="Professional Headline"
                  placeholder="e.g. Full Stack Engineer (React & Node.js)"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  startIcon={<Briefcase className="h-4 w-4" />}
                  helperText="Visible to recruiters on candidate cards"
                />
              ) : (
                <Input
                  label="Recruiter Designation / Title"
                  placeholder="e.g. Head of Talent Acquisition"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  startIcon={<Building className="h-4 w-4" />}
                  helperText="Your role at your hiring organization"
                />
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Register as {role === 'candidate' ? 'Candidate' : 'Recruiter'}
              </Button>

              <div className="text-center text-xs text-slate-500">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

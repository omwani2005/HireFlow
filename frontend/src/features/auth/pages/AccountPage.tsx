import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/feedback/Alert';

type Mode = 'forgot-password' | 'reset-password' | 'verify-email' | 'resend-verification';
const titles: Record<Mode, string> = {
  'forgot-password': 'Recover your account', 'reset-password': 'Choose a new password',
  'verify-email': 'Verify your email', 'resend-verification': 'Request a verification email',
};
export const AccountPage = ({ mode }: { mode: Mode }) => {
  const [token] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    return value;
  });
  useEffect(() => { if (token) window.history.replaceState(null, '', window.location.pathname); }, [token]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const needsToken = mode === 'reset-password' || mode === 'verify-email';
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await apiClient.post(`/auth/${mode}`, needsToken ? { token, ...(mode === 'reset-password' ? { password } : {}) } : { email });
      setMessage(response.data.message);
      setPassword('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  return <section className="mx-auto max-w-md space-y-5 rounded-xl border bg-white p-6">
    <h1 className="text-2xl font-bold">{titles[mode]}</h1>
    {message && <Alert variant="success">{message}</Alert>}
    {error && <Alert variant="error">{error}</Alert>}
    {needsToken && !token ? <Alert variant="error">Open the link in your email, or request a new link.</Alert> : !message && <form onSubmit={submit} className="space-y-4">
      {!needsToken && <Input label="Email address" type="email" required value={email} onChange={event => setEmail(event.target.value)} />}
      {mode === 'reset-password' && <Input label="New password (12–72 characters)" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={event => setPassword(event.target.value)} />}
      <Button type="submit" isLoading={busy}>{mode === 'verify-email' ? 'Verify email' : mode === 'reset-password' ? 'Save password' : 'Send email'}</Button>
    </form>}
    <div className="flex gap-4 text-sm text-teal-700"><Link to="/login">Back to sign in</Link>{needsToken && <Link to={mode === 'verify-email' ? '/resend-verification' : '/forgot-password'}>Request a new link</Link>}</div>
  </section>;
};

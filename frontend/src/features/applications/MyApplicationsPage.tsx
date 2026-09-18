import { Pagination } from '../../components/ui/Pagination';
import { useEffect, useState } from 'react';
import { BriefcaseBusiness, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';
import { getMyApplicationsApi, withdrawApplicationApi } from '../../services/api';
import { Application } from '../../types/jobs';
import { Button } from '../../components/ui/Button';

const stageStyle: Record<Application['stage'], string> = { applied: 'bg-blue-50 text-blue-700', screening: 'bg-violet-50 text-violet-700', shortlisted: 'bg-amber-50 text-amber-700', interview: 'bg-cyan-50 text-cyan-700', offer: 'bg-emerald-50 text-emerald-700', hired: 'bg-emerald-100 text-emerald-800', rejected: 'bg-rose-50 text-rose-700', withdrawn: 'bg-slate-100 text-slate-600' };

export const MyApplicationsPage = () => {
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, totalRecords: 0 });
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const load = async () => { try { setLoading(true); setError(''); const result = await getMyApplicationsApi(page); setApplications(result.applications); setMeta(result.meta || { totalPages: 1, totalRecords: result.applications.length }); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load applications.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [page]);
  const withdraw = async (id: string) => { setWithdrawing(id); try { const updated = await withdrawApplicationApi(id); setApplications((items) => items.map((item) => item._id === id ? updated : item)); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to withdraw application.'); } finally { setWithdrawing(null); } };
  if (loading) return <div className="py-16"><LoadingSpinner label="Loading your applications…" /></div>;
  return <section className="space-y-6"><div><p className="text-sm font-semibold text-teal-600">Candidate workspace</p><h1 className="text-3xl font-bold text-slate-900">My applications</h1></div>{error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}{applications.length === 0 ? <Card><CardContent className="py-14 text-center text-slate-500">You have not applied to any jobs yet.</CardContent></Card> : <div className="space-y-3">{applications.map((application) => <Card key={application._id}><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-900">{application.jobId?.title || 'Unavailable job'}</h2><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><BriefcaseBusiness className="h-4 w-4" />{application.companyId?.name || 'Unavailable company'} · {application.jobId?.location || ''}</p><p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><CalendarDays className="h-3.5 w-3.5" />Applied {new Date(application.createdAt).toLocaleDateString()}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${stageStyle[application.stage]}`}>{application.stage}</span>{!['withdrawn', 'rejected', 'hired'].includes(application.stage) && <Button variant="ghost" size="sm" isLoading={withdrawing === application._id} onClick={() => withdraw(application._id)}>Withdraw</Button>}</div></CardContent></Card>)}</div>}<Pagination page={page} {...meta} onChange={setPage} disabled={loading} /></section>;
};

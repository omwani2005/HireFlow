import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BriefcaseBusiness, MapPin, Search, ArrowRight, Building2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';
import { getPublishedJobsApi } from '../../services/api';
import { Job } from '../../types/jobs';
import { PaginationMeta } from '../../types/jobs';
import { useAuthStore } from '../../store/authStore';

export const JobListingsPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [location, setLocation] = useState('');
  const [workplaceType, setWorkplaceType] = useState<Job['workplaceType'] | ''>('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getPublishedJobsApi({ search: submittedSearch || undefined, location: location || undefined, workplaceType: workplaceType || undefined, page })
      .then((result) => { if (!cancelled) { setJobs(result.jobs); setMeta(result.meta); } })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [submittedSearch, location, workplaceType, page]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSubmittedSearch(search.trim());
    setPage(1);
  };

  return <section className="space-y-6">
    <div className="rounded-2xl bg-slate-900 p-7 text-white">
      <p className="text-sm font-semibold text-teal-300">Career opportunities</p>
      <h1 className="mt-1 text-3xl font-bold">Find your next role</h1>
      <form onSubmit={submitSearch} className="mt-5 flex max-w-2xl gap-2">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, skill, or keyword" className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-teal-400 focus:ring-2" />
        <Button type="submit" leftIcon={<Search className="h-4 w-4" />}>Search</Button>
      </form>
      <div className="mt-3 flex max-w-2xl flex-wrap gap-2"><input value={location} onChange={(event) => { setLocation(event.target.value); setPage(1); }} placeholder="Location" className="rounded-lg border border-slate-600 bg-white px-3 py-2 text-sm text-slate-900" /><select value={workplaceType} onChange={(event) => { setWorkplaceType(event.target.value as Job['workplaceType'] | ''); setPage(1); }} className="rounded-lg border border-slate-600 bg-white px-3 py-2 text-sm text-slate-900"><option value="">Any workplace</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></div>
    </div>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    {loading ? <div className="py-16"><LoadingSpinner label="Loading opportunities…" /></div> : jobs.length === 0 ? <Card><CardContent className="py-14 text-center text-slate-500">No published jobs match your search. Try a different keyword.</CardContent></Card> : <div className="grid gap-4">
      {jobs.map((job) => <Card key={job._id} className="transition-shadow hover:shadow-md"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><h2 className="text-lg font-bold text-slate-900">{job.title}</h2><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500"><span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.companyId?.name}</span><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location} · {job.workplaceType}</span><span className="flex items-center gap-1"><BriefcaseBusiness className="h-3.5 w-3.5" />{job.employmentType}</span></div><p className="mt-3 line-clamp-2 text-sm text-slate-600">{job.description}</p><div className="mt-3 flex flex-wrap gap-2">{job.skillsRequired.slice(0, 5).map((skill) => <span key={skill} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">{skill}</span>)}</div></div>
        <Link to={`/jobs/${job._id}`}><Button variant={isAuthenticated && user?.role === 'candidate' ? 'primary' : 'outline'} rightIcon={<ArrowRight className="h-4 w-4" />}>View details</Button></Link>
      </CardContent></Card>)}
    </div>}{meta && meta.totalPages > 1 && <div className="flex items-center justify-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm text-slate-500">Page {meta.page} of {meta.totalPages}</span><Button variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}
  </section>;
};

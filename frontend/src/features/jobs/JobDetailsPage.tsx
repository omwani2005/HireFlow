import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, MapPin, Send } from 'lucide-react';
import { Alert } from '../../components/feedback/Alert';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { applyToJobApi, getJobApi, getMyApplicationsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Job } from '../../types/jobs';

const DetailList = ({ title, items }: { title: string; items?: string[] }) => {
  if (!items?.length) return null;
  return <section><h2 className="text-lg font-bold text-slate-900">{title}</h2><ul className="mt-3 space-y-2 text-sm text-slate-600">{items.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" /><span>{item}</span></li>)}</ul></section>;
};

export const JobDetailsPage = () => {
  const { jobId = '' } = useParams();
  const { user, isAuthenticated } = useAuthStore();
  const [job, setJob] = useState<Job | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getJobApi(jobId)
      .then((value) => { if (!cancelled) setJob(value); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [jobId]);
  useEffect(() => { if (isAuthenticated && user?.role === 'candidate') void getMyApplicationsApi().then(({ applications }) => { if (applications.some((item) => item.jobId?._id === jobId)) setSubmitted(true); }).catch(() => undefined); }, [isAuthenticated, user?.role, jobId]);

  const apply = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await applyToJobApi(jobId, coverLetter);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit your application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-20"><LoadingSpinner label="Loading job details…" /></div>;
  if (!job) return <div className="space-y-4"><Alert variant="error">{error || 'Job not found.'}</Alert><Link to="/jobs" className="text-sm font-semibold text-teal-700">Back to jobs</Link></div>;

  const deadline = job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : null;
  const salary = new Intl.NumberFormat(undefined, { style: 'currency', currency: job.salaryCurrency, maximumFractionDigits: 0 });

  return <div className="space-y-6">
    <Link to="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700"><ArrowLeft className="h-4 w-4" />Back to jobs</Link>
    <div className="rounded-2xl bg-slate-900 p-7 text-white">
      <p className="flex items-center gap-2 text-sm font-semibold text-teal-300"><Building2 className="h-4 w-4" />{job.companyId?.name}</p>
      <h1 className="mt-2 text-3xl font-bold">{job.title}</h1>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300"><span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location} · {job.workplaceType}</span><span className="flex items-center gap-1.5"><BriefcaseBusiness className="h-4 w-4" />{job.employmentType} · {job.experienceLevel}</span>{deadline && <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />Apply by {deadline}</span>}</div>
    </div>
    {error && <Alert variant="error">{error}</Alert>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card><CardContent className="space-y-7 p-6"><section><h2 className="text-lg font-bold text-slate-900">About the role</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{job.description}</p></section><DetailList title="Responsibilities" items={job.responsibilities} /><DetailList title="Qualifications" items={job.qualifications} /><DetailList title="Benefits" items={job.benefits} /><section><h2 className="text-lg font-bold text-slate-900">Skills</h2><div className="mt-3 flex flex-wrap gap-2">{job.skillsRequired.map((skill) => <span key={skill} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">{skill}</span>)}</div></section></CardContent></Card>
      <div className="space-y-4"><Card><CardHeader><CardTitle>Job overview</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600"><p>{job.openings || 1} opening{job.openings === 1 ? '' : 's'}</p><p>{salary.format(job.salaryMin)} – {salary.format(job.salaryMax)}</p></CardContent></Card>
        {submitted ? <Alert variant="success" title="Application submitted">Track its progress from <Link to="/applications" className="font-semibold underline">My applications</Link>.</Alert> : isAuthenticated && user?.role === 'candidate' ? <Card><CardHeader><CardTitle>Apply now</CardTitle></CardHeader><CardContent><form onSubmit={apply} className="space-y-4"><div><label htmlFor="cover-letter" className="text-sm font-semibold text-slate-700">Cover letter <span className="font-normal text-slate-400">(optional)</span></label><textarea id="cover-letter" value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} maxLength={4000} rows={8} placeholder="Tell the hiring team why this role is a good fit…" className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /><p className="mt-1 text-right text-xs text-slate-400">{coverLetter.length}/4000</p></div><Button type="submit" isLoading={submitting} leftIcon={<Send className="h-4 w-4" />} className="w-full">Submit application</Button></form></CardContent></Card> : !isAuthenticated ? <Link to="/login"><Button className="w-full">Sign in to apply</Button></Link> : <Alert variant="info">Candidate accounts can apply to this role.</Alert>}
      </div>
    </div>
  </div>;
};

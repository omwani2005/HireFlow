import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import bcrypt from 'bcryptjs';
import { Job } from '../src/models/Job.model';
import { Company } from '../src/models/Company.model';
import { Application } from '../src/models/Application.model';
import { Session } from '../src/models/Session.model';
import { Notification } from '../src/models/Notification.model';
import { NotificationService } from '../src/services/notification.service';
import { AccountService } from '../src/services/account.service';
import * as emailService from '../src/services/email.service';
import { env } from '../src/config/env';
import { hashToken } from '../src/utils/token.util';
import { User } from '../src/models/User.model';

const testUri = process.env.TEST_MONGODB_URI;
const integration = testUri ? describe : describe.skip;
const textPdf = () => {
  const objects = ['1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj', '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj', '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj', '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj', '5 0 obj << /Length 110 >> stream\nBT /F1 12 Tf 72 720 Td (Casey Candidate) Tj 0 -18 Td (Skills) Tj 0 -18 Td (TypeScript React Node.js Docker) Tj ET\nendstream endobj'];
  let pdf = '%PDF-1.4\n'; const offsets = [0]; for (const object of objects) { offsets.push(Buffer.byteLength(pdf)); pdf += `${object}\n`; } const xref = Buffer.byteLength(pdf); pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`; return Buffer.from(pdf);
};

integration('isolated API lifecycle', () => {
  const app = createApp();
  let recruiterToken = ''; let otherRecruiterToken = ''; let candidateToken = ''; let jobId = ''; let applicationId = '';
  const registerAndLogin = async (email: string, role: 'candidate' | 'recruiter') => {
    await request(app).post('/api/v1/auth/register').send({ fullName: role === 'candidate' ? 'Casey Candidate' : 'Riley Recruiter', email, password: 'StrongPass123!', role }).expect(201);
    const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'StrongPass123!' }).expect(200);
    return login.body.data.accessToken as string;
  };

  beforeAll(async () => {
    if (!testUri || !/\/hireflow_test(?:\?|$)/.test(testUri) || !/127\.0\.0\.1|localhost/.test(testUri)) throw new Error('Integration tests require an isolated local hireflow_test database');
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000, autoCreate: false, autoIndex: false });
    await mongoose.connection.db!.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map(async model => { await model.createCollection(); await model.createIndexes(); }));
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => { await mongoose.connection.db?.dropDatabase(); await mongoose.disconnect(); });

  it('registers and authenticates candidate and recruiter accounts', async () => {
    recruiterToken = await registerAndLogin('recruiter@example.test', 'recruiter');
    candidateToken = await registerAndLogin('candidate@example.test', 'candidate');
    const invalid = await request(app).post('/api/v1/auth/login').send({ email: 'candidate@example.test', password: 'wrong' });
    expect(invalid.status).toBe(401);
    await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${candidateToken}`).expect(200);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'candidate@example.test', password: 'StrongPass123!' }).expect(200);
    const originalCookie = login.headers['set-cookie'][0].split(';')[0];
    await request(app).post('/api/v1/auth/refresh-token').set('Cookie', originalCookie).expect(200);
    await request(app).post('/api/v1/auth/refresh-token').set('Cookie', originalCookie).expect(401);
  });

  it('creates a company and publishes a recruiter-owned job', async () => {
    await request(app).post('/api/v1/companies').set('Authorization', `Bearer ${recruiterToken}`).send({ name: 'Example Labs', description: 'A fictional software company.', industry: 'Technology', companySize: '11-50', location: 'Remote' }).expect(201);
    const created = await request(app).post('/api/v1/jobs').set('Authorization', `Bearer ${recruiterToken}`).send({ title: 'TypeScript Engineer', description: 'Build secure applicant tracking software.', skillsRequired: ['typescript', 'node'], location: 'Remote', workplaceType: 'remote', employmentType: 'full-time', experienceLevel: 'mid', salaryMin: 70000, salaryMax: 100000, salaryCurrency: 'USD', isSalaryNegotiable: false, status: 'draft', openings: 1, responsibilities: [], qualifications: [], benefits: [] }).expect(201);
    jobId = created.body.data.job._id;
    await request(app).patch(`/api/v1/jobs/${jobId}/status`).set('Authorization', `Bearer ${recruiterToken}`).send({ status: 'published' }).expect(200);
    const publicJobs = await request(app).get('/api/v1/jobs').expect(200);
    expect(publicJobs.body.data.jobs.some((job: { _id: string }) => job._id === jobId)).toBe(true);
  });

  it('applies once, persists history, and prevents duplicates', async () => {
    const applied = await request(app).post(`/api/v1/applications/job/${jobId}`).set('Authorization', `Bearer ${candidateToken}`).send({ coverLetter: 'I build secure TypeScript services.' }).expect(201);
    applicationId = applied.body.data.application._id;
    expect(applied.body.data.application.statusHistory[0].stage).toBe('applied');
    await request(app).post(`/api/v1/applications/job/${jobId}`).set('Authorization', `Bearer ${candidateToken}`).send({}).expect(409);
    const own = await request(app).get('/api/v1/applications/me').set('Authorization', `Bearer ${candidateToken}`).expect(200);
    expect(own.body.data.applications).toHaveLength(1);
  });

  it('rejects oversized resume uploads before parsing or storage', async () => {
    await request(app).post('/api/v1/users/resume').set('Authorization', `Bearer ${candidateToken}`).attach('resume', Buffer.alloc(5 * 1024 * 1024 + 1, 1), { filename: 'large.pdf', contentType: 'application/pdf' }).expect(413);
  });

  it('uploads, parses, and privately downloads a valid resume', async () => {
    const uploaded = await request(app).post('/api/v1/users/resume').set('Authorization', `Bearer ${candidateToken}`).attach('resume', textPdf(), { filename: 'casey-resume.pdf', contentType: 'application/pdf' }).expect(201);
    const candidateId = uploaded.body.data.user._id;
    expect(uploaded.body.data.user.candidateProfile.parsedResume.skills).toContain('typescript');
    await request(app).get(`/api/v1/users/${candidateId}/resume`).set('Authorization', `Bearer ${candidateToken}`).expect('Content-Type', /pdf/).expect(200);
    await request(app).get(`/api/v1/users/${candidateId}/resume`).set('Authorization', `Bearer ${recruiterToken}`).expect(200);
    const applicants = await request(app).get(`/api/v1/applications/job/${jobId}`).set('Authorization', `Bearer ${recruiterToken}`).expect(200);
    expect(applicants.body.data.applications[0].candidateId.candidateProfile.resume.storageKey).toBeUndefined();
  });

  it('enforces recruiter tenant isolation', async () => {
    otherRecruiterToken = await registerAndLogin('other@example.test', 'recruiter');
    await request(app).post('/api/v1/companies').set('Authorization', `Bearer ${otherRecruiterToken}`).send({ name: 'Other Company', description: 'Another fictional company.', industry: 'Technology', companySize: '1-10', location: 'Remote' }).expect(201);
    await request(app).get(`/api/v1/applications/job/${jobId}`).set('Authorization', `Bearer ${otherRecruiterToken}`).expect(403);
    await request(app).patch(`/api/v1/applications/${applicationId}/stage`).set('Authorization', `Bearer ${otherRecruiterToken}`).send({ stage: 'screening' }).expect(403);
  });

  it('updates stage, exposes deterministic match, and creates a candidate notification', async () => {
    const updated = await request(app).patch(`/api/v1/applications/${applicationId}/stage`).set('Authorization', `Bearer ${recruiterToken}`).send({ stage: 'screening', note: 'Qualified for review' }).expect(200);
    expect(updated.body.data.application.statusHistory.at(-1).stage).toBe('screening');
    const match = await request(app).get(`/api/v1/applications/${applicationId}/match`).set('Authorization', `Bearer ${recruiterToken}`).expect(200);
    expect(match.body.data.match).toMatchObject({ matchedSkills: ['typescript', 'node'], missingSkills: [] });
    const notifications = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${candidateToken}`).expect(200);
    expect(notifications.body.data.unreadCount).toBe(1);
  });

  it('allows candidate withdrawal and rejects further terminal transitions', async () => {
    await request(app).patch(`/api/v1/applications/${applicationId}/withdraw`).set('Authorization', `Bearer ${candidateToken}`).expect(200);
    await request(app).patch(`/api/v1/applications/${applicationId}/stage`).set('Authorization', `Bearer ${recruiterToken}`).send({ stage: 'interview' }).expect(409);
  });

  it('enforces admin RBAC and serves platform analytics to admins', async () => {
    await request(app).get('/api/v1/analytics/admin').set('Authorization', `Bearer ${candidateToken}`).expect(403);
    await User.create({ fullName: 'Test Admin', email: 'admin@example.test', passwordHash: await bcrypt.hash('AdminPass123!', 10), role: 'admin', isEmailVerified: true });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@example.test', password: 'AdminPass123!' }).expect(200);
    const response = await request(app).get('/api/v1/analytics/admin').set('Authorization', `Bearer ${login.body.data.accessToken}`).expect(200);
    expect(response.body.data).toMatchObject({ users: 4, candidates: 1, recruiters: 2, jobs: 1, applications: 1 });
  });

  it('rolls back an application when notification persistence fails', async () => {
    const original = await Job.findById(jobId).lean();
    const job = await Job.create({ ...original, _id: new mongoose.Types.ObjectId(), title: 'Rollback job' });
    vi.spyOn(NotificationService, 'notifyCompanyRecruiters').mockRejectedValue(new Error('Injected notification failure'));
    await request(app).post('/api/v1/applications/job/' + job._id).set('Authorization', 'Bearer ' + candidateToken).send({}).expect(500);
    expect(await Application.countDocuments({ jobId: job._id })).toBe(0);
  });

  it('allows only one concurrent use of a refresh token and revokes its family on replay', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'candidate@example.test', password: 'StrongPass123!' }).expect(200);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const responses = await Promise.all([1, 2].map(() => request(app).post('/api/v1/auth/refresh-token').set('Cookie', cookie)));
    expect(responses.map(response => response.status).sort()).toEqual([200, 401]);
    const raw = cookie.slice('refreshToken='.length);
    const original = await Session.findOne({ tokenHash: hashToken(raw) });
    expect(await Session.countDocuments({ familyId: original!.familyId, isRevoked: false })).toBe(0);
  });

  it('replaces GridFS resumes without leaving the previous file behind', async () => {
    const candidate = await User.findOne({ email: 'candidate@example.test' }).select('+candidateProfile.resume.storageKey');
    const oldKey = candidate!.candidateProfile!.resume!.storageKey;
    await request(app).post('/api/v1/users/resume').set('Authorization', 'Bearer ' + candidateToken).attach('resume', textPdf(), { filename: 'replacement.pdf', contentType: 'application/pdf' }).expect(201);
    expect(await mongoose.connection.db!.collection('resumes.files').findOne({ _id: new mongoose.Types.ObjectId(oldKey) })).toBeNull();
  });

  it('paginates applicants and searches within the job instead of the first 100 platform users', async () => {
    const job = await Job.findById(jobId);
    const outsiders = Array.from({ length: 105 }, (_, i) => ({ fullName: 'Search Match ' + i, email: 'outside' + i + '@example.test', passwordHash: 'unused', role: 'candidate' }));
    await User.insertMany(outsiders);
    const applicants = await User.insertMany(Array.from({ length: 21 }, (_, i) => ({ fullName: 'Search Match Applicant ' + i, email: 'applicant' + i + '@example.test', passwordHash: 'unused', role: 'candidate' })));
    await Application.insertMany(applicants.map(candidate => ({ candidateId: candidate._id, jobId: job!._id, companyId: job!.companyId })));
    const page = await request(app).get('/api/v1/applications/job/' + jobId + '?page=2').set('Authorization', 'Bearer ' + recruiterToken).expect(200);
    expect(page.body.data.applications).toHaveLength(2);
    const search = await request(app).get('/api/v1/applications/job/' + jobId + '?search=Search%20Match&limit=50').set('Authorization', 'Bearer ' + recruiterToken).expect(200);
    expect(search.body.data.applications).toHaveLength(21);
    const literal = await request(app).get('/api/v1/applications/job/' + jobId + '?search=%5B').set('Authorization', 'Bearer ' + recruiterToken).expect(200);
    expect(literal.body.data.applications).toHaveLength(0);
  });

  it('preserves candidate application history after job and company archiving', async () => {
    const job = await Job.findById(jobId);
    await request(app).delete('/api/v1/jobs/' + jobId).set('Authorization', 'Bearer ' + recruiterToken).expect(200);
    expect((await Job.findById(jobId))!.archivedAt).toBeTruthy();
    await request(app).get('/api/v1/jobs/' + jobId).expect(404);
    await request(app).delete('/api/v1/companies/' + job!.companyId).set('Authorization', 'Bearer ' + recruiterToken).expect(200);
    const history = await request(app).get('/api/v1/applications/me').set('Authorization', 'Bearer ' + candidateToken).expect(200);
    expect(history.body.data.applications[0].jobId.title).toBeTruthy();
    expect(history.body.data.applications[0].companyId.name).toBe('Example Labs');
    expect((await User.findOne({ email: 'recruiter@example.test' }))!.companyId).toBeNull();
  });

  it('verifies email once and resets passwords with session and access-token invalidation', async () => {
    const previous = env.REQUIRE_EMAIL_VERIFICATION;
    env.REQUIRE_EMAIL_VERIFICATION = true;
    try { await request(app).post('/api/v1/auth/login').send({ email: 'candidate@example.test', password: 'StrongPass123!' }).expect(403); }
    finally { env.REQUIRE_EMAIL_VERIFICATION = previous; }
    const send = vi.spyOn(emailService, 'sendAccountEmail').mockResolvedValue();
    await AccountService.request('candidate@example.test', 'verify');
    const verification = send.mock.calls.at(-1)![2].match(/token=([a-f0-9]+)/)![1];
    await request(app).post('/api/v1/auth/verify-email').send({ token: verification }).expect(200);
    await request(app).post('/api/v1/auth/verify-email').send({ token: verification }).expect(400);
    await AccountService.request('candidate@example.test', 'reset');
    const token = send.mock.calls.at(-1)![2].match(/token=([a-f0-9]+)/)![1];
    const user = await User.findOne({ email: 'candidate@example.test' }).select('+resetTokenHash');
    expect(user!.resetTokenHash).not.toBe(token);
    await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'NewStrongPassword123!' }).expect(200);
    await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'AnotherPassword123!' }).expect(400);
    await request(app).get('/api/v1/users/me').set('Authorization', 'Bearer ' + candidateToken).expect(401);
    expect(await Session.countDocuments({ userId: user!._id })).toBe(0);
    await request(app).post('/api/v1/auth/login').send({ email: 'candidate@example.test', password: 'NewStrongPassword123!' }).expect(200);
  });

  it('rejects expired recovery links and returns the same message for unknown accounts', async () => {
    const send = vi.spyOn(emailService, 'sendAccountEmail').mockResolvedValue();
    await AccountService.request('candidate@example.test', 'reset');
    const token = send.mock.calls.at(-1)![2].match(/token=([a-f0-9]+)/)![1];
    await User.updateOne({ email: 'candidate@example.test' }, { $set: { resetExpiresAt: new Date(0) } });
    await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'NewPassword456!' }).expect(400);
    const known = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'candidate@example.test' }).expect(200);
    const unknown = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nobody@example.test' }).expect(200);
    expect(known.body).toEqual(unknown.body);
  });
});

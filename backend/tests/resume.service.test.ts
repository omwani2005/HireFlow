import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Application } from '../src/models/Application.model';
import { User, IUserDocument } from '../src/models/User.model';
import { ResumeService } from '../src/services/resume.service';
import { StorageService } from '../src/services/storage.service';

const requester = (role: 'candidate' | 'recruiter' | 'admin', companyId?: mongoose.Types.ObjectId) => ({
  _id: new mongoose.Types.ObjectId(),
  role,
  companyId,
}) as unknown as IUserDocument;

describe('ResumeService validation and authorization', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects missing and non-PDF uploads before writing a file', async () => {
    await expect(ResumeService.upload(requester('candidate')))
      .rejects.toMatchObject({ statusCode: 400 });

    const fakeFile = {
      size: 8,
      buffer: Buffer.from('not-pdf!'),
      originalname: 'resume.pdf',
    } as Express.Multer.File;
    await expect(ResumeService.upload(requester('candidate'), fakeFile))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects malformed candidate identifiers', async () => {
    await expect(ResumeService.getResumeFile('not-an-object-id', requester('admin')))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('denies recruiters without an application in their company', async () => {
    vi.spyOn(Application, 'findOne').mockResolvedValue(null);

    await expect(ResumeService.getResumeFile(
      new mongoose.Types.ObjectId().toString(),
      requester('recruiter', new mongoose.Types.ObjectId()),
    )).rejects.toMatchObject({ statusCode: 403 });
  });

  it('parses and stores a valid text PDF while preserving manual profile fields', async () => {
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      '5 0 obj << /Length 110 >> stream\nBT /F1 12 Tf 72 720 Td (Casey Candidate) Tj 0 -18 Td (casey@example.test) Tj 0 -18 Td (Skills) Tj 0 -18 Td (TypeScript React Node.js Docker) Tj ET\nendstream endobj',
    ];
    let pdf = '%PDF-1.4\n'; const offsets = [0];
    for (const object of objects) { offsets.push(Buffer.byteLength(pdf)); pdf += `${object}\n`; }
    const xref = Buffer.byteLength(pdf); pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    vi.spyOn(User, 'findById').mockReturnValue({ select: vi.fn().mockResolvedValue({ candidateProfile: { resume: { storageKey: 'previous.pdf' } } }) } as never);
    vi.spyOn(StorageService, 'put').mockResolvedValue({ storageKey: 'safe-key.pdf' });
    vi.spyOn(StorageService, 'delete').mockResolvedValue();
    const save = vi.fn().mockResolvedValue(undefined);
    const user = { _id: new mongoose.Types.ObjectId(), role: 'candidate', phoneNumber: '', candidateProfile: { headline: 'Manual headline', skills: ['manual-skill'] }, save, toObject() { return JSON.parse(JSON.stringify(this)); } } as unknown as IUserDocument;
    const file = { size: Buffer.byteLength(pdf), buffer: Buffer.from(pdf), originalname: 'resume.pdf' } as Express.Multer.File;

    await ResumeService.upload(user, file);

    expect(StorageService.put).toHaveBeenCalledOnce();
    expect(StorageService.delete).toHaveBeenCalledWith('previous.pdf');
    expect(user.candidateProfile?.headline).toBe('Manual headline');
    expect(user.candidateProfile?.skills).toEqual(['manual-skill']);
    expect(user.candidateProfile?.parsedResume?.skills).toEqual(expect.arrayContaining(['typescript', 'react', 'node.js', 'docker']));
    expect(save).toHaveBeenCalledOnce();
  });
});

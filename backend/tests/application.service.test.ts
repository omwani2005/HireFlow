import mongoose from 'mongoose';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import * as transactions from '../src/utils/transaction';
import { Application } from '../src/models/Application.model';
import { Job } from '../src/models/Job.model';
import { IUserDocument } from '../src/models/User.model';
import { ApplicationService } from '../src/services/application.service';
import { NotificationService } from '../src/services/notification.service';

const companyId = new mongoose.Types.ObjectId();
const otherCompanyId = new mongoose.Types.ObjectId();
const actor = (role: 'candidate' | 'recruiter' | 'admin', company = companyId) => ({
  _id: new mongoose.Types.ObjectId(),
  role,
  companyId: company,
}) as unknown as IUserDocument;

describe('ApplicationService authorization and lifecycle', () => {
  beforeEach(() => { vi.spyOn(transactions, 'transaction').mockImplementation(async work => work(undefined as never)); });
  afterEach(() => vi.restoreAllMocks());

  it('prevents recruiters from reading applicants belonging to another company', async () => {
    vi.spyOn(Job, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(), companyId }),
    } as never);

    await expect(ApplicationService.getRecruiterApplications(
      new mongoose.Types.ObjectId().toString(),
      actor('recruiter', otherCompanyId),
      { page: 1, limit: 20 },
    )).rejects.toMatchObject({ statusCode: 403 });
  });

  it('prevents recruiters from changing another company application', async () => {
    vi.spyOn(Application, 'findById').mockReturnValue({ session: vi.fn().mockResolvedValue({
      companyId,
      stage: 'applied',
    }) } as never);

    await expect(ApplicationService.updateStage(
      new mongoose.Types.ObjectId().toString(),
      { stage: 'screening' },
      actor('recruiter', otherCompanyId),
    )).rejects.toMatchObject({ statusCode: 403 });
  });

  it('persists an authorized stage change and its audit history entry', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const populate = vi.fn().mockResolvedValue({ stage: 'screening' });
    const application = {
      _id: new mongoose.Types.ObjectId(),
      candidateId: new mongoose.Types.ObjectId(),
      jobId: new mongoose.Types.ObjectId(),
      companyId,
      stage: 'applied',
      statusHistory: [],
      save,
      populate,
    };
    const recruiter = actor('recruiter');
    vi.spyOn(Application, 'findById').mockReturnValue({ session: vi.fn().mockResolvedValue(application) } as never);
    vi.spyOn(NotificationService, 'notifyUser').mockResolvedValue(undefined as never);

    const result = await ApplicationService.updateStage(
      new mongoose.Types.ObjectId().toString(),
      { stage: 'screening', note: 'Meets the baseline' },
      recruiter,
    );

    expect(application.stage).toBe('screening');
    expect(application.statusHistory).toEqual([
      expect.objectContaining({
        stage: 'screening',
        changedBy: recruiter._id,
        note: 'Meets the baseline',
      }),
    ]);
    expect(save).toHaveBeenCalledOnce();
    expect(populate).toHaveBeenCalledOnce();
    expect(result).toEqual({ stage: 'screening' });
  });

  it('does not allow a recruiter to reopen a terminal application', async () => {
    vi.spyOn(Application, 'findById').mockReturnValue({ session: vi.fn().mockResolvedValue({
      companyId,
      stage: 'hired',
    }) } as never);

    await expect(ApplicationService.updateStage(
      new mongoose.Types.ObjectId().toString(),
      { stage: 'screening' },
      actor('recruiter'),
    )).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects invalid pipeline jumps', async () => {
    vi.spyOn(Application, 'findById').mockReturnValue({ session: vi.fn().mockResolvedValue({ companyId, stage: 'applied' }) } as never);
    await expect(ApplicationService.updateStage(new mongoose.Types.ObjectId().toString(), { stage: 'offer' }, actor('recruiter'))).rejects.toMatchObject({ statusCode: 409 });
  });
});

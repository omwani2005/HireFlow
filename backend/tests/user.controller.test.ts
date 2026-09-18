import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { updateProfile } from '../src/controllers/user.controller';
import { User } from '../src/models/User.model';

describe('profile updates', () => {
  it('uses dotted candidate fields so resume and parsed data are preserved', async () => {
    const findByIdAndUpdate = vi.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({ _id: 'updated' } as never);
    const req = {
      body: { fullName: 'Updated Candidate', candidateProfile: { headline: 'Engineer', skills: ['typescript'] } },
      user: { _id: new mongoose.Types.ObjectId(), role: 'candidate' },
    };
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });

    await updateProfile(req as never, { status } as never, vi.fn());

    expect(findByIdAndUpdate).toHaveBeenCalledWith(req.user._id, {
      $set: {
        fullName: 'Updated Candidate',
        'candidateProfile.headline': 'Engineer',
        'candidateProfile.skills': ['typescript'],
      },
    }, { new: true, runValidators: true });
  });
});

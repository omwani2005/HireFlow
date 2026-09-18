import { describe, expect, it, vi } from 'vitest';
import { authorize } from '../src/middlewares/rbac.middleware';

describe('role authorization', () => {
  it('allows admin-only access for admins', () => {
    const next = vi.fn(); authorize('admin')({ user: { role: 'admin' } } as never, {} as never, next);
    expect(next).toHaveBeenCalledWith();
  });
  it('rejects non-admins from admin-only access', () => {
    const next = vi.fn(); authorize('admin')({ user: { role: 'recruiter' } } as never, {} as never, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });
});

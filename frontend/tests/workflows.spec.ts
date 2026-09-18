import { expect, test } from '@playwright/test';

const candidate = { _id: 'candidate', fullName: 'Casey Candidate', email: 'casey@example.test', role: 'candidate' };
const application = (id: string) => ({ _id: id, stage: 'applied', createdAt: '2026-01-01', statusHistory: [], jobId: { title: `Job ${id}`, location: 'Remote' }, companyId: { name: 'Example Labs' }, candidateId: candidate });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    let data: unknown = {};
    if (url.pathname.endsWith('/refresh-token')) data = { user: candidate, accessToken: 'test-access' };
    if (url.pathname.endsWith('/health')) data = { status: 'UP', database: 'connected' };
    await route.fulfill({ json: { success: true, data } });
  });
});

test('candidate can reach page two and view legacy missing job references', async ({ page }) => {
  await page.route('**/api/v1/applications/me*', route => {
    const second = new URL(route.request().url()).searchParams.get('page') === '2';
    return route.fulfill({ json: { success: true, data: { applications: second ? [{ ...application('21'), jobId: null, companyId: null }] : Array.from({ length: 20 }, (_, i) => application(String(i + 1))) }, meta: { page: second ? 2 : 1, totalPages: 2, totalRecords: 21 } } });
  });
  await page.goto('/applications');
  await expect(page.getByText('Job 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Unavailable job')).toBeVisible();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
});

test('recruiter can reach applicants on the second page', async ({ page }) => {
  await page.route('**/auth/refresh-token', route => route.fulfill({ json: { success: true, data: { user: { ...candidate, role: 'recruiter' }, accessToken: 'test-access' } } }));
  await page.route('**/applications/job/job*', route => {
    const second = new URL(route.request().url()).searchParams.get('page') === '2';
    return route.fulfill({ json: { success: true, data: { applications: [{ ...application('1'), candidateId: { ...candidate, fullName: second ? 'Page Two Candidate' : 'Page One Candidate' } }] }, meta: { totalPages: 2, totalRecords: 21 } } });
  });
  await page.goto('/recruiter/jobs/job/applicants');
  await expect(page.getByText('Page One Candidate')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page Two Candidate')).toBeVisible();
});

test('email verification requires confirmation and removes the token from the address bar', async ({ page }) => {
  const token = 'a'.repeat(80);
  await page.route('**/auth/verify-email', async route => {
    expect(route.request().postDataJSON()).toEqual({ token });
    await route.fulfill({ json: { message: 'Email verified. You can now sign in.' } });
  });
  await page.goto('/verify-email#token=' + token);
  await expect(page).toHaveURL(/\/verify-email$/);
  await page.getByRole('button', { name: 'Verify email', exact: true }).click();
  await expect(page.getByText('Email verified. You can now sign in.')).toBeVisible();
});

test('a failed session bootstrap offers retry instead of an endless spinner', async ({ page }) => {
  await page.route('**/auth/refresh-token', route => route.abort('failed'));
  await page.goto('/applications');
  await expect(page.getByRole('button', { name: 'Retry connection' })).toBeVisible();
});

test('two tabs serialize refresh requests', async ({ browser }) => {
  const context = await browser.newContext();
  let active = 0;
  let maximum = 0;
  let requests = 0;
  await context.route('**/api/v1/**', async route => {
    if (route.request().url().endsWith('/auth/refresh-token')) {
      active++; requests++; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, 200));
      await route.fulfill({ json: { success: true, data: { user: candidate, accessToken: 'test-access' } } });
      active--;
    } else await route.fulfill({ json: { success: true, data: { status: 'UP', database: 'connected' } } });
  });
  try {
    const first = await context.newPage();
    const second = await context.newPage();
    await Promise.all([first.goto('http://127.0.0.1:4173/login'), second.goto('http://127.0.0.1:4173/login')]);
    await expect.poll(() => requests).toBe(2);
    await expect.poll(() => active).toBe(0);
    expect(maximum).toBe(1);
  } finally { await context.close(); }
});

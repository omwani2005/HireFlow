# HireFlow deployment and operations

## Required before publishing

1. Push the repository and require the HireFlow CI check to pass on the release commit.
2. Provision MongoDB Atlas (or a MongoDB 7+ replica set). Standalone MongoDB is no longer sufficient: application/notification writes, company archiving, and refresh rotation use transactions.
3. Configure an always-on API service, durable GridFS storage, and SMTP with a verified sender. Set `NODE_ENV=production`, `CLIENT_URL` to the exact HTTPS frontend origin (no trailing slash), `MONGODB_URI`, two different random JWT secrets of at least 32 characters, `RESUME_STORAGE_PROVIDER=gridfs`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`. Never copy secrets into Git or frontend settings. Production refuses missing SMTP and development secrets.
4. Prefer `https://app.yourdomain.com` and `https://api.yourdomain.com`. Default Vercel/Render domains make refresh cookies cross-site; verify browser behavior before launch. Use a paid host/plan that permits outbound SMTP. Free Render services may block SMTP ports; select an appropriate plan or implement an HTTPS email-provider adapter.
5. Deploy the Render blueprint (`backend`, build `npm ci && npm run build`, start `npm start`). Configure Atlas's IP access list for the service's outbound ranges and use a restricted database user.
6. Deploy Vercel with root `frontend`, build `npm run build`, output `dist`, and `VITE_API_BASE_URL=https://api.yourdomain.com/api/v1`. Redeploy after changing build-time variables.
7. Bootstrap an administrator from a trusted terminal with production environment variables loaded. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`, then run `npm run bootstrap:admin`. Remove the temporary admin password afterward. This command resets an existing administrator's password.
8. Test registration, verification email/resend, login, reload, multiple tabs, recovery, logout, resume replacement/download, company/job creation, applications, stage changes, notification delivery, pagination, archiving, and tenant access restrictions.

## Verification commands

Backend: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`.
Frontend: `npm ci`, `npm run build`, `npx playwright install chromium`, `npm run test:e2e`.

`npm test` starts a temporary local MongoDB replica set and passes only its URI to the test process. It does not use the application database. The first run downloads a MongoDB binary; set `MONGOMS_DISABLE_POSTINSTALL=1` during installation to defer this download. Set `MONGOMS_SYSTEM_BINARY` if you already have a compatible mongod executable. Browser regression tests mock API responses; the backend integration tests exercise real MongoDB transactions.

## Monitoring

Readiness is `/api/v1/health`: HTTP 200 and UP only when MongoDB is connected; otherwise HTTP 503. Configure an external uptime service to check this URL and alert the operator. A GitHub workflow is also provided: set repository variable `PRODUCTION_API_URL` to the API origin without a trailing slash and enable workflow failure notifications. Scheduled GitHub runs may be delayed and are supplementary monitoring.

Server errors emit structured `request_failed` records with request IDs. Configure the hosting log drain/alerting system for these events and `account_email_failed`. Never log request bodies, cookies, passwords, recovery links, SMTP credentials, or connection strings. Requests receive an `X-Request-ID` response header for support correlation. No external monitoring account or alerts have been activated by the code change.

## Backups and restore drill

Enable managed Atlas backups on a plan that supports your retention requirements. Include every database collection, particularly `resumes.files` and `resumes.chunks`. Set an explicit retention policy, backup owner, alert destination, recovery-point objective, and recovery-time objective.

Before accepting real applicant data, restore a snapshot into a separate cluster/database. Point an isolated staging API at that restored copy using separate credentials and a non-delivering email environment. Confirm application counts, job/company history, and actual resume downloads. Record the restore time and results. Never run tests or restore drills against the live application database. Repeat the drill periodically and before significant data migrations. Cloud backup settings require access to your Atlas account and have not been enabled by this change.

## Rollback

Record the release commit and deployment identifiers before rollout. Deploy to staging first. If checks fail, restore the previous frontend and backend deployment together. Schema additions are additive, but do not roll back past the archiving release after using archiving: older code does not filter archived records. Use a forward fix or a compatible release. Restoring a database snapshot discards newer writes; perform that only with an explicitly approved recovery plan.

## Remaining launch decisions

Supply verified SMTP credentials, final domains, hosting access, backup policy and alert destinations. Existing unverified users must use the resend-verification page before production login. New account emails use single-use 30-minute links; password reset invalidates existing access tokens and refresh sessions. Review applicant-data retention/deletion and recruiter approval policies with the operator before open registration. Archiving preserves history; it is not personal-data erasure.

Reference documentation: [SMTP transport](https://nodemailer.com/smtp), [Render free-service limits](https://render.com/docs/free), [Atlas restore procedures](https://www.mongodb.com/docs/atlas/backup/cloud-backup/restore-overview/).

Local verification completed: 37 backend tests (including isolated replica-set integration tests), 5 Chromium browser regression tests, both production builds, and npm production-dependency audits (zero reported vulnerabilities). SMTP delivery and live cloud infrastructure were not tested or activated.

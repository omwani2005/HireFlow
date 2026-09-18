# HireFlow deployment and operations

## Required before publishing

1. The public repository is [omwani2005/HireFlow](https://github.com/omwani2005/HireFlow). Require CI to pass for the release commit.
2. Provision MongoDB Atlas (or a MongoDB 7+ replica set). Standalone MongoDB is not sufficient: application/notification writes, company archiving, and refresh rotation use transactions.
3. Connect Render and use [Deploy to Render](https://render.com/deploy?repo=https://github.com/omwani2005/HireFlow). The blueprint selects a free service, waits for CI before automatic deployments, and builds the frontend and backend from the repository root. It starts the API with `SERVE_FRONTEND=true` and builds the frontend with `VITE_API_BASE_URL=/api/v1`, so both use the same HTTPS origin. No Vercel account or custom domain is required for this mode.
4. Supply `MONGODB_URI`, `RESEND_API_KEY`, and `EMAIL_FROM`. Verify the sending domain in Resend; a testing sender is not sufficient for arbitrary users. The blueprint generates two different JWT secrets, selects GridFS, and sets `EMAIL_PROVIDER=resend`. This HTTPS transport avoids free-host SMTP-port restrictions. SMTP is also supported using `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` on a host that permits SMTP.
5. Add the service's outbound IP ranges to Atlas's access list and use a database user restricted to the application database. Production startup rejects missing email configuration, placeholder secrets, and local resume storage. Never put database/email secrets in Git or frontend variables.
6. `CLIENT_URL` defaults to Render's generated `RENDER_EXTERNAL_URL`. For custom domains, set it to the exact HTTPS frontend origin without a trailing slash. To retain separate Vercel hosting, leave `SERVE_FRONTEND=false` and set Vercel's `VITE_API_BASE_URL` to the API origin plus `/api/v1`; test third-party-cookie restrictions or use related custom domains.
7. Bootstrap an administrator from a trusted terminal with production environment variables loaded. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`, then run `npm run bootstrap:admin` in backend. Remove the temporary admin password afterward. This command resets an existing administrator's password.
8. Test registration, verification email/resend, login, reload, multiple tabs, recovery, logout, resume replacement/download, company/job creation, applications, stage changes, notification delivery, pagination, archiving, and tenant access restrictions. Use the actual healthy frontend URL on a resume; the Render setup link is not a deployed application URL.

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

Supply Render access, verified email-provider credentials, an accessible Atlas database, backup policy and alert destinations. Existing unverified users must use the resend-verification page before production login. New account emails use single-use 30-minute links; password reset invalidates existing access tokens and refresh sessions. Review applicant-data retention/deletion and recruiter approval policies with the operator before open registration. Archiving preserves history; it is not personal-data erasure.

Reference documentation: [SMTP transport](https://nodemailer.com/smtp), [Render free-service limits](https://render.com/docs/free), [Atlas restore procedures](https://www.mongodb.com/docs/atlas/backup/cloud-backup/restore-overview/).

Local verification completed: 45 backend tests (including isolated replica-set integration tests), 5 Chromium browser regression tests, both production builds, and npm production-dependency audits (zero reported vulnerabilities). Live email delivery and cloud infrastructure have not been activated.

Single-origin hosting uses [Render default variables](https://render.com/docs/environment-variables). HTTPS email delivery follows the [Resend API](https://resend.com/docs/api-reference/emails/send-email).

# HireFlow

[![CI](https://github.com/omwani2005/HireFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/omwani2005/HireFlow/actions/workflows/ci.yml)
[Deploy the API on Render](https://render.com/deploy?repo=https://github.com/omwani2005/HireFlow)

Deploy the frontend on Vercel, the API on Render, and the database on MongoDB Atlas. See [DEPLOYMENT.md](DEPLOYMENT.md) for the deployment order and required settings.

HireFlow is a production-oriented MERN applicant-tracking system with secure multi-device sessions, candidate and recruiter workflows, tenant isolation, explainable talent matching, notifications, analytics, and focused administration.

## Features

- Candidate/recruiter registration and login, rotating opaque refresh tokens, short-lived JWT access tokens, session revocation, protected routes, and server-side RBAC.
- Company-scoped recruiter job management with draft, publish, close, edit, search, pagination, applicant counts, and ownership checks.
- Published job discovery, job details, cover letters, duplicate-safe applications, withdrawal, status history, and application tracking.
- Recruiter applicant search and Kanban pipeline with persisted optimistic stage changes and rollback.
- Candidate profile editing for skills, summary, experience, education, projects, certifications, and location.
- Validated 5 MB PDF resumes, text extraction, structured parsing, private downloads, replacement cleanup, and local or MongoDB GridFS storage.
- Deterministic, explainable candidate/job matching. Scores are decision support only and never auto-reject candidates.
- Persisted notifications for submissions, withdrawals, and stage changes, including unread counts and mark-read actions.
- Real candidate, recruiter, and admin dashboard metrics plus admin-protected platform inspection APIs.
- Helmet, payload caps, CORS allow-listing, trusted-origin checks for cookie mutations, auth rate limiting, production secret validation, and centralized errors.

## Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Zustand, Axios, React Router.
- Backend: Node.js, Express, TypeScript, MongoDB/Mongoose, Zod, JWT, bcrypt, Multer, PDF Parse.
- Deployment: Vercel frontend, Render API, and MongoDB Atlas/GridFS.

## Local setup

Prerequisites: Node.js 22, npm, and a MongoDB 7+ replica set (local or Atlas). Standalone MongoDB is not sufficient for transaction-backed writes.

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
cd backend
npm.cmd ci
npm.cmd run dev
```

In another terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open `http://localhost:5173`. The API defaults to `http://localhost:5000/api/v1`; its health endpoint is `GET /api/v1/health`.

## Environment variables

Backend variables are listed in `backend/.env.example`:

- `NODE_ENV`, `PORT`, `CLIENT_URL` (comma-separated trusted frontend origins are supported).
- `MONGODB_URI`.
- Different high-entropy `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`, plus expiry settings.
- `RESUME_STORAGE_PROVIDER=local|gridfs` and `RESUME_STORAGE_DIR` for local development.

Production startup rejects placeholder/equal JWT secrets. Use `gridfs` on ephemeral hosts; resume bytes remain private in MongoDB and are only streamed through the authorized API.

Frontend uses `VITE_API_BASE_URL=/api/v1`. On Vercel, set `BACKEND_URL` to the Render HTTPS origin; `frontend/vercel.mjs` forwards API requests to it. Vite variables are public, so never put secrets in them.

No external AI key is required. Matching is deterministic and remains available without a third-party provider.

## Verification

```powershell
cd backend
npm.cmd run typecheck
npm.cmd test
npm.cmd run build

cd ../frontend
npm.cmd run typecheck
npm.cmd run build
```

`npm test` provisions and removes an isolated local MongoDB replica set automatically; it never uses the application database. The first run downloads a MongoDB executable. CI runs the same tests and browser regression tests.

## Deploy to Vercel, Render, and Atlas

1. Create or reuse an Atlas cluster and a database user restricted to the application database.
2. Import this repository into Vercel with root directory `frontend` and select Node.js 22. Note the assigned production domain before deploying.
3. Open the Render deploy link above. The blueprint builds only `backend`. Set `CLIENT_URL` to the Vercel HTTPS origin, `MONGODB_URI` to the Atlas connection string, and supply a Resend `RESEND_API_KEY` and verified `EMAIL_FROM`. JWT secrets are generated and resume storage uses GridFS.
4. Allow the Render service's outbound addresses in Atlas and verify `https://<render-service>/api/v1/health` returns HTTP 200.
5. Set Vercel `BACKEND_URL=https://<render-service>` and `VITE_API_BASE_URL=/api/v1`, then deploy. API requests pass through Vercel to Render, keeping refresh cookies on the frontend origin.
6. Verify registration/verification, login, reload, resume upload/download, and recruiter/candidate workflows on the Vercel URL.

Provision the first admin from a trusted terminal with the production backend environment loaded:

```powershell
$env:ADMIN_EMAIL='admin@example.com'
$env:ADMIN_PASSWORD='<a unique 12+ character password>'
$env:ADMIN_FULL_NAME='Platform Administrator'
npm.cmd run bootstrap:admin
```

`frontend/vercel.mjs` supplies the API proxy and SPA fallback. Vercel configuration requires `BACKEND_URL`; local Vite development does not. When the Vercel production domain changes, update Render `CLIENT_URL` as well. Preview deployments need an explicitly allowed origin and should use a staging backend/database.

## Post-deployment checklist

- Health endpoint is online and database status is connected.
- Production CORS accepts the deployed frontend and rejects unrelated origins.
- Candidate can register, edit a profile, upload/download a PDF, browse a published job, apply, and view the application.
- Recruiter can create a company/job, publish it, inspect an applicant and match score, download the authorized resume, and update the pipeline.
- Candidate sees the resulting notification and updated stage.
- Admin credentials created through a controlled database/bootstrap process can open the protected admin dashboard.
- Refresh, logout, and logout-all operate over HTTPS with secure HTTP-only cookies.

## Known limitations

- Resume extraction is heuristic and intended for text-based PDFs; scanned/image-only or complex layouts can be rejected or sparse.
- GridFS is deployment-safe but increases database storage usage. Large-scale deployments may substitute a private S3-compatible adapter behind the same storage service.
- Matching is deterministic keyword/profile comparison, not a hiring decision or semantic AI model.
- Email verification and password recovery support Resend HTTPS and SMTP and required for production login. Interview scheduling, SMS, and WebSocket delivery remain future enhancements.

See [DEPLOYMENT.md](DEPLOYMENT.md) for SMTP setup, production gates, browser testing, monitoring, backups, restore drills, and rollback. Cloud services still require operator configuration.

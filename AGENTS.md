# Repository Guidelines

## Project Structure & Module Organization
- Root: orchestrates dev scripts (`package.json`).
- `client/`: React app (CRA). Source in `client/src`, styles in `client/src/styles`, pages in `client/src/pages`, components in `client/src/components`.
- `server/`: Express + MongoDB API. Routes in `server/routes`, models in `server/models`, middleware in `server/middleware`, config in `server/config`, uploads in `server/uploads`.
- `docs/`: Documentation assets.

## Build, Test, and Development Commands
- Start both apps (root): `npm run dev` (starts client and API with concurrently).
- Client dev: `npm start --prefix client` (defaults to port 3001).
- Client build: `npm run build --prefix client` (outputs to `client/build`).
- Server dev: `npm run server --prefix server` (nodemon on `server/server.js`).
- Seed database: `npm run seed --prefix server`.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; prefer trailing semicolons and single quotes in JS.
- React: components and pages in PascalCase (e.g., `AdminDashboard.js`), hooks and utilities in camelCase.
- Server: Mongoose models in PascalCase (e.g., `Business.js`), other modules camelCase (e.g., `emailService.js`).
- Linting: CRA ESLint defaults (`react-app`); align with existing patterns in this repo.

## Testing Guidelines
- Client: Jest + React Testing Library via CRA.
  - Run tests: `npm test --prefix client`.
  - Coverage: `npm test --prefix client -- --coverage`.
  - Name tests `*.test.js` near the component or under `__tests__/`.
- Server: no tests yet; prefer supertest + jest for new APIs (optional PRs welcome).

## Commit & Pull Request Guidelines
- Commits: concise, present tense, describe intent (“email verification added”, “login state corrected”). Reference issues when applicable.
- Prefer small, focused commits. Group refactors separate from feature changes.
- PRs: include description, scope, screenshots for UI changes (before/after), steps to reproduce/test, and any env or seeding needs.

## Security & Configuration Tips
- Server env (`server/.env`): `MONGODB_URI`, `PORT`, `JWT_SECRET`, SMTP settings if email is enabled.
- Client env (`client/.env`): `REACT_APP_API_URL` (e.g., `http://localhost:3000/api`).
- Do not commit `.env` or `server/uploads/` artifacts. Never expose secrets in the client.


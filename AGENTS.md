# Extractor-Data — AGENTS.md

**Monorepo**: Angular 21+ (standalone, no NgModules) + Node.js/Express backend. Two independent npm packages (`frontend/`, `backend/`).

## Dev commands

From monorepo root:
```bash
npm run install:all   # install both packages
npm run frontend      # cd frontend && npm start (port 4200)
npm run backend       # cd backend && npm run dev (port 3000)
```

| Task | Command | Notes |
|------|---------|-------|
| Frontend dev | `cd frontend && npm start` | ng serve, port 4200 |
| Frontend test | `cd frontend && ng test` | Uses vitest via `@angular/build:unit-test`. No standalone vitest config. Only 1 spec file (`app.spec.ts`). |
| Frontend build | `cd frontend && npm run build` | Prod build via `@angular/build` |
| Frontend watch | `cd frontend && npm run watch` | Dev watch build |
| Backend dev | `cd backend && npm run dev` | ts-node + nodemon, port 3000 |
| Backend build | `cd backend && npm run build` | tsc → `backend/dist/` |
| Backend prod | `cd backend && npm start` | Runs `dist/index.js` |
| Typecheck | Both: `cd <pkg> && npx tsc --noEmit` | Frontend uses strict TS + strict templates |
| Formatter | `cd frontend && npx prettier --write "src/**/*.ts"` | Prettier in frontend/package.json: printWidth 100, singleQuote |

**No linting configured** (ESLint not present in either package).

## Outdated docs

- `CONTRIBUTING.md` and `docs/SETUP.md` both mention `ng lint` — skip that step, it will fail.
- `docs/STRUCTURE.md` lists a `styles/_variables.css` and `backend/src/config/` dir that don't actually exist.

## Architecture

### Frontend (`frontend/`)

- **Standalone components**, `bootstrapApplication`. Routes in `src/app/app.routes.ts` with lazy loading via `loadComponent`.
- **Entry**: `src/main.ts` → `app.ts` (root) → `app.routes.ts`.
- **Route flow** (all children of `dashboard` layout):
  - `/` → redirects to `/subir`
  - `/subir` — upload-section (file upload)
  - `/columnas` — column-selection-section (guard: `requiereArchivoSubidoGuard`)
  - `/vista-previa` — preview-workspace-section (guard: `requiereColumnasDetectadasGuard`)
  - `/generador-sql` — sql-generator-section (guard: `requiereColumnasDetectadasGuard`)
  - Guards enforce sequential flow.
- **State**: `ExtractionSessionService` (providedIn: root) holds upload/columns/preview state as signals. `DashboardEventBusService` coordinates cross-component events.
- **CSS**: Native CSS (no Tailwind). BEM convention. Global vars in `src/styles.css` (`:root`). Extraction UI in `src/styles/extraction-ui/`. Dark mode via `.theme--dark` class.
- **DI**: `inject()` or constructor. Services use `providedIn: 'root'`.
- **RxJS**: `takeUntilDestroyed()` or `async` pipe. `switchMap`/`mergeMap` instead of nested subscribes.
- **`URL_SERVIDOR`**: Hardcoded to `http://localhost:3000` in `extraction-session.service.ts:12`. Change for different API origins.
- **packageManager**: Pinned to `npm@11.6.2` in `frontend/package.json`. Use npm, not pnpm/yarn.
- **EditorConfig**: `frontend/.editorconfig` — 2-space indent, UTF-8, single quotes for TS.

### Backend (`backend/`)

- **Entry**: `src/index.ts` — Express app. Loads `.env` from `../../.env` (monorepo root, NOT `backend/.env`).
- **Layers**: `routes/` → `controllers/` → `utils/`. Middleware in `middleware/`.
- **API endpoints** (prefix `/api`):
  `GET /health` · `POST /upload` (multipart, field `file`) · `GET /sheets/:filename` · `GET /columns/:filename` · `POST /extract` · `POST /generate-sql`
- **Response format**: `{ success: boolean, data?: any, message?: string }` (no `error` field in responses).
- **Uploads**: Max 10MB. Allowed: `.xlsx`, `.xls`, `.csv`, `.dat`. Stored in `backend/uploads/`. Auto-cleanup every 5 min, files expire after 2 min (`UPLOAD_MAX_AGE_MS=120000`). Cleanup interval configurable via `UPLOAD_CLEANUP_INTERVAL_MS` env var.
- **Extract limit**: `MAX_EXTRACT_ROWS = 5000` in `utils/extract-matrix.util.ts:8`.
- **SQL generation**: Supports `mysql` and `postgresql` dialects. Optional `CREATE TABLE IF NOT EXISTS` + `INSERT` statements.
- **No test framework or lint config** in backend.

## Conventions

- **Commits**: Conventional Commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`. Scopes optional.
- **Naming**: Components PascalCase (`upload.component.ts`), services camelCase (`excel.service.ts`), models PascalCase (`extraction.model.ts`). File suffix by type.
- **Component file structure**: `name.component.ts`, `.html`, `.css`, `.spec.ts` co-located in feature dirs.
- **Backend file structure**: `routes/*.routes.ts`, `controllers/*.controller.ts`, `middleware/*.middleware.ts`, `utils/*.util.ts`.

## History

`.cursor/plans/` contains outdated tactical plans already applied to the code. The app was refactored from a monolithic `app.ts` to lazy-loaded feature components. References to old names (`pasoVisual`, `idArchivoEnServidor`, `URL_SERVIDOR`) were from the old monolithic component; the current architecture uses `ExtractionSessionService` and route-based flow.

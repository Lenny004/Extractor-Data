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
| Frontend test | `cd frontend && ng test` | `@angular/build:unit-test` (vitest + jsdom). No standalone vitest config. Only 1 spec file (`app.spec.ts`). |
| Frontend build | `cd frontend && npm run build` | Prod via `@angular/build:application` |
| Frontend watch | `cd frontend && npm run watch` | Dev watch build |
| Backend dev | `cd backend && npm run dev` | nodemon + ts-node, port 3000 |
| Backend build | `cd backend && npm run build` | tsc → `backend/dist/` |
| Backend prod | `cd backend && npm start` | Runs `dist/index.js` |
| Typecheck | `cd <pkg> && npx tsc --noEmit` | Frontend: strict TS + strict templates. Backend: strict. |
| Formatter | `cd frontend && npx prettier --write "src/**/*.ts"` | printWidth 100, singleQuote, angular parser for HTML |

**No linting configured** (ESLint not present in either package).

## Outdated docs

- `CONTRIBUTING.md` and `docs/SETUP.md` mention `ng lint` — skip it, will fail.
- `docs/STRUCTURE.md` and `docs/SETUP.md` reference `styles/_variables.css` and `backend/src/config/` — neither exist.
- `docs/SETUP.md` lists `@angular/material`, `prismjs` dependencies not in `package.json`.
- `.cursor/rules/css-guide.mdc` references `_variables.css` (stale — global vars are in `src/styles.css` `:root`).

## Architecture

### Frontend (`frontend/`)

- **Standalone components**, `bootstrapApplication`. Entry: `src/main.ts` → `app.ts` → `app.routes.ts`.
- **Lazy-loaded routes** (children of `dashboard` layout):
  - `/` → redirects to `/subir`
  - `/subir` — upload-section
  - `/columnas` — column-selection-section (guard: `requiereArchivoSubidoGuard`)
  - `/vista-previa` — preview-workspace-section (guard: `requiereColumnasDetectadasGuard`)
  - `/generador-sql` — sql-generator-section (guard: `requiereColumnasDetectadasGuard`)
- **State**: `ExtractionSessionService` (providedIn: root) holds all state as signals. `DashboardEventBusService` coordinates cross-component events.
- **CSS**: Native CSS (no Tailwind). BEM convention. Global vars in `src/styles.css` (`:root`). Extraction UI styles in `src/styles/extraction-ui.css` (imports 14 modular files from `extraction-ui/`). Dark mode via `.theme--dark` class.
- **`URL_SERVIDOR`**: Hardcoded to `http://localhost:3000` in `extraction-session.service.ts:12`.
- **packageManager**: Pinned to `npm@11.6.2`. Use npm, not pnpm/yarn.
- **EditorConfig**: `frontend/.editorconfig` — 2-space indent, UTF-8, single quotes for TS.

### Backend (`backend/`)

- **Entry**: `src/index.ts` — Express app. Loads `.env` from `../../.env` (monorepo root, NOT `backend/.env`).
- **Layers**: `routes/` → `controllers/` → `utils/`. Middleware in `middleware/`.
- **API endpoints** (prefix `/api`):
  `GET /health` · `POST /upload` (multipart, field `file`) · `GET /sheets/:filename` · `GET /columns/:filename` · `POST /extract` · `POST /generate-sql`
- **Response format**: `{ success: boolean, data?: any, message?: string }` (never `error` field).
- **Uploads**: Max 10MB. Allowed: `.xlsx`, `.xls`, `.csv`, `.dat`. Stored in `backend/uploads/`. Auto-cleanup every 5 min, files expire after 2 min (`UPLOAD_MAX_AGE_MS=120000` in `utils/file.utils.ts`).
- **Extract limit**: `MAX_EXTRACT_ROWS = 5000` in `utils/extract-matrix.util.ts:8`.
- **SQL generation**: Supports `mysql` and `postgresql` dialects. Optional `CREATE TABLE` + `INSERT` statements.
- **No test or lint config** in backend.

## Conventions

- **Commits**: Conventional Commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`. Scopes optional.
- **Naming**: Components PascalCase (`upload.component.ts`), services camelCase (`excel.service.ts`), models PascalCase (`extraction.model.ts`). File suffix by type.
- **Component file structure**: `name.component.ts`, `.html`, `.css`, `.spec.ts` co-located in feature dirs.
- **Backend file structure**: `routes/*.routes.ts`, `controllers/*.controller.ts`, `middleware/*.middleware.ts`, `utils/*.util.ts`.

## Additional references

- `.cursor/rules/` contains 4 MDC files with detailed conventions (project-conventions, angular-standards, backend-standards, css-guide). May contain stale references but is the closest to formal standards.
- `.cursor/plans/` contains outdated tactical plans from a refactoring pass already applied to the code.

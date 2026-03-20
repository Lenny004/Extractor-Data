# Extractor-Data

Extractor y transformador de datos Excel (XLSX/XLS/CSV) a SQL. Full-stack monorepo construido con Angular 21+ y Node.js/Express.

## Requisitos

- Node.js 20+
- npm 9+ o pnpm 8+
- Angular CLI 21+ (`npm install -g @angular/cli@21`)

## Inicio Rápido

```bash
# Clonar
git clone <url> Extractor-Data && cd Extractor-Data

# Frontend
cd frontend && npm install && npm start

# Backend (en otra terminal)
cd backend && npm install && npm run dev
```

- **Frontend**: http://localhost:4200  
- **Backend**: http://localhost:3000  

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [docs/SETUP.md](docs/SETUP.md) | Guía de instalación paso a paso |
| [docs/STRUCTURE.md](docs/STRUCTURE.md) | Estructura de carpetas del proyecto |
| [docs/API.md](docs/API.md) | Endpoints de la API (backend) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Guía de contribución y estándares |

## Stack

- **Frontend**: Angular 21+, @angular/material, xlsx, RxJS, Prism.js/Highlight.js, CSS nativo
- **Backend**: Node.js 18+, Express
- **Almacenamiento**: LocalStorage (frontend), base de datos o caché (backend)
- **Validación**: Archivos hasta 10MB, formatos .xlsx, .xls, .csv

## Versionado

[SemVer](https://semver.org/) (MAJOR.MINOR.PATCH).

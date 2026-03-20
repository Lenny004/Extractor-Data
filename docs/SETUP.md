# Guía de Instalación - Extractor-Data

## Requisitos Previos

- **Node.js** 18+ (recomendado LTS)
- **npm** 9+ o **pnpm** 8+
- **Angular CLI** 17+ (`npm install -g @angular/cli@17`)
- **Git**

---

## 1. Clonar el Repositorio

```bash
git clone <url-repositorio> Extractor-Data
cd Extractor-Data
```

---

## 2. Instalación Frontend (Angular)

El proyecto ya incluye la estructura base. Tras clonar:

### Paso 2.1: Instalar dependencias

```bash
cd frontend
npm install
```

Dependencias incluidas: `xlsx`, `@angular/material@17`, `@angular/cdk@17`, `prismjs`, `@types/prismjs`.

### Paso 2.2: Estructura de carpetas (ya creada)

- `src/app/components/`, `services/`, `models/`, `utils/`, `core/`, `shared/`, `styles/`
- Variables CSS en `src/app/styles/_variables.css`
- **No usar Tailwind**; solo CSS nativo

### Paso 2.3: Ejecutar frontend

```bash
npm start
# o: ng serve
# Abre http://localhost:4200
```

---

## 3. Instalación Backend (Node.js/Express)

El backend ya incluye la estructura base. Tras clonar:

### Paso 3.1: Instalar dependencias

```bash
cd backend
npm install
```

Dependencias: `express`, `cors`, `multer`, TypeScript, `ts-node`, `nodemon`.

### Paso 3.2: Estructura (ya creada)

- `src/index.ts` (entry point con health check)
- `src/routes/`, `controllers/`, `middleware/`, `utils/`, `config/`

### Paso 3.3: Ejecutar backend

```bash
npm run dev
# Por defecto en http://localhost:3000 (o puerto configurado)
```

---

## 4. Configuración del Repositorio

### Archivos necesarios

- `.gitignore` (ver sección correspondiente en este documento)
- `README.md` (instrucciones de inicio rápido)
- `CONTRIBUTING.md` (guía de contribución)

### Comandos post-clone

```bash
# Desde la raíz del proyecto
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

---

## 5. Verificación Final

| Verificación | Comando | Resultado esperado |
|--------------|---------|--------------------|
| Frontend | `cd frontend && npm start` | App en http://localhost:4200 |
| Backend | `cd backend && npm run dev` | Servidor en http://localhost:3000 |
| Linting | `cd frontend && ng lint` | Sin errores críticos |

---

## Resumen de Dependencias

### Frontend
- `@angular/core`, `@angular/material`, `@angular/cdk`, `@angular/animations`
- `xlsx` (procesamiento Excel)
- `rxjs`
- `prismjs` o `highlight.js` (syntax highlighting)
- CSS nativo (sin Tailwind)

### Backend
- `express`, `cors`, `multer`
- TypeScript, `ts-node`, `nodemon`

### Validación de archivos
- Tamaño máximo: 10 MB
- Formatos: `.xlsx`, `.xls`, `.csv`

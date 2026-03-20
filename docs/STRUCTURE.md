# Estructura del Proyecto Extractor-Data

Monorepo con frontend Angular y backend Node.js en carpetas separadas.

## Árbol de Carpetas

```
Extractor-Data/
├── .cursor/
│   ├── rules/                    # Reglas de Cursor (convenciones, estándares)
│   │   ├── project-conventions.mdc
│   │   ├── angular-standards.mdc
│   │   ├── backend-standards.mdc
│   │   └── css-guide.mdc
│   └── skills/                   # Skills del proyecto (opcional)
│       └── extractor-workflow/
├── docs/                         # Documentación del proyecto
│   ├── STRUCTURE.md              # Este archivo
│   ├── SETUP.md                  # Guía de instalación
│   ├── API.md                    # Documentación de endpoints (backend)
│   └── SKILLS.md                 # Competencias requeridas por rol
├── frontend/                     # Aplicación Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/       # Componentes reutilizables
│   │   │   │   └── [Nombre]Component/
│   │   │   │       ├── nombre.component.ts
│   │   │   │       ├── nombre.component.html
│   │   │   │       ├── nombre.component.css
│   │   │   │       └── nombre.component.spec.ts
│   │   │   ├── services/         # Servicios (camelCase.service.ts)
│   │   │   ├── models/           # Interfaces y tipos
│   │   │   ├── utils/            # Utilidades y helpers
│   │   │   ├── core/             # Módulos singleton (auth, guards)
│   │   │   ├── shared/           # Módulos compartidos
│   │   │   └── styles/           # Variables CSS globales, mixins
│   │   │       ├── _variables.css
│   │   │       ├── _mixins.css
│   │   │       └── _reset.css
│   │   ├── assets/
│   │   └── environments/
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
├── backend/                      # API Node.js/Express
│   ├── src/
│   │   ├── routes/               # Rutas de la API
│   │   ├── controllers/          # Controladores
│   │   ├── middleware/           # Validación, CORS, errores
│   │   ├── utils/                # Helpers, generación SQL
│   │   └── config/               # Configuración
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
├── README.md
├── CONTRIBUTING.md
└── package.json                  # Scripts raíz (opcional, para monorepo)
```

## Convenciones de Carpetas

| Carpeta | Propósito |
|---------|-----------|
| `components/` | Componentes con sufijo `Component`, PascalCase |
| `services/` | Servicios con sufijo `Service`, camelCase |
| `models/` | Interfaces, tipos, DTOs |
| `utils/` | Funciones puras, helpers sin estado |
| `core/` | Servicios singleton, guards, interceptors |
| `shared/` | Módulos compartidos entre features |
| `styles/` | Variables CSS, mixins, reset global |

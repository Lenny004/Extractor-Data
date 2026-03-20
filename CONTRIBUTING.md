# Guía de Contribución

## Estándares de Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):

| Prefijo | Uso |
|---------|-----|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de bug |
| `docs:` | Cambios en documentación |
| `style:` | Formato, espacios, sin cambio de lógica |
| `refactor:` | Refactorización de código |
| `test:` | Añadir o modificar tests |
| `chore:` | Tareas de mantenimiento, dependencias |

**Ejemplos:**
```
feat(extractor): add CSV validation
fix(upload): handle files over 10MB
docs: update API endpoints
```

## Pull Requests

1. Crear rama desde `main`: `git checkout -b feat/nombre-descriptivo`
2. Hacer commits con convenciones semánticas
3. Ejecutar `ng lint` (frontend) y tests antes de abrir PR
4. Descripción clara: qué cambia, por qué, cómo probar
5. Vincular issues si aplica

## Code Review

- Revisar lógica, seguridad y manejo de errores
- Verificar convenciones de nombres y estructura
- Comprobar que no hay código comentado innecesario
- Aprobar solo cuando esté listo para merge

## Versionado Semántico

- **MAJOR**: Cambios incompatibles en API
- **MINOR**: Nueva funcionalidad compatible
- **PATCH**: Correcciones compatibles

## Estructura de Carpetas

Ver [docs/STRUCTURE.md](docs/STRUCTURE.md).

## Convenciones de Código

- **Componentes**: PascalCase, sufijo `Component`, archivo `nombre.component.ts`
- **Servicios**: camelCase, sufijo `Service`, archivo `nombre.service.ts`
- **CSS**: BEM o convención similar, variables en `styles/_variables.css`

## Documentación de API

Documentar endpoints en `docs/API.md` al añadir o modificar rutas del backend.

# Documentación de API - Backend

## Base URL

```
http://localhost:3000/api
```

## Endpoints

Documentar aquí los endpoints conforme se implementen.

### Ejemplo de estructura

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/upload` | Subir archivo Excel/CSV |
| POST | `/extract` | Extraer filas y columnas seleccionadas |
| POST | `/generate-sql` | Generar script SQL (`CREATE` opcional + `INSERT`) desde el mismo cuerpo que `/extract` más `tableName`, `dialect`, etc. |
| GET | `/health` | Health check |

### Formato de respuesta

**Éxito:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Código de error",
  "message": "Descripción legible"
}
```

### Validación de archivos

- Tamaño máximo: 10 MB
- Formatos permitidos: `.xlsx`, `.xls`, `.csv`

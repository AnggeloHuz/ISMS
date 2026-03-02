# 📡 ISMS — Documentación de Endpoints

> **Base URL:** `http://localhost:3000/api`

---

## 🟢 Health Check

Verifica que el servidor esté activo y funcionando.

| Propiedad | Valor            |
| --------- | ---------------- |
| **Ruta**  | `/api/health`    |
| **Método**| `GET`            |

### Ejemplo de petición

```bash
curl http://localhost:3000/api/health
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "servicio": "ISMS",
  "entorno": "development",
  "fecha": "2026-03-02T18:31:28.000Z"
}
```

---

## 💾 Backup de Base de Datos

Crea un respaldo completo (`.sql`) de la base de datos MySQL usando `mysqldump`.

| Propiedad | Valor            |
| --------- | ---------------- |
| **Ruta**  | `/api/backup`    |
| **Método**| `POST`           |

### Ejemplo de petición

```bash
curl -X POST http://localhost:3000/api/backup
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "mensaje": "Respaldo creado exitosamente.",
  "archivo": "backup_2026-03-02_14-31-28.sql",
  "ruta": "C:\\Users\\...\\ISMS\\backups\\backup_2026-03-02_14-31-28.sql",
  "fecha": "2026-03-02T18:31:28.000Z"
}
```

### Respuesta de error — `500 Internal Server Error`

```json
{
  "estado": "error",
  "mensaje": "No se pudo crear el respaldo de la base de datos.",
  "detalle": "Error al ejecutar mysqldump: ..."
}
```

> **Requisito:** `mysqldump` debe estar disponible en el PATH de Windows.

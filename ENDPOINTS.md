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

---

## 👥 Crear Usuario

Crea un nuevo usuario en el sistema.

| Propiedad | Valor            |
| --------- | ---------------- |
| **Ruta**  | `/api/users`     |
| **Método**| `POST`           |
| **Roles** | `administrador`  |

### Autenticación Requerida

Al realizar login con `/api/auth/login`, recibes una cookie (`token`) que se enviará automáticamente en cada petición posterior al API.

También puedes seguir enviando el token en el header si lo prefieres:
```http
Authorization: Bearer <tu_token_jwt>
```

### Ejemplo de petición (Body)

```json
{
  "nombre_usuario": "juanp",
  "clave_acceso": "secreta123",
  "nombre_completo": "Juan Pérez",
  "rol": "cajero"
}
```

*Roles permitidos: `administrador`, `cajero`, `almacenista`.*

### Respuesta exitosa — `201 Created`

```json
{
  "estado": "ok",
  "mensaje": "Usuario creado exitosamente.",
  "usuario": {
    "id": 2,
    "nombre_usuario": "juanp",
    "nombre_completo": "Juan Pérez",
    "rol": "cajero",
    "esta_activo": true
  }
}
```

### Respuestas de error

**`400 Bad Request`** (Errores de validación)
```json
{
  "estado": "error",
  "mensaje": "No se pudo crear el usuario.",
  "detalle": "El nombre de usuario 'juanp' ya está en uso."
}
```

**`401 Unauthorized`** (Token faltante o inválido)
```json
{
  "estado": "error",
  "mensaje": "Acceso denegado. No se proporcionó un token válido."
}
```

**`403 Forbidden`** (Rol incorrecto)
```json
{
  "estado": "error",
  "mensaje": "Acceso denegado. Se requiere uno de los siguientes roles: administrador."
}
```

---

## 🔐 Iniciar Sesión

Valida las credenciales del usuario y establece una cookie segura (HTTP-only) con el token JWT.

| Propiedad | Valor            |
| --------- | ---------------- |
| **Ruta**  | `/api/auth/login`|
| **Método**| `POST`           |
| **Roles** | `Cualquiera`     |

### Ejemplo de petición (Body)

```json
{
  "nombre_usuario": "juanp",
  "clave_acceso": "secreta123"
}
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "mensaje": "Inicio de sesión exitoso.",
  "usuario": {
    "id": 2,
    "nombre_usuario": "juanp",
    "nombre_completo": "Juan Pérez",
    "rol": "cajero"
  }
}
```

> **Nota HTTP:** En la respuesta exitosa vendrá un Header `Set-Cookie` que contiene el token JWT.

### Respuesta de error — `401 Unauthorized`

```json
{
  "estado": "error",
  "mensaje": "Credenciales inválidas."
}
```

---

## 🚪 Cerrar Sesión

Invalida la sesión actual eliminando la cookie de autenticación en el cliente.

| Propiedad | Valor            |
| --------- | ---------------- |
| **Ruta**  | `/api/auth/logout`|
| **Método**| `POST`           |
| **Roles** | `Cualquiera`     |

### Ejemplo de petición

```bash
curl -X POST http://localhost:3000/api/auth/logout
```

*(Si usas el navegador o Postman con la cookie guardada, se enviará la cookie automáticamente y el servidor la eliminará).*

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "mensaje": "Cierre de sesión exitoso."
}
```

> **Nota HTTP:** En la respuesta exitosa vendrá un Header `Set-Cookie` invalidando la fecha de expiración del token.

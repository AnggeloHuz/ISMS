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

## 👥 Listar Usuarios

Lista todos los usuarios del sistema con paginación. No expone la contraseña.

| Propiedad | Valor            |
| --------- | ---------------- |
| **Ruta**  | `/api/users`     |
| **Método**| `GET`            |
| **Roles** | `administrador`  |

### Parámetros de Query

| Parámetro | Tipo   | Default | Descripción                   |
| --------- | ------ | ------- | ----------------------------- |
| `page`    | number | `1`     | Número de página              |
| `limit`   | number | `10`    | Cantidad de registros por página (máx. 100) |

### Ejemplo de petición

```bash
curl http://localhost:3000/api/users?page=1&limit=10
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "usuarios": [
    {
      "id": 1,
      "nombre_usuario": "admin",
      "nombre_completo": "Administrador del Sistema",
      "rol": "administrador",
      "esta_activo": true,
      "fecha_registro": "2026-03-02T18:00:00.000Z"
    }
  ],
  "paginacion": {
    "total": 1,
    "pagina": 1,
    "limite": 10,
    "totalPaginas": 1
  }
}
```

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

## 🔑 Actualizar Contraseña de Usuario

Permite al administrador cambiar la contraseña de cualquier usuario.

| Propiedad | Valor                      |
| --------- | -------------------------- |
| **Ruta**  | `/api/users/:id/password`  |
| **Método**| `PATCH`                    |
| **Roles** | `administrador`            |

### Ejemplo de petición (Body)

```json
{
  "nueva_clave": "nuevaContraseña456"
}
```

*La contraseña debe tener al menos 6 caracteres.*

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "id": 2,
  "mensaje": "Contraseña actualizada correctamente."
}
```

### Respuestas de error

**`400 Bad Request`**
```json
{
  "estado": "error",
  "mensaje": "No se pudo actualizar la contraseña.",
  "detalle": "La contraseña debe tener al menos 6 caracteres."
}
```

---

## 🏷️ Actualizar Rol de Usuario

Permite al administrador cambiar el rol de un usuario.

| Propiedad | Valor                  |
| --------- | ---------------------- |
| **Ruta**  | `/api/users/:id/role`  |
| **Método**| `PATCH`                |
| **Roles** | `administrador`        |

### Ejemplo de petición (Body)

```json
{
  "nuevo_rol": "almacenista"
}
```

*Roles permitidos: `administrador`, `cajero`, `almacenista`.*

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "mensaje": "Rol actualizado exitosamente.",
  "usuario": {
    "id": 2,
    "nombre_usuario": "juanp",
    "nuevo_rol": "almacenista"
  }
}
```

### Respuestas de error

**`400 Bad Request`**
```json
{
  "estado": "error",
  "mensaje": "No se pudo actualizar el rol.",
  "detalle": "Rol inválido. Roles permitidos: administrador, cajero, almacenista"
}
```

---

## 🗑️ Eliminar Usuario (Soft Delete)

Desactiva un usuario estableciendo `esta_activo = false`. No elimina el registro de la base de datos.

| Propiedad | Valor            |
| --------- | ---------------- |
| **Ruta**  | `/api/users/:id` |
| **Método**| `DELETE`         |
| **Roles** | `administrador`  |

### Ejemplo de petición

```bash
curl -X DELETE http://localhost:3000/api/users/2
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "id": 2,
  "nombre_usuario": "juanp",
  "mensaje": "Usuario desactivado correctamente."
}
```

### Respuestas de error

**`400 Bad Request`** (Auto-eliminación)
```json
{
  "estado": "error",
  "mensaje": "No puedes desactivar tu propia cuenta."
}
```

**`400 Bad Request`** (Ya desactivado)
```json
{
  "estado": "error",
  "mensaje": "No se pudo eliminar el usuario.",
  "detalle": "El usuario ya se encuentra desactivado."
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

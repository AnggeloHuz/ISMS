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

---

## 📋 Listar Bitácora de Auditoría

Lista los registros de auditoría del sistema con paginación. Incluye el nombre de usuario que realizó cada acción.

| Propiedad | Valor            |
| --------- | ---------------- |
| **Ruta**  | `/api/audit`     |
| **Método**| `GET`            |
| **Roles** | `administrador`  |

### Parámetros de Query

| Parámetro | Tipo   | Default | Descripción                   |
| --------- | ------ | ------- | ----------------------------- |
| `page`    | number | `1`     | Número de página              |
| `limit`   | number | `10`    | Cantidad de registros por página (máx. 100) |

### Ejemplo de petición

```bash
curl http://localhost:3000/api/audit?page=1&limit=10
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "registros": [
    {
      "id": 1,
      "id_usuario": 1,
      "nombre_usuario": "admin",
      "operacion": "ACCESO",
      "nombre_tabla": "usuarios",
      "id_registro": 1,
      "valor_anterior": null,
      "valor_nuevo": null,
      "direccion_ip": "::1",
      "fecha_evento": "2026-03-03T13:00:00.000Z"
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

### Operaciones registradas

| Operación    | Endpoints que la generan                  |
| ------------ | ----------------------------------------- |
| `ACCESO`     | Login, Backup                             |
| `SALIDA`     | Logout                                    |
| `INSERTAR`   | Crear usuario, Crear categoría, Crear proveedor, Crear cuenta bancaria, Crear producto |
| `ACTUALIZAR` | Cambiar contraseña, cambiar rol, Editar categoría, Editar proveedor, Editar cuenta bancaria, Editar producto |
| `ELIMINAR`   | Desactivar usuario, Eliminar categoría, Eliminar proveedor, Eliminar cuenta bancaria, Eliminar producto |

### Respuestas de error

**`400 Bad Request`** (Página inexistente)
```json
{
  "estado": "error",
  "mensaje": "No se pudo obtener la bitácora de auditoría.",
  "detalle": "La página 5 no existe. Solo hay 1 página(s) disponible(s)."
}
```

---

## 📂 Crear Categoría

Crea una nueva categoría de productos.

| Propiedad | Valor                |
| --------- | -------------------- |
| **Ruta**  | `/api/categories`    |
| **Método**| `POST`               |
| **Roles** | `administrador`      |

### Ejemplo de petición (Body)

```json
{
  "nombre": "Electrónica",
  "descripcion": "Dispositivos y componentes electrónicos"
}
```

*El campo `descripcion` es opcional.*

### Respuesta exitosa — `201 Created`

```json
{
  "estado": "ok",
  "mensaje": "Categoría creada exitosamente.",
  "categoria": {
    "id": 1,
    "nombre": "Electrónica",
    "descripcion": "Dispositivos y componentes electrónicos"
  }
}
```

### Respuestas de error

**`400 Bad Request`**
```json
{
  "estado": "error",
  "mensaje": "No se pudo crear la categoría.",
  "detalle": "Ya existe una categoría con el nombre 'Electrónica'."
}
```

---

## 📂 Listar Categorías

Lista categorías con paginación o todas de una vez.

| Propiedad | Valor                |
| --------- | -------------------- |
| **Ruta**  | `/api/categories`    |
| **Método**| `GET`                |
| **Roles** | `administrador`      |

### Parámetros de Query

| Parámetro | Tipo    | Default | Descripción                                      |
| --------- | ------- | ------- | ------------------------------------------------ |
| `page`    | number  | `1`     | Número de página                                 |
| `limit`   | number  | `10`    | Cantidad de registros por página (máx. 100)      |
| `all`     | boolean | `false` | Si es `true`, devuelve todas sin paginación      |

### Ejemplo de petición (con paginación)

```bash
curl http://localhost:3000/api/categories?page=1&limit=10
```

### Ejemplo de petición (todas)

```bash
curl http://localhost:3000/api/categories?all=true
```

### Respuesta exitosa con paginación — `200 OK`

```json
{
  "estado": "ok",
  "categorias": [
    {
      "id": 1,
      "nombre": "Electrónica",
      "descripcion": "Dispositivos y componentes electrónicos"
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

### Respuesta exitosa sin paginación (`all=true`) — `200 OK`

```json
{
  "estado": "ok",
  "categorias": [
    {
      "id": 1,
      "nombre": "Electrónica",
      "descripcion": "Dispositivos y componentes electrónicos"
    }
  ],
  "total": 1
}
```

---

## 📂 Editar Categoría

Actualiza el nombre y/o descripción de una categoría existente.

| Propiedad | Valor                    |
| --------- | ------------------------ |
| **Ruta**  | `/api/categories/:id`    |
| **Método**| `PUT`                    |
| **Roles** | `administrador`          |

### Ejemplo de petición (Body)

```json
{
  "nombre": "Electrónica y Tecnología",
  "descripcion": "Dispositivos electrónicos y accesorios tecnológicos"
}
```

*Ambos campos son opcionales; los que no se envíen conservan su valor actual.*

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "mensaje": "Categoría actualizada exitosamente.",
  "categoria": {
    "id": 1,
    "nombre": "Electrónica y Tecnología",
    "descripcion": "Dispositivos electrónicos y accesorios tecnológicos"
  }
}
```

### Respuestas de error

**`400 Bad Request`**
```json
{
  "estado": "error",
  "mensaje": "No se pudo actualizar la categoría.",
  "detalle": "La categoría no fue encontrada."
}
```

---

## 📂 Eliminar Categoría

Elimina una categoría de forma permanente. No se puede eliminar si tiene productos asociados.

| Propiedad | Valor                    |
| --------- | ------------------------ |
| **Ruta**  | `/api/categories/:id`    |
| **Método**| `DELETE`                 |
| **Roles** | `administrador`          |

### Ejemplo de petición

```bash
curl -X DELETE http://localhost:3000/api/categories/1
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "id": 1,
  "nombre": "Electrónica",
  "mensaje": "Categoría eliminada correctamente."
}
```

### Respuestas de error

**`400 Bad Request`** (Categoría no encontrada)
```json
{
  "estado": "error",
  "mensaje": "No se pudo eliminar la categoría.",
  "detalle": "La categoría no fue encontrada."
}
```

**`400 Bad Request`** (Tiene productos asociados)
```json
{
  "estado": "error",
  "mensaje": "No se pudo eliminar la categoría.",
  "detalle": "No se puede eliminar la categoría 'Electrónica' porque tiene 3 producto(s) asociado(s)."
}
```

---

## 🏢 Crear Proveedor

Registra un nuevo proveedor en el sistema.

| Propiedad | Valor                |
| --------- | -------------------- |
| **Ruta**  | `/api/suppliers`     |
| **Método**| `POST`               |
| **Roles** | `administrador`      |

### Ejemplo de petición (Body)

```json
{
  "rif": "J-12345678-9",
  "razon_social": "Distribuidora El Centro C.A.",
  "nombre_contacto": "Carlos Méndez",
  "telefono": "0414-1234567",
  "direccion": "Av. Principal, Centro Comercial, Local 5"
}
```

*Los campos `nombre_contacto`, `telefono` y `direccion` son opcionales.*

### Respuesta exitosa — `201 Created`

```json
{
  "estado": "ok",
  "mensaje": "Proveedor creado exitosamente.",
  "proveedor": {
    "id": 1,
    "rif": "J-12345678-9",
    "razon_social": "Distribuidora El Centro C.A.",
    "nombre_contacto": "Carlos Méndez",
    "telefono": "0414-1234567",
    "direccion": "Av. Principal, Centro Comercial, Local 5"
  }
}
```

### Respuestas de error

**`400 Bad Request`**
```json
{
  "estado": "error",
  "mensaje": "No se pudo crear el proveedor.",
  "detalle": "Ya existe un proveedor con el RIF 'J-12345678-9'."
}
```

---

## 🏢 Listar Proveedores

Lista proveedores con paginación o todos de una vez.

| Propiedad | Valor                |
| --------- | -------------------- |
| **Ruta**  | `/api/suppliers`     |
| **Método**| `GET`                |
| **Roles** | `administrador`      |

### Parámetros de Query

| Parámetro | Tipo    | Default | Descripción                                      |
| --------- | ------- | ------- | ------------------------------------------------ |
| `page`    | number  | `1`     | Número de página                                 |
| `limit`   | number  | `10`    | Cantidad de registros por página (máx. 100)      |
| `all`     | boolean | `false` | Si es `true`, devuelve todos sin paginación      |

### Ejemplo de petición (con paginación)

```bash
curl http://localhost:3000/api/suppliers?page=1&limit=10
```

### Ejemplo de petición (todos)

```bash
curl http://localhost:3000/api/suppliers?all=true
```

### Respuesta exitosa con paginación — `200 OK`

```json
{
  "estado": "ok",
  "proveedores": [
    {
      "id": 1,
      "rif": "J-12345678-9",
      "razon_social": "Distribuidora El Centro C.A.",
      "nombre_contacto": "Carlos Méndez",
      "telefono": "0414-1234567",
      "direccion": "Av. Principal, Centro Comercial, Local 5",
      "fecha_registro": "2026-03-04T14:00:00.000Z"
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

### Respuesta exitosa sin paginación (`all=true`) — `200 OK`

```json
{
  "estado": "ok",
  "proveedores": [
    {
      "id": 1,
      "rif": "J-12345678-9",
      "razon_social": "Distribuidora El Centro C.A.",
      "nombre_contacto": "Carlos Méndez",
      "telefono": "0414-1234567",
      "direccion": "Av. Principal, Centro Comercial, Local 5",
      "fecha_registro": "2026-03-04T14:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

## 🏢 Editar Proveedor

Actualiza los datos de un proveedor existente.

| Propiedad | Valor                    |
| --------- | ------------------------ |
| **Ruta**  | `/api/suppliers/:id`     |
| **Método**| `PUT`                    |
| **Roles** | `administrador`          |

### Ejemplo de petición (Body)

```json
{
  "razon_social": "Distribuidora El Centro Plus C.A.",
  "telefono": "0412-9876543"
}
```

*Todos los campos son opcionales; los que no se envíen conservan su valor actual.*

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "mensaje": "Proveedor actualizado exitosamente.",
  "proveedor": {
    "id": 1,
    "rif": "J-12345678-9",
    "razon_social": "Distribuidora El Centro Plus C.A.",
    "nombre_contacto": "Carlos Méndez",
    "telefono": "0412-9876543",
    "direccion": "Av. Principal, Centro Comercial, Local 5"
  }
}
```

### Respuestas de error

**`400 Bad Request`**
```json
{
  "estado": "error",
  "mensaje": "No se pudo actualizar el proveedor.",
  "detalle": "El proveedor no fue encontrado."
}
```

---

## 🏢 Eliminar Proveedor

Elimina un proveedor de forma permanente. No se puede eliminar si tiene compras asociadas.

| Propiedad | Valor                    |
| --------- | ------------------------ |
| **Ruta**  | `/api/suppliers/:id`     |
| **Método**| `DELETE`                 |
| **Roles** | `administrador`          |

### Ejemplo de petición

```bash
curl -X DELETE http://localhost:3000/api/suppliers/1
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "id": 1,
  "rif": "J-12345678-9",
  "razon_social": "Distribuidora El Centro C.A.",
  "mensaje": "Proveedor eliminado correctamente."
}
```

### Respuestas de error

**`400 Bad Request`** (Proveedor no encontrado)
```json
{
  "estado": "error",
  "mensaje": "No se pudo eliminar el proveedor.",
  "detalle": "El proveedor no fue encontrado."
}
```

**`400 Bad Request`** (Tiene compras asociadas)
```json
{
  "estado": "error",
  "mensaje": "No se pudo eliminar el proveedor.",
  "detalle": "No se puede eliminar el proveedor 'Distribuidora El Centro C.A.' porque tiene 5 compra(s) asociada(s)."
}
```

---

## 🏦 Registrar Cuenta Bancaria

Crea una nueva cuenta bancaria para gestionar saldos y pagos.

| Propiedad | Valor                |
| --------- | -------------------- |
| **Ruta**  | `/api/bank-accounts` |
| **Método**| `POST`               |
| **Roles** | `administrador`      |

### Ejemplo de petición (Body)

```json
{
  "nombre_cuenta": "Banesco USD - Zelle",
  "moneda": "USD",
  "saldo_actual": 1500.50
}
```

*Monedas permitidas: `USD`, `VES`. El saldo es opcional (por defecto es 0).*

### Respuesta exitosa — `201 Created`

```json
{
  "estado": "ok",
  "mensaje": "Cuenta bancaria registrada exitosamente.",
  "cuenta": {
    "id": 1,
    "nombre_cuenta": "Banesco USD - Zelle",
    "moneda": "USD",
    "saldo_actual": 1500.5,
    "esta_activa": true
  }
}
```

### Respuestas de error

**`400 Bad Request`**
```json
{
  "estado": "error",
  "mensaje": "No se pudo registrar la cuenta bancaria.",
  "detalle": "Ya existe una cuenta bancaria con el nombre 'Banesco USD - Zelle'."
}
```

---

## 🏦 Listar Cuentas Bancarias

Lista las cuentas bancarias con paginación o todas de una vez.

| Propiedad | Valor                |
| --------- | -------------------- |
| **Ruta**  | `/api/bank-accounts` |
| **Método**| `GET`                |
| **Roles** | `administrador`      |

### Parámetros de Query

| Parámetro | Tipo    | Default | Descripción                                      |
| --------- | ------- | ------- | ------------------------------------------------ |
| `page`    | number  | `1`     | Número de página                                 |
| `limit`   | number  | `10`    | Cantidad de registros por página (máx. 100)      |
| `all`     | boolean | `false` | Si es `true`, devuelve todas sin paginación      |

### Ejemplo de petición (con paginación)

```bash
curl http://localhost:3000/api/bank-accounts?page=1&limit=10
```

### Ejemplo de petición (todas)

```bash
curl http://localhost:3000/api/bank-accounts?all=true
```

### Respuesta exitosa sin paginación (`all=true`) — `200 OK`

```json
{
  "estado": "ok",
  "cuentas": [
    {
      "id": 1,
      "nombre_cuenta": "Banesco USD - Zelle",
      "moneda": "USD",
      "saldo_actual": "1500.5000",
      "esta_activa": 1
    }
  ],
  "total": 1
}
```

---

## 🏦 Editar Cuenta Bancaria

Actualiza el nombre, la moneda o el estado activo de una cuenta.

| Propiedad | Valor                    |
| --------- | ------------------------ |
| **Ruta**  | `/api/bank-accounts/:id` |
| **Método**| `PUT`                    |
| **Roles** | `administrador`          |

### Ejemplo de petición (Body)

```json
{
  "nombre_cuenta": "Banesco USD",
  "esta_activa": false
}
```

*Todos los campos son opcionales; los que no se envíen conservan su valor actual.*

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "mensaje": "Cuenta bancaria actualizada exitosamente.",
  "cuenta": {
    "id": 1,
    "nombre_cuenta": "Banesco USD",
    "moneda": "USD",
    "saldo_actual": "1500.5000",
    "esta_activa": false
  }
}
```

### Respuestas de error

**`400 Bad Request`**
```json
{
  "estado": "error",
  "mensaje": "No se pudo actualizar la cuenta bancaria.",
  "detalle": "Ya existe otra cuenta bancaria con el nombre 'Banesco USD'."
}
```

---

## 🏦 Eliminar Cuenta Bancaria

Elimina permanentemente una cuenta bancaria. No se puede eliminar si tiene pagos asociados.

| Propiedad | Valor                    |
| --------- | ------------------------ |
| **Ruta**  | `/api/bank-accounts/:id` |
| **Método**| `DELETE`                 |
| **Roles** | `administrador`          |

### Ejemplo de petición

```bash
curl -X DELETE http://localhost:3000/api/bank-accounts/1
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "id": 1,
  "nombre_cuenta": "Banesco USD - Zelle",
  "mensaje": "Cuenta bancaria eliminada correctamente."
}
```

### Respuestas de error

**`400 Bad Request`** (Tiene pagos asociados)
```json
{
  "estado": "error",
  "mensaje": "No se pudo eliminar la cuenta bancaria.",
  "detalle": "No se puede eliminar la cuenta 'Banesco USD - Zelle' porque tiene 2 pago(s) asociado(s)."
}
```

---

## 📦 Crear Producto

Registra un nuevo producto en el inventario.

| Propiedad | Valor                |
| --------- | -------------------- |
| **Ruta**  | `/api/products`      |
| **Método**| `POST`               |
| **Roles** | `administrador`, `almacenista` |

### Ejemplo de petición (Body)

```json
{
  "codigo_barras": "1234567890123",
  "nombre": "Harina PAN",
  "id_categoria": 1,
  "costo_dolares": 0.85,
  "precio_dolares": 1.20,
  "stock_actual": 100,
  "stock_minimo": 20
}
```

*Solo el campo `nombre` es estrictamente obligatorio. El resto tiene valores por defecto o son opcionales.*

### Respuesta exitosa — `201 Created`

```json
{
  "estado": "ok",
  "mensaje": "Producto creado exitosamente.",
  "producto": {
    "id": 1,
    "codigo_barras": "1234567890123",
    "nombre": "Harina PAN",
    "id_categoria": 1,
    "costo_dolares": 0.85,
    "precio_dolares": 1.2,
    "stock_actual": 100,
    "stock_minimo": 20,
    "esta_activo": true
  }
}
```

### Respuestas de error

**`400 Bad Request`**
```json
{
  "estado": "error",
  "mensaje": "No se pudo crear el producto.",
  "detalle": "Ya existe un producto con el código de barras '1234567890123'."
}
```

---

## 📦 Listar Productos

Lista los productos con paginación o todos a la vez. Incluye el nombre de su categoría asociada.

| Propiedad | Valor                |
| --------- | -------------------- |
| **Ruta**  | `/api/products`      |
| **Método**| `GET`                |
| **Roles** | `administrador`, `almacenista`, `cajero` |

### Parámetros de Query

| Parámetro | Tipo    | Default | Descripción                                      |
| --------- | ------- | ------- | ------------------------------------------------ |
| `page`    | number  | `1`     | Número de página                                 |
| `limit`   | number  | `10`    | Cantidad de registros por página (máx. 100)      |
| `all`     | boolean | `false` | Si es `true`, devuelve todos sin paginación      |

### Ejemplo de petición (con paginación)

```bash
curl http://localhost:3000/api/products?page=1&limit=10
```

### Respuesta exitosa con paginación — `200 OK`

```json
{
  "estado": "ok",
  "productos": [
    {
      "id": 1,
      "codigo_barras": "1234567890123",
      "nombre": "Harina PAN",
      "id_categoria": 1,
      "nombre_categoria": "Víveres",
      "costo_dolares": "0.8500",
      "precio_dolares": "1.2000",
      "stock_actual": 100,
      "stock_minimo": 20,
      "esta_activo": 1
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

## 📦 Editar Producto

Actualiza los datos de un producto existente.

| Propiedad | Valor                    |
| --------- | ------------------------ |
| **Ruta**  | `/api/products/:id`      |
| **Método**| `PUT`                    |
| **Roles** | `administrador`, `almacenista` |

### Ejemplo de petición (Body)

```json
{
  "precio_dolares": 1.30,
  "stock_actual": 90
}
```

*Todos los campos son opcionales; los que no se envíen conservarán su valor actual.*

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "mensaje": "Producto actualizado exitosamente.",
  "producto": {
    "id": 1,
    "codigo_barras": "1234567890123",
    "nombre": "Harina PAN",
    "id_categoria": 1,
    "costo_dolares": 0.85,
    "precio_dolares": 1.3,
    "stock_actual": 90,
    "stock_minimo": 20,
    "esta_activo": true
  }
}
```

### Respuestas de error

**`400 Bad Request`**
```json
{
  "estado": "error",
  "mensaje": "No se pudo actualizar el producto.",
  "detalle": "La categoría con ID 99 no existe."
}
```

---

## 📦 Eliminar Producto

Elimina un producto. **Si el producto tiene historial en compras o ventas, la base de datos no permitirá su eliminación física por integridad y deberás modificar su estado a inactivo (PUT).**

| Propiedad | Valor                    |
| --------- | ------------------------ |
| **Ruta**  | `/api/products/:id`      |
| **Método**| `DELETE`                 |
| **Roles** | `administrador`, `almacenista` |

### Ejemplo de petición

```bash
curl -X DELETE http://localhost:3000/api/products/1
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "id": 1,
  "nombre": "Harina PAN",
  "mensaje": "Producto eliminado correctamente."
}
```

### Respuestas de error

**`400 Bad Request`** (Tiene historial de compras/ventas)
```json
{
  "estado": "error",
  "mensaje": "No se pudo eliminar el producto.",
  "detalle": "No se puede eliminar el producto 'Harina PAN' porque está registrado en 2 venta(s). Por favor, desactívelo en su lugar."
}
```

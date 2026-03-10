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
| `INSERTAR`   | Crear usuario, Crear categoría, Crear proveedor, Crear cuenta bancaria, Crear producto, Crear compra |
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

---

## 🛒 Registrar Compra (Transaccional)

Crea una nueva compra de mercancía. **Este proceso es transaccional:** suma los productos al inventario (`stock_actual`), actualiza sus costos, y descuenta los pagos de las cuentas bancarias indicadas. Soporta compra de múltiples productos y pagos mixtos (VES/USD).

| Propiedad | Valor                |
| --------- | -------------------- |
| **Ruta**  | `/api/purchases`     |
| **Método**| `POST`               |
| **Roles** | `administrador`, `almacenista` |

### Ejemplo de petición (Body)

```json
{
  "id_proveedor": 1,
  "tasa_cambio_usada": 45.50,
  "observaciones": "Compra de víveres semanales",
  "productos": [
    {
      "id_producto": 1,
      "cantidad": 50,
      "costo_unitario_dolares": 0.85
    },
    {
      "id_producto": 2,
      "cantidad": 20,
      "costo_unitario_dolares": 1.10
    }
  ],
  "pagos": [
    {
      "id_cuenta_bancaria": 1, 
      "monto_pagado_dolares": 40.00
    },
    {
      "id_cuenta_bancaria": 2, 
      "monto_pagado_dolares": 24.50
    }
  ]
}
```
*Total de la compra en este ejemplo = (50 * $0.85) + (20 * $1.10) = $42.5 + $22.0 = $64.50.*
*Total pagado = $40.00 + $24.50 = $64.50.*
**El total de la compra debe ser exactamente igual a la suma de los montos pagados.**

### Respuesta exitosa — `201 Created`

```json
{
  "estado": "ok",
  "mensaje": "Compra procesada exitosamente e inventario sumado.",
  "compra": {
    "id": 1,
    "total_dolares": "64.50",
    "total_bolivares": "2934.75"
  }
}
```

### Respuestas de error

**`400 Bad Request`** (Monto descuadrado)
```json
{
  "estado": "error",
  "mensaje": "No se pudo registrar la compra.",
  "detalle": "El total de pagos ($60.00) no coincide con el total de la compra ($64.50)."
}
```

**`400 Bad Request`** (Saldo insuficiente)
```json
{
  "estado": "error",
  "mensaje": "No se pudo registrar la compra.",
  "detalle": "Saldo insuficiente en la cuenta 'Banesco VES'. Requiere 1820.00 VES, pero tiene 500.00."
}
```

---

## 🛒 Listar Historial de Compras

Lista las compras registradas en el sistema (cabecera).

| Propiedad | Valor                |
| --------- | -------------------- |
| **Ruta**  | `/api/purchases`     |
| **Método**| `GET`                |
| **Roles** | `administrador`, `almacenista` |

### Parámetros de Query

| Parámetro | Tipo    | Default | Descripción                                      |
| --------- | ------- | ------- | ------------------------------------------------ |
| `page`    | number  | `1`     | Número de página                                 |
| `limit`   | number  | `10`    | Cantidad de registros por página (máx. 100)      |

### Ejemplo de petición

```bash
curl http://localhost:3000/api/purchases?page=1&limit=10
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "compras": [
    {
      "id": 1,
      "total_compra_dolares": "64.5000",
      "total_compra_bolivares": "2934.7500",
      "tasa_cambio_usada": "45.5000",
      "fecha_compra": "2026-03-04T15:30:00.000Z",
      "proveedor": "Distribuidora El Centro C.A.",
      "usuario": "Juan Pérez"
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

## 🛒 Obtener Detalle de Compra

Retorna la información completa de una compra específica: cabecera, productos comprados y métodos de pago utilizados.

| Propiedad | Valor                    |
| --------- | ------------------------ |
| **Ruta**  | `/api/purchases/:id`     |
| **Método**| `GET`                    |
| **Roles** | `administrador`, `almacenista` |

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "compra": {
    "id": 1,
    "id_proveedor": 1,
    "id_usuario": 1,
    "total_compra_dolares": "64.5000",
    "total_compra_bolivares": "2934.7500",
    "tasa_cambio_usada": "45.5000",
    "fecha_compra": "2026-03-04T15:30:00.000Z",
    "observaciones": "Compra de víveres semanales",
    "proveedor": "Distribuidora El Centro C.A.",
    "usuario": "Juan Pérez"
  },
  "productos": [
    {
      "cantidad": 50,
      "costo_unitario_al_comprar": "0.8500",
      "nombre_producto": "Harina PAN",
      "codigo_barras": "1234567890123"
    },
    {
      "cantidad": 20,
      "costo_unitario_al_comprar": "1.1000",
      "nombre_producto": "Arroz Mary",
      "codigo_barras": "9876543210987"
    }
  ],
  "pagos": [
    {
      "monto_dolares": "40.0000",
      "nombre_cuenta": "Banesco USD - Zelle",
      "moneda": "USD"
    },
    {
      "monto_dolares": "24.5000",
      "nombre_cuenta": "Banesco VES",
      "moneda": "VES"
    }
  ]
}
```

> **Nota:** Por motivos de integridad del inventario y saldos contables, las operaciones de Modificar (`PUT`) y Eliminar (`DELETE`) sobre compras están intencionalmente deshabilitadas. Para revertir errores operacionales, se debe emitir una *Devolución* (módulo independiente).

---

## 🧾 Registrar Venta

Registra una nueva venta de productos. Este endpoint es **transaccional**:
1. Verifica que los productos existan y tengan stock suficiente.
2. Calcula automáticamente el total de la venta evaluando el precio de cada producto y la cantidad.
3. Verifica que la suma total pagada coincida con el total de la venta calculada.
4. Si los pagos se hacen con una cuenta en bolívares (`VES`), aplica la reconversión basada en la tasa de cambio proporcionada (`tasa_cambio_usada`).
5. Descuenta el stock de los productos vendidos.
6. Suma los montos a los saldos totales de las cuentas bancarias usadas.
7. Registra el histórico de acciones en la bitácora de auditoría.

| Propiedad | Valor                      |
| --------- | -------------------------- |
| **Ruta**  | `/api/sales`               |
| **Método**| `POST`                     |
| **Roles** | `administrador`, `cajero`  |

### Ejemplo de petición (Body)

```json
{
  "tasa_cambio_usada": "45.5000",
  "productos": [
    {
      "id_producto": 1,
      "cantidad": 2,
      "precio_unitario_dolares": "1.50"
    },
    {
      "id_producto": 2,
      "cantidad": 1,
      "precio_unitario_dolares": "2.00"
    }
  ],
  "pagos": [
    {
      "id_cuenta_bancaria": 1,
      "monto_pagado_dolares": "3.00"
    },
    {
      "id_cuenta_bancaria": 2,
      "monto_pagado_dolares": "2.00"
    }
  ]
}
```

*Nota: La suma de `monto_pagado_dolares` en `pagos` debe ser exactamente igual al total de la venta calculado (suma de `cantidad * precio_unitario_dolares`).*

### Respuesta exitosa — `201 Created`

```json
{
  "estado": "ok",
  "id": 1,
  "total_dolares": "5.00",
  "total_bolivares": "227.50",
  "mensaje": "Venta procesada exitosamente e inventario descontado."
}
```

---

## 🧾 Listar Ventas

Devuelve el historial de todas las ventas realizadas, paginadas.

| Propiedad | Valor                      |
| --------- | -------------------------- |
| **Ruta**  | `/api/sales`               |
| **Método**| `GET`                      |
| **Roles** | `administrador`, `cajero`  |

### Parámetros de Query

| Parámetro | Tipo    | Default | Descripción                                      |
| --------- | ------- | ------- | ------------------------------------------------ |
| `page`    | number  | `1`     | Número de página                                 |
| `limit`   | number  | `10`    | Cantidad de registros por página (máx. 100)      |

### Ejemplo de petición

```bash
curl http://localhost:3000/api/sales?page=1&limit=10
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "ventas": [
    {
      "id": 1,
      "total_dolares": "5.0000",
      "total_bolivares": "227.5000",
      "tasa_cambio_usada": "45.5000",
      "fecha_venta": "2026-03-10T15:30:00.000Z",
      "usuario": "juanp"
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

## 🛒 Obtener Detalle de Venta

Retorna la información completa de una venta específica: cabecera, productos vendidos y métodos de pago utilizados.

| Propiedad | Valor                      |
| --------- | -------------------------- |
| **Ruta**  | `/api/sales/:id`           |
| **Método**| `GET`                      |
| **Roles** | `administrador`, `cajero`  |

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "venta": {
    "id": 1,
    "id_usuario": 1,
    "total_dolares": "5.0000",
    "total_bolivares": "227.5000",
    "tasa_cambio_usada": "45.5000",
    "fecha_venta": "2026-03-10T15:30:00.000Z",
    "usuario": "juanp",
    "usuario_nombre": "Juan Pérez"
  },
  "productos": [
    {
      "cantidad": 2,
      "precio_unitario_al_vender": "1.5000",
      "nombre_producto": "Harina PAN",
      "codigo_barras": "1234567890123"
    },
    {
      "cantidad": 1,
      "precio_unitario_al_vender": "2.0000",
      "nombre_producto": "Arroz Mary",
      "codigo_barras": "9876543210987"
    }
  ],
  "pagos": [
    {
      "monto_dolares": "3.0000",
      "nombre_cuenta": "Banesco USD - Zelle",
      "moneda": "USD"
    },
    {
      "monto_dolares": "2.0000",
      "nombre_cuenta": "Banesco VES",
      "moneda": "VES"
    }
  ]
}
```

> **Nota:** Al igual que en las compras, las operaciones de Modificar (`PUT`) y Eliminar (`DELETE`) en ventas están intencionalmente deshabilitadas para garantizar la integridad contable. Frente a cualquier error se deberá gestionar una *Devolución*.

---

## ⚙️ Crear Configuración

Crea un nuevo valor de configuración en el sistema.

| Propiedad | Valor                      |
| --------- | -------------------------- |
| **Ruta**  | `/api/configurations`      |
| **Método**| `POST`                     |
| **Roles** | `administrador`            |

### Ejemplo de petición (Body)

```json
{
  "clave_configuracion": "moneda_principal",
  "valor_configuracion": "USD"
}
```

### Respuesta exitosa — `201 Created`

```json
{
  "estado": "ok",
  "mensaje": "Configuración creada exitosamente.",
  "configuracion": {
    "clave_configuracion": "moneda_principal",
    "valor_configuracion": "USD"
  }
}
```

---

## ⚙️ Listar Configuraciones

Obtiene las configuraciones del sistema (con o sin paginación).

| Propiedad | Valor                      |
| --------- | -------------------------- |
| **Ruta**  | `/api/configurations`      |
| **Método**| `GET`                      |
| **Roles** | `administrador`            |

### Ejemplo de petición (todas)

```bash
curl http://localhost:3000/api/configurations?all=true
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "configuraciones": [
    {
      "clave_configuracion": "tasa_bcv",
      "valor_configuracion": "36.45",
      "fecha_actualizacion": "2026-03-10T15:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

## ⚙️ Editar Configuración

Modifica el valor de una configuración existente.

| Propiedad | Valor                                    |
| --------- | ---------------------------------------- |
| **Ruta**  | `/api/configurations/:clave_configuracion`|
| **Método**| `PUT`                                      |
| **Roles** | `administrador`                          |

### Ejemplo de petición (Body)

```bash
curl -X PUT http://localhost:3000/api/configurations/tasa_bcv \
-H "Content-Type: application/json" \
-d '{"valor_configuracion": "36.80"}'
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "mensaje": "Configuración actualizada exitosamente.",
  "configuracion": {
    "clave_configuracion": "tasa_bcv",
    "valor_configuracion": "36.80"
  }
}
```

---

## ⚙️ Eliminar Configuración

Elimina una configuración del sistema.

| Propiedad | Valor                                    |
| --------- | ---------------------------------------- |
| **Ruta**  | `/api/configurations/:clave_configuracion`|
| **Método**| `DELETE`                                   |
| **Roles** | `administrador`                          |

### Ejemplo de petición

```bash
curl -X DELETE http://localhost:3000/api/configurations/moneda_principal
```

### Respuesta exitosa — `200 OK`

```json
{
  "estado": "ok",
  "clave_configuracion": "moneda_principal",
  "valor_configuracion": "USD",
  "mensaje": "Configuración eliminada correctamente."
}
```

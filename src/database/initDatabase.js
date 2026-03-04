import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import env from '../config/env.js';

/**
 * Inicializa la base de datos: la crea si no existe y ejecuta la migración de tablas.
 */
const initDatabase = async () => {
  // Conexión inicial SIN base de datos para poder crearla
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  try {
    // 1. Crear la base de datos si no existe
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.name}\`;`);
    await connection.query(`USE \`${env.db.name}\`;`);
    console.log(`📦 Base de datos "${env.db.name}" verificada/creada.`);

    // 2. Crear todas las tablas
    const migrationSQL = `
      -- ==========================================
      -- MÓDULO DE CONFIGURACIÓN Y USUARIOS
      -- ==========================================

      CREATE TABLE IF NOT EXISTS configuraciones (
        clave_configuracion VARCHAR(50) PRIMARY KEY,
        valor_configuracion VARCHAR(255),
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
        clave_acceso VARCHAR(255) NOT NULL,
        nombre_completo VARCHAR(100),
        rol ENUM('administrador', 'cajero', 'almacenista') DEFAULT 'cajero',
        esta_activo BOOLEAN DEFAULT TRUE,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- ==========================================
      -- MÓDULO DE INVENTARIO Y PROVEEDORES
      -- ==========================================

      CREATE TABLE IF NOT EXISTS categorias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT
      );

      CREATE TABLE IF NOT EXISTS proveedores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rif VARCHAR(20) UNIQUE NOT NULL,
        razon_social VARCHAR(255) NOT NULL,
        nombre_contacto VARCHAR(100),
        telefono VARCHAR(20),
        direccion TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS productos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo_barras VARCHAR(100) UNIQUE,
        nombre VARCHAR(255) NOT NULL,
        id_categoria INT,
        costo_dolares DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
        precio_dolares DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
        stock_actual INT NOT NULL DEFAULT 0,
        stock_minimo INT DEFAULT 5,
        esta_activo BOOLEAN DEFAULT TRUE,
        CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE SET NULL
      );

      -- ==========================================
      -- MÓDULO DE BANCOS Y CUENTAS (Finanzas)
      -- ==========================================

      CREATE TABLE IF NOT EXISTS cuentas_bancarias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_cuenta VARCHAR(100) NOT NULL,
        moneda ENUM('USD', 'VES') NOT NULL,
        saldo_actual DECIMAL(19,4) DEFAULT 0.0000,
        esta_activa BOOLEAN DEFAULT TRUE
      );

      -- ==========================================
      -- MÓDULO DE COMPRAS (Ingreso de Mercancía)
      -- ==========================================

      CREATE TABLE IF NOT EXISTS compras (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_proveedor INT,
        id_usuario INT,
        total_compra_dolares DECIMAL(19,4) NOT NULL,
        total_compra_bolivares DECIMAL(19,4) NOT NULL,
        fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        observaciones TEXT,
        CONSTRAINT fk_compra_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores(id),
        CONSTRAINT fk_compra_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
      );

      CREATE TABLE IF NOT EXISTS detalles_compras (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_compra INT,
        id_producto INT,
        cantidad INT NOT NULL,
        costo_unitario_al_comprar DECIMAL(19,4) NOT NULL,
        CONSTRAINT fk_detalle_compra FOREIGN KEY (id_compra) REFERENCES compras(id) ON DELETE CASCADE,
        CONSTRAINT fk_detalle_producto_compra FOREIGN KEY (id_producto) REFERENCES productos(id)
      );

      -- ==========================================
      -- MÓDULO DE VENTAS (Salida de Mercancía)
      -- ==========================================

      CREATE TABLE IF NOT EXISTS ventas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT,
        total_dolares DECIMAL(19,4) NOT NULL,
        tasa_cambio_usada DECIMAL(19,4) NOT NULL,
        total_bolivares DECIMAL(19,4) NOT NULL,
        fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_venta_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
      );

      CREATE TABLE IF NOT EXISTS detalles_ventas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_venta INT,
        id_producto INT,
        cantidad INT NOT NULL,
        precio_unitario_al_vender DECIMAL(19,4) NOT NULL,
        CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES ventas(id) ON DELETE CASCADE,
        CONSTRAINT fk_detalle_producto_venta FOREIGN KEY (id_producto) REFERENCES productos(id)
      );

      CREATE TABLE IF NOT EXISTS pagos_ventas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_venta INT,
        id_cuenta_bancaria INT,
        monto_pagado DECIMAL(19,4) NOT NULL,
        CONSTRAINT fk_pago_venta FOREIGN KEY (id_venta) REFERENCES ventas(id) ON DELETE CASCADE,
        CONSTRAINT fk_pago_cuenta FOREIGN KEY (id_cuenta_bancaria) REFERENCES cuentas_bancarias(id)
      );

      -- ==========================================
      -- BITÁCORA DE AUDITORÍA
      -- ==========================================

      CREATE TABLE IF NOT EXISTS bitacora_auditoria (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT,
        operacion ENUM('INSERTAR', 'ACTUALIZAR', 'ELIMINAR', 'ACCESO', 'SALIDA') NOT NULL,
        nombre_tabla VARCHAR(50),
        id_registro INT,
        valor_anterior JSON,
        valor_nuevo JSON,
        direccion_ip VARCHAR(45),
        fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_bitacora_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE SET NULL
      );
    `;

    await connection.query(migrationSQL);
    console.log('📋 Todas las tablas verificadas/creadas correctamente.');

    // 3. Datos iniciales (solo si no existen)
    const [tasaRows] = await connection.query(
      `SELECT COUNT(*) AS total FROM configuraciones WHERE clave_configuracion = 'tasa_bcv'`
    );
    if (tasaRows[0].total === 0) {
      await connection.query(
        `INSERT INTO configuraciones (clave_configuracion, valor_configuracion) VALUES ('tasa_bcv', '36.45')`
      );
      console.log('⚙️  Configuración inicial (tasa BCV) insertada.');
    }

    const [adminRows] = await connection.query(
      `SELECT COUNT(*) AS total FROM usuarios WHERE nombre_usuario = 'admin'`
    );
    if (adminRows[0].total === 0) {
      // Encriptar la contraseña leída desde las variables de entorno
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(env.adminPassword, saltRounds);

      await connection.query(
        `INSERT INTO usuarios (nombre_usuario, clave_acceso, nombre_completo, rol) 
         VALUES (?, ?, ?, ?)`,
        ['admin', hashedPassword, 'Administrador del Sistema', 'administrador']
      );
      console.log('👤 Usuario administrador inicial creado (con contraseña encriptada).');
    }

    console.log('✅ Migración completada exitosamente.\n');
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
};

export default initDatabase;

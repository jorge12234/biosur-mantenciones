<?php
// backend-php/config.php
// Configuración principal del backend para GoDaddy (producción)

date_default_timezone_set('America/Santiago');

// ====== CONEXIÓN BASE DE DATOS ======
$DB_HOST = 'localhost';                // GoDaddy usa 'localhost' si la BD está en el mismo cPanel
$DB_NAME = 'biosur_mantenciones';      // nombre exacto de la base (en tu caso)
$DB_USER = 'biosur_m';                 // usuario MySQL del cPanel
$DB_PASS = 'svXenWTtdAd.';              // contraseña del usuario MySQL

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'DB: ' . $e->getMessage()]);
    exit;
}

// ====== RUTA BASE PÚBLICA ======
// 👇 Cambia según dónde quedó tu carpeta "backend-php"
// En tu caso, está directamente en public_html, así que sería:
define('BACKEND_BASE_URL', 'http://bbiosur.com/backend-php');

// ====== CARPETA DE ARCHIVOS SUBIDOS ======
define('UPLOAD_DIR', __DIR__ . '/mantenciones/files');

// ====== COMPROBACIÓN OPCIONAL ======

// y debería mostrar "✅ Conectado correctamente a la base de datos".

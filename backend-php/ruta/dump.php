<?php
// backend-php/ruta/dump.php
header('Content-Type: application/json; charset=utf-8');

// CORS + DB
require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';

try {
    // Queremos entregar una lista de rutas "planas" para cache offline.
    // Campos esperados por la app:
    //  code (código QR del baño), banno_id, cliente_id, cliente_nombre, cliente_correo, direccion
    //
    // Tablas que vimos en tus capturas:
    // - bannos(id, codigo, tipo, created_at, updated_at)
    // - rutas(id, banno_id, cliente_id, direccion, created_at, updated_at)
    // - clientes(id, nombre, correo, created_at, updated_at)

    $sql = "
        SELECT 
            b.id          AS banno_id,
            b.codigo      AS code,
            r.cliente_id  AS cliente_id,
            c.nombre      AS cliente_nombre,
            c.correo      AS cliente_correo,
            r.direccion   AS direccion
        FROM rutas r
        INNER JOIN bannos b   ON b.id = r.banno_id
        LEFT  JOIN clientes c ON c.id = r.cliente_id
        ORDER BY b.codigo ASC
    ";

    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data'    => $rows
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Error en dump: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

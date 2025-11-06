<?php
require_once __DIR__ . '/../config.php'; // incluye CORS + PDO

header('Content-Type: application/json; charset=utf-8');

$code = isset($_GET['code']) ? trim($_GET['code']) : '';
if ($code === '') {
    echo json_encode(['success'=>false,'error'=>'code requerido']); exit;
}

try {
    // 1) buscar id del baño por su código QR
    $s = $pdo->prepare('SELECT id FROM bannos WHERE codigo = ? LIMIT 1');
    $s->execute([$code]);
    $banno = $s->fetch();

    if (!$banno) {
        // no existe; devolver sin datos para que la app permita ingresarlo igual
        echo json_encode(['success'=>true,'data'=>[
            'banno_id'=>null,'cliente_id'=>null,'cliente_nombre'=>null,
            'cliente_correo'=>null,'direccion'=>null
        ]]); exit;
    }

    $banno_id = (int)$banno['id'];

    // 2) última ruta (cliente + dirección) para ese baño
    $s = $pdo->prepare('
    SELECT r.cliente_id, r.direccion, c.nombre AS cliente_nombre, c.correo AS cliente_correo
    FROM rutas r
    LEFT JOIN clientes c ON c.id = r.cliente_id
    WHERE r.banno_id = ?
    ORDER BY r.id DESC
    LIMIT 1
  ');
    $s->execute([$banno_id]);
    $ruta = $s->fetch();

    echo json_encode(['success'=>true,'data'=>[
        'banno_id'       => $banno_id,
        'cliente_id'     => $ruta ? (int)$ruta['cliente_id'] : null,
        'cliente_nombre' => $ruta ? $ruta['cliente_nombre']   : null,
        'cliente_correo' => $ruta ? $ruta['cliente_correo']   : null,
        'direccion'      => $ruta ? $ruta['direccion']        : null,
    ]]);
} catch(Throwable $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
}

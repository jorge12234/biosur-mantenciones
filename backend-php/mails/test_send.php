<?php
require_once __DIR__ . '/send_mantencion.php';

$res = send_mantencion_email([
    'to'            => 'jcarcamo@biosur.cl',
    'cliente'       => 'Cliente Demo',
    'codigoqr'      => '0000602CG',
    'direccion'     => 'Camino María Dolores km 6.9',
    'fecha'         => date('Y-m-d H:i:s'),
    'ubicacion'     => '-37.41..., -72.40...',
    'observaciones' => 'Correo de prueba',
    'imagenUrl'     => null,
]);

header('Content-Type: application/json; charset=utf-8');
echo json_encode($res, JSON_UNESCAPED_UNICODE);

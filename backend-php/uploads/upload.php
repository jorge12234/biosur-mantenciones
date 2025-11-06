<?php
require_once __DIR__ . '/../cors.php'; // si ya lo usas en los demás
header('Content-Type: application/json; charset=utf-8');

$logFile = __DIR__ . '/upload_debug.log';
function logu($msg){
    global $logFile;
    @file_put_contents($logFile, '['.date('Y-m-d H:i:s')."] ".$msg."\n", FILE_APPEND);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        logu('Método no permitido: ' . $_SERVER['REQUEST_METHOD']);
        http_response_code(405);
        echo json_encode(['success'=>false,'error'=>'Method not allowed']);
        exit;
    }

    if (!isset($_FILES['file'])) {
        logu('$_FILES vacío o sin índice "file": '.var_export($_FILES, true));
        http_response_code(400);
        echo json_encode(['success'=>false,'error'=>'No file uploaded (field name must be "file")']);
        exit;
    }

    $f = $_FILES['file'];
    if (!empty($f['error'])) {
        logu('Error en upload: ' . $f['error']);
        http_response_code(400);
        echo json_encode(['success'=>false,'error'=>'Upload error code: '.$f['error']]);
        exit;
    }

    if (empty($f['tmp_name']) || !is_uploaded_file($f['tmp_name'])) {
        logu('No es uploaded_file: '.var_export($f, true));
        http_response_code(400);
        echo json_encode(['success'=>false,'error'=>'Invalid tmp file']);
        exit;
    }

    // Asegura carpeta
    $destDir = __DIR__; // guarda dentro de /uploads (misma carpeta que este archivo)
    if (!is_dir($destDir)) {
        @mkdir($destDir, 0777, true);
    }

    // Normaliza y evita colisiones
    $ext = pathinfo($f['name'], PATHINFO_EXTENSION);
    $ext = $ext ? ('.'.strtolower($ext)) : '.jpg';
    $filename = 'mantencion_'.date('Ymd_His').'_'.bin2hex(random_bytes(4)).$ext;

    $destPath = $destDir . '/' . $filename;

    if (!move_uploaded_file($f['tmp_name'], $destPath)) {
        logu('move_uploaded_file falló hacia: '.$destPath);
        http_response_code(500);
        echo json_encode(['success'=>false,'error'=>'Could not move uploaded file']);
        exit;
    }

    // Construye URL pública (opcional)
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
    // Ajusta el path si tu app no está en raíz:
    // Ej: '/app-biosur-v6/backend-php/uploads'
    $basePath = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/'); // /app-biosur-v6/backend-php/uploads
    $publicUrl = $scheme.'://'.$host.$basePath.'/'.$filename;

    logu('OK: '.$filename.' => '.$publicUrl);

    echo json_encode([
        'success'  => true,
        'filename' => $filename,
        'url'      => $publicUrl,
    ]);
} catch (Throwable $e) {
    logu('EXCEPTION: '.$e->getMessage().' @'.$e->getFile().':'.$e->getLine());
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'Server error']);
}

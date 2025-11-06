<?php
/**
 * backend-php/mantenciones/upload_b64.php
 * Recibe JSON: { "filename": "algo.jpg", "filedata": "BASE64..." }
 * y lo guarda en ./files/ igual que upload.php
 */
header('Content-Type: application/json; charset=utf-8');

try {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new Exception('JSON inválido');
    }

    $filename = isset($data['filename']) ? $data['filename'] : null;
    $filedata = isset($data['filedata']) ? $data['filedata'] : null;

    if (!$filename || !$filedata) {
        throw new Exception('Faltan filename o filedata');
    }

    // carpeta
    $diskDir = __DIR__ . '/files';
    if (!is_dir($diskDir)) {
        if (!mkdir($diskDir, 0775, true)) {
            throw new Exception('No se pudo crear directorio de archivos');
        }
    }

    // nombre seguro
    $ext = pathinfo($filename, PATHINFO_EXTENSION);
    $ext = $ext ? preg_replace('/[^a-z0-9]/i', '', $ext) : 'jpg';

    $finalName = 'mantencion_' . date('Ymd_His') . '_' . bin2hex(random_bytes(3)) . '.' . $ext;
    $finalPath = $diskDir . '/' . $finalName;

    // guardar
    $bin = base64_decode($filedata);
    if ($bin === false) {
        throw new Exception('No se pudo decodificar base64');
    }

    if (file_put_contents($finalPath, $bin) === false) {
        throw new Exception('No se pudo escribir archivo');
    }

    // armar url
    if (defined('BACKEND_BASE_URL')) {
        $publicBase = rtrim(BACKEND_BASE_URL, '/');
        $url = $publicBase . '/mantenciones/files/' . $finalName;
    } else {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $base   = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
        $url    = $scheme . '://' . $host . $base . '/files/' . $finalName;
    }

    echo json_encode([
        'success'  => true,
        'filename' => $finalName,
        'url'      => $url,
    ]);
    exit;

} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
    exit;
}

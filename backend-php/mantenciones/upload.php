<?php
/**
 * backend-php/mantenciones/upload.php
 */

header('Content-Type: application/json; charset=utf-8');

// subir límites por si la foto viene grande
// (esto no siempre reemplaza al php.ini, pero en Wamp casi siempre sí)
ini_set('upload_max_filesize', '10M');
ini_set('post_max_size', '12M');
ini_set('max_file_uploads', '20');
ini_set('memory_limit', '256M');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido. Usa POST.');
    }

    if (empty($_FILES) || (!isset($_FILES['file']) && !isset($_FILES['imagen']))) {
        throw new Exception('No se recibió archivo (esperaba "file" o "imagen").');
    }

    $fieldName = isset($_FILES['file']) ? 'file' : 'imagen';
    $f = $_FILES[$fieldName];

    if (!isset($f['error']) || $f['error'] !== UPLOAD_ERR_OK) {
        // traducimos el error para que lo veas en el log de Expo
        $errCode = $f['error'] ?? 'desconocido';

        $errMsg = 'Error al subir archivo (código: ' . $errCode . ').';
        if ($errCode == UPLOAD_ERR_INI_SIZE) {
            $errMsg .= ' El archivo excede upload_max_filesize.';
        } elseif ($errCode == UPLOAD_ERR_FORM_SIZE) {
            $errMsg .= ' El archivo excede MAX_FILE_SIZE del formulario.';
        }

        throw new Exception($errMsg);
    }

    if (empty($f['tmp_name']) || !is_uploaded_file($f['tmp_name'])) {
        throw new Exception('Archivo temporal inválido.');
    }

    $diskDir = __DIR__ . '/files';
    if (!is_dir($diskDir)) {
        if (!mkdir($diskDir, 0775, true)) {
            throw new Exception('No se pudo crear directorio de archivos.');
        }
    }

    $extOriginal = pathinfo($f['name'] ?? '', PATHINFO_EXTENSION);
    $ext = $extOriginal ? strtolower($extOriginal) : 'jpg';
    $ext = preg_replace('/[^a-z0-9]/i', '', $ext);
    if ($ext === '') $ext = 'jpg';

    $rand = bin2hex(random_bytes(4));
    $finalName = 'mantencion_' . date('Ymd_His') . '_' . $rand . '.' . $ext;
    $finalPath = $diskDir . '/' . $finalName;

    if (!move_uploaded_file($f['tmp_name'], $finalPath)) {
        throw new Exception('No se pudo mover el archivo subido.');
    }

    // armar url pública
    if (defined('BACKEND_BASE_URL')) {
        $publicBase = rtrim(BACKEND_BASE_URL, '/');
        $publicUrl  = $publicBase . '/mantenciones/files/' . $finalName;
    } else {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $base   = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
        $publicUrl = $scheme . '://' . $host . $base . '/files/' . $finalName;
    }

    echo json_encode([
        'success'  => true,
        'filename' => $finalName,
        'url'      => $publicUrl,
    ]);
    exit;

} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
        'debug'   => [
            'file' => __FILE__,
            'line' => $e->getLine(),
        ]
    ]);
    exit;
}

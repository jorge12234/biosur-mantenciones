<?php
/**
 * backend-php/mantenciones/create.php
 * v6 + Idempotencia + envío de correo (PHPMailer) + imagenUrl
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';        // expone $pdo (PDO)
require_once __DIR__ . '/../mail_config.php';   // SMTP y fallback

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json; charset=utf-8');

try {
    // ---------------------------------------------------
    // 1) PDO con excepciones
    // ---------------------------------------------------
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ---------------------------------------------------
    // 2) Leer JSON del app
    // ---------------------------------------------------
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new Exception('JSON inválido en body.');
    }

    $get = function ($k) use ($data) {
        if (!array_key_exists($k, $data)) return null;
        $v = $data[$k];
        if ($v === '' || $v === 'null' || $v === null) return null;
        return $v;
    };

    // ---------------------------------------------------
    // 3) Campos desde el app
    // ---------------------------------------------------
    $codigoqr        = $get('codigoqr');
    $banno_id        = $get('banno_id');
    $cliente_id      = $get('cliente_id');
    $operador_id     = $get('operador_id');
    $direccion       = $get('direccion');
    $fecha           = $get('fecha') ?: date('Y-m-d H:i:s');
    $ubicacion       = $get('ubicacion');
    $observaciones   = $get('observaciones');
    $imagen          = $get('imagen');             // nombre archivo en /mantenciones/files
    $cliente_correo  = $get('cliente_correo');     // si viene desde el app
    $cliente_nombre  = $get('cliente_nombre');     // si viene desde el app

    // ---------------------------------------------------
    // 4) IDEMPOTENCIA (deduplicación)
    //    - Usa idempotency_key o id_local del payload si vienen
    //    - Si no, genera una llave determinística a partir de campos estables
    // ---------------------------------------------------
    $idempotency_key = $get('idempotency_key') ?: $get('id_local') ?: null;

    if (!$idempotency_key) {
        // Genera hash determinístico con campos estables del envío
        $base = [
            (string)$cliente_id,
            (string)$operador_id,
            (string)$banno_id,
            (string)$codigoqr,
            date('Y-m-d H:i', strtotime($fecha ?: 'now')), // redondeado al minuto
            trim((string)$direccion),
            trim((string)$observaciones),
        ];
        $idempotency_key = substr(hash('sha256', implode('|', $base)), 0, 40); // 40-64 chars OK
    }

    // (Opcional) log de depuración para ver la llave usada
    @file_put_contents(
        __DIR__ . '/../mail_debug.log',
        date('Y-m-d H:i:s') . " create.php IDEM={$idempotency_key} payload=" . json_encode([
            'cliente_id' => $cliente_id,
            'operador_id' => $operador_id,
            'banno_id'    => $banno_id,
            'codigoqr'    => $codigoqr,
            'fecha'       => $fecha,
            'direccion'   => $direccion,
            'observaciones' => $observaciones,
        ]) . "\n",
        FILE_APPEND
    );

    // Chequeo de duplicado: si ya existe esa llave, no inserta de nuevo.
    $dedup = false;
    $q = $pdo->prepare("SELECT id, imagen FROM mantenciones WHERE idempotency_key = :k LIMIT 1");
    $q->execute([':k' => $idempotency_key]);
    if ($row = $q->fetch(PDO::FETCH_ASSOC)) {
        $id = (int)$row['id'];

        // Armar imagenUrl si había imagen guardada
        if (defined('BACKEND_BASE_URL') && !empty($row['imagen'])) {
            $publicBase = rtrim(BACKEND_BASE_URL, '/');
            $imagenUrl  = $publicBase . '/mantenciones/files/' . $row['imagen'];
        } else {
            $imagenUrl  = null;
        }

        echo json_encode([
            'success'   => true,
            'id'        => $id,
            'imagenUrl' => $imagenUrl,
            'dedup'     => true,
            'idemUsed'  => $idempotency_key,
            'mailOk'    => false,
            'mailError' => null,
            'mailTo'    => null,
        ]);
        exit;
    }

    // ---------------------------------------------------
    // 5) Insert en BD (con idempotency_key)
    // ---------------------------------------------------
    $sql = "INSERT INTO mantenciones
            (codigoqr, banno_id, cliente_id, operador_id, direccion, fecha, ubicacion, observaciones, imagen, idempotency_key, created_at, updated_at)
            VALUES (:codigoqr, :banno_id, :cliente_id, :operador_id, :direccion, :fecha, :ubicacion, :observaciones, :imagen, :idem, NOW(), NOW())";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':codigoqr'      => $codigoqr,
        ':banno_id'      => $banno_id,
        ':cliente_id'    => $cliente_id,
        ':operador_id'   => $operador_id,
        ':direccion'     => $direccion,
        ':fecha'         => $fecha,
        ':ubicacion'     => $ubicacion,
        ':observaciones' => $observaciones,
        ':imagen'        => $imagen,
        ':idem'          => $idempotency_key,
    ]);

    $id = (int)$pdo->lastInsertId();

    // ---------------------------------------------------
    // 6) Armar URL pública de la imagen
    // ---------------------------------------------------
    if (defined('BACKEND_BASE_URL') && $imagen) {
        $publicBase = rtrim(BACKEND_BASE_URL, '/');
        $imagenUrl  = $publicBase . '/mantenciones/files/' . $imagen;
    } else {
        $imagenUrl  = null;
    }

    // ---------------------------------------------------
    // 7) Resolver correo y nombre del cliente
    // ---------------------------------------------------
    $destinatario = $cliente_correo ?: null;
    $clienteNombreFinal = $cliente_nombre ?: null;

    if (!$destinatario || !$clienteNombreFinal) {
        if (!empty($cliente_id)) {
            $q = $pdo->prepare("SELECT nombre, correo FROM clientes WHERE id = :id LIMIT 1");
            $q->execute([':id' => $cliente_id]);
            $row = $q->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                if (!$destinatario && !empty($row['correo'])) {
                    $destinatario = $row['correo'];
                }
                if (!$clienteNombreFinal && !empty($row['nombre'])) {
                    $clienteNombreFinal = $row['nombre'];
                }
            }
        }
    }

    if (empty($destinatario)) {
        $destinatario = defined('MAIL_FALLBACK_TO') ? MAIL_FALLBACK_TO : 'mantenciones@biosur.cl';
    }
    if (empty($clienteNombreFinal)) {
        $clienteNombreFinal = 'Cliente';
    }

    // ---------------------------------------------------
    // 8) Enviar correo (PHPMailer)
    // ---------------------------------------------------
    $mailOk    = false;
    $mailError = null;
    $mailTo    = $destinatario;

    try {
        require_once __DIR__ . '/../vendor/autoload.php';

        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = SMTP_SECURE;    // 'tls' o 'ssl'
        $mail->Port       = SMTP_PORT;      // 587 o 465

        $mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
        $mail->addAddress($destinatario);

        $mail->Subject = "Registro de Mantencion | Biosur Spa";

        $html  = "
        <div style='font-family: Arial, sans-serif; color:#333;'>
          <h2 style='color:#00695c;margin:0 0 10px;'>✅ Mantención registrada</h2>
          <p>Estimado/a <b>{$clienteNombreFinal}</b>,</p>
          <p>Se ha registrado una nueva mantención:</p>
          <table style='border-collapse:collapse;width:100%;max-width:640px'>
            <tr><td style='padding:6px 8px'><b>ID mantención:</b></td><td>#{$id}</td></tr>
            <tr><td style='padding:6px 8px'><b>Código QR:</b></td><td>" . ($codigoqr ?: '-') . "</td></tr>
            <tr><td style='padding:6px 8px'><b>Dirección:</b></td><td>" . ($direccion ?: '-') . "</td></tr>
            <tr><td style='padding:6px 8px'><b>Fecha:</b></td><td>{$fecha}</td></tr>
            <tr><td style='padding:6px 8px'><b>Ubicación (lat,lng):</b></td><td>" . ($ubicacion ?: '-') . "</td></tr>
            <tr><td style='padding:6px 8px'><b>Observaciones:</b></td><td>" . ($observaciones ?: '-') . "</td></tr>";
        if ($imagenUrl) {
            $html .= "<tr><td style='padding:6px 8px'><b>Foto:</b></td><td><a href='{$imagenUrl}' style='color:#00796b'>Ver imagen</a></td></tr>";
        }
        $html .= "
          </table>
          <p style='margin-top:16px'>Gracias por confiar en <b>Biosur</b>.<br>
          Equipo de Mantenciones Biosur</p>
          <hr style='border:none;border-top:1px solid #eee;margin:20px 0'>
          <small style='color:#777'>Este es un mensaje automático, por favor no responder.</small>
        </div>";

        $mail->isHTML(true);
        $mail->Body    = $html;
        $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $html));

        $mail->send();
        $mailOk = true;
    } catch (\Throwable $mx) {
        $mailOk    = false;
        $mailError = $mx->getMessage();
        if (defined('MAIL_DEBUG_FILE')) {
            @file_put_contents(
                MAIL_DEBUG_FILE,
                date('Y-m-d H:i:s') . " - PHPMailer error (mantención {$id} a {$destinatario}): " . $mx->getMessage() . "\r\n",
                FILE_APPEND
            );
        }
    }

    // ---------------------------------------------------
    // 9) Respuesta al app
    // ---------------------------------------------------
    echo json_encode([
        'success'   => true,
        'id'        => $id,
        'imagenUrl' => $imagenUrl,
        'dedup'     => false,
        'idemUsed'  => $idempotency_key,
        'mailOk'    => $mailOk,
        'mailError' => $mailError,
        'mailTo'    => $mailTo,
    ]);
    exit;

} catch (\Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
        'debug'   => [
            'line' => $e->getLine(),
            'file' => $e->getFile(),
        ],
    ]);
    exit;
}

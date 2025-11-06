<?php
// backend-php/mails/send_mantencion.php
require_once __DIR__ . '/mail_config.php';

// Cargar PHPMailer (composer)
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Envía correo de confirmación de mantención al cliente.
 *
 * @param array $data [
 *   'to'         => 'cliente@correo.cl',
 *   'cliente'    => 'Nombre Cliente',
 *   'codigoqr'   => '0000602CG',
 *   'direccion'  => 'Camino XX KM 6.9',
 *   'fecha'      => '2025-10-23 16:10:58',
 *   'ubicacion'  => '-37.41..., -72.40...',
 *   'observaciones' => 'texto...',
 *   'imagen'     => 'mantencion_20251023_....jpg' | null,
 *   'imagenUrl'  => 'http://.../mantenciones/files/....jpg' | null,
 * ]
 * @return array ['ok'=>bool, 'error'=>string|null]
 */
function send_mantencion_email(array $data): array
{
    $to        = $data['to']        ?? null;
    $cliente   = $data['cliente']   ?? '';
    $codigoqr  = $data['codigoqr']  ?? '';
    $direccion = $data['direccion'] ?? '';
    $fecha     = $data['fecha']     ?? '';
    $ubicacion = $data['ubicacion'] ?? '';
    $obs       = $data['observaciones'] ?? '';
    $imgUrl    = $data['imagenUrl'] ?? null;

    if (!$to) {
        return ['ok' => false, 'error' => 'Destinatario vacío'];
    }

    // Cuerpo HTML
    $html  = '<h2>Registro de Mantención</h2>';
    $html .= '<p><strong>Cliente:</strong> ' . htmlspecialchars($cliente) . '</p>';
    $html .= '<p><strong>Código QR:</strong> ' . htmlspecialchars($codigoqr) . '</p>';
    $html .= '<p><strong>Dirección:</strong> ' . htmlspecialchars($direccion) . '</p>';
    $html .= '<p><strong>Fecha:</strong> ' . htmlspecialchars($fecha) . '</p>';
    if ($ubicacion !== '') {
        $html .= '<p><strong>Ubicación:</strong> ' . htmlspecialchars($ubicacion) . '</p>';
    }
    if ($obs !== '') {
        $html .= '<p><strong>Observaciones:</strong> ' . nl2br(htmlspecialchars($obs)) . '</p>';
    }
    if ($imgUrl) {
        $html .= '<p><strong>Evidencia:</strong><br><a href="' . htmlspecialchars($imgUrl) . '">'
            .  htmlspecialchars($imgUrl) . '</a></p>';
        $html .= '<p><img src="' . htmlspecialchars($imgUrl) . '" alt="Evidencia" style="max-width:480px;border:1px solid #ccc"></p>';
    }

    $plain = "Registro de Mantención\n\n"
        . "Cliente: $cliente\n"
        . "Código QR: $codigoqr\n"
        . "Dirección: $direccion\n"
        . "Fecha: $fecha\n"
        . "Ubicación: $ubicacion\n"
        . "Observaciones: $obs\n"
        . ($imgUrl ? "Evidencia: $imgUrl\n" : "");

    $mail = new PHPMailer(true);
    try {
        // SMTP
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->Port       = SMTP_PORT;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = (SMTP_SECURE === 'ssl') ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;

        // Remitente / destinatario
        $mail->setFrom(FROM_EMAIL, FROM_NAME);
        $mail->addAddress($to, $cliente ?: $to);

        // Contenido
        $mail->Subject = 'Confirmación de mantención - ' . ($codigoqr ?: 'Biosur');
        $mail->isHTML(true);
        $mail->Body    = $html;
        $mail->AltBody = $plain;

        // (opcional) adjuntar imagen si la tienes en disco local:
        // if (!empty($data['imagenPath']) && is_file($data['imagenPath'])) {
        //     $mail->addAttachment($data['imagenPath']);
        // }

        $ok = $mail->send();

        // Depuración a archivo
        if (defined('MAIL_DEBUG_FILE') && MAIL_DEBUG_FILE) {
            @file_put_contents(MAIL_DEBUG_FILE, date('c') . " OK\n", FILE_APPEND);
        }

        return ['ok' => $ok, 'error' => $ok ? null : 'PHPMailer->send() returned false'];
    } catch (Exception $e) {
        if (defined('MAIL_DEBUG_FILE') && MAIL_DEBUG_FILE) {
            @file_put_contents(MAIL_DEBUG_FILE, date('c') . ' ERROR: ' . $mail->ErrorInfo . "\n", FILE_APPEND);
        }
        return ['ok' => false, 'error' => $mail->ErrorInfo ?: $e->getMessage()];
    }
}

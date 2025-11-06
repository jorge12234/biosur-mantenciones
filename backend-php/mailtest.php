<?php
require __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;

$mail = new PHPMailer(true);
$mail->isSMTP();
$mail->SMTPDebug = 2; // Cambia a 0 cuando funcione
$mail->Host = 'smtp.gmail.com';
$mail->Port = 587;
$mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
$mail->SMTPAuth = true;

// ====== DATOS DE TU CUENTA ======
$mail->Username = 'mantenciones@biosur.cl';
$mail->Password = 'estt xwwe vmar fpiy'; // NO tu contraseña normal
$mail->setFrom('mantenciones@biosur.cl', 'Biosur Mantenciones');

// ====== DESTINATARIO ======
$mail->addAddress('jcarcamo@biosur.cl', 'Prueba');

// ====== MENSAJE ======
$mail->Subject = 'Prueba de envío SMTP con Gmail Workspace';
$mail->Body = '¡El envío desde Gmail con PHPMailer funcionó correctamente!';

try {
    $mail->send();
    echo "✅ Correo enviado correctamente.";
} catch (Exception $e) {
    echo "❌ Error: {$mail->ErrorInfo}";
}

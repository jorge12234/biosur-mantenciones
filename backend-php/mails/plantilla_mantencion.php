<?php
// backend-php/mails/plantilla_mantencion.php

if (!function_exists('plantilla_mantencion')) {
    function plantilla_mantencion(array $d): string {
        $cliente     = htmlspecialchars($d['clienteNombre'] ?? 'Cliente', ENT_QUOTES, 'UTF-8');
        $direccion   = htmlspecialchars($d['direccion'] ?? '', ENT_QUOTES, 'UTF-8');
        $fecha       = htmlspecialchars($d['fecha'] ?? '', ENT_QUOTES, 'UTF-8');
        $obs         = nl2br(htmlspecialchars($d['observaciones'] ?? '', ENT_QUOTES, 'UTF-8'));
        $ubic        = $d['ubicacion'] ?? '';
        $codigoqr    = htmlspecialchars($d['codigoqr'] ?? '', ENT_QUOTES, 'UTF-8');
        $img         = $d['imagenUrl'] ?? null;
        $mapLink     = $ubic ? 'https://www.google.com/maps?q=' . rawurlencode($ubic) : null;

        ob_start(); ?>
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Mantención registrada</title>
        </head>
        <body style="font-family:Arial,Helvetica,sans-serif; color:#222; line-height:1.45">
        <h2 style="margin:0 0 12px">Mantención registrada</h2>
        <p style="margin:0 0 16px">Hola <strong><?= $cliente ?></strong>, se ha registrado una mantención.</p>

        <table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
            <tr>
                <td style="font-weight:700; white-space:nowrap">Código QR</td>
                <td><?= $codigoqr ?: '—' ?></td>
            </tr>
            <tr>
                <td style="font-weight:700; white-space:nowrap">Dirección</td>
                <td><?= $direccion ?: '—' ?></td>
            </tr>
            <tr>
                <td style="font-weight:700; white-space:nowrap">Fecha</td>
                <td><?= $fecha ?></td>
            </tr>
            <tr>
                <td style="font-weight:700; white-space:nowrap">Ubicación</td>
                <td>
                    <?php if ($mapLink): ?>
                        <a href="<?= htmlspecialchars($mapLink, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($ubic, ENT_QUOTES, 'UTF-8') ?></a>
                    <?php else: ?>
                        <?= htmlspecialchars($ubic ?: '—', ENT_QUOTES, 'UTF-8') ?>
                    <?php endif; ?>
                </td>
            </tr>
            <tr>
                <td style="font-weight:700; vertical-align:top; white-space:nowrap">Observaciones</td>
                <td><?= $obs ?: '—' ?></td>
            </tr>
        </table>

        <?php if ($img): ?>
            <p style="margin:16px 0 0">
                <strong>Imagen:</strong><br>
                <img src="<?= htmlspecialchars($img, ENT_QUOTES, 'UTF-8') ?>"
                     alt="Imagen mantención"
                     style="max-width:480px; border:1px solid #ddd; border-radius:6px">
                <br>
                <a href="<?= htmlspecialchars($img, ENT_QUOTES, 'UTF-8') ?>">Ver imagen</a>
            </p>
        <?php endif; ?>

        <p style="margin:24px 0 0">Saludos,<br><strong>Biosur Mantenciones</strong></p>
        </body>
        </html>
        <?php
        return ob_get_clean();
    }}

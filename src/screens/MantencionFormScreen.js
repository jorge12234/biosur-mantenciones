// src/screens/MantencionFormScreen.js
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import * as ImageManipulator from 'expo-image-manipulator'; // ⬅️ NUEVO

import { createMantencion } from '../utils/api';
import { enqueuePending } from '../utils/pendingQueue';
import { getOperadorId } from '../utils/operator';

// << IMPORTA LA CACHÉ
import { getByCodeOffline } from '../utils/routesCache';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

export default function MantencionFormScreen({ route, navigation }) {
    const codeFromParams =
        route?.params?.code ??
        route?.params?.banno_code ??
        route?.params?.banno_id ??
        '';

    const [qrCode, setQrCode] = useState(String(codeFromParams || ''));

    // ---- ocultos ----
    const [banno_id, setBannoId] = useState('');
    const [cliente_id, setClienteId] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 16).replace('T', ' '));
    const [ubicacion, setUbicacion] = useState('');

    // ---- visibles ----
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteCorreo, setClienteCorreo] = useState('');
    const [direccion, setDireccion] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [image, setImage] = useState(null);

    const [sending, setSending] = useState(false);
    const [loadingRuta, setLoadingRuta] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const pos = await Location.getCurrentPositionAsync({});
                setUbicacion(`${pos.coords.latitude},${pos.coords.longitude}`);
            }
        })();
    }, []);

    async function isOnline() {
        try {
            const net = await Network.getNetworkStateAsync();
            return !!net.isConnected && !!net.isInternetReachable;
        } catch {
            return false;
        }
    }

    async function fillFromRecord(rec, sourceLabel = 'offline') {
        if (!rec) return false;
        // Ajusta los nombres si tu JSON usa otros
        if (rec.banno_id != null) setBannoId(String(rec.banno_id));
        if (rec.cliente_id != null) setClienteId(String(rec.cliente_id));
        setClienteNombre(rec.cliente_nombre ?? '');
        setClienteCorreo(rec.cliente_correo ?? '');
        if (rec.direccion) setDireccion(rec.direccion);

        console.log(`Ruta rellenada desde ${sourceLabel}`, rec);
        return true;
    }

    async function loadRutaByCode(code) {
        if (!code) return;

        setLoadingRuta(true);
        try {
            // 1) intenta online
            if (await isOnline()) {
                try {
                    const r = await fetch(`${API_BASE}/ruta/lookup.php?code=${encodeURIComponent(code)}`);
                    const j = await r.json();
                    if (j?.success && j.data) {
                        await fillFromRecord(j.data, 'online');
                        setLoadingRuta(false);
                        return;
                    }
                } catch (e) {
                    console.log('lookup online error', e);
                }
            }

            // 2) si no hay internet o falló, usa caché
            const cached = await getByCodeOffline(code);
            if (cached) {
                await fillFromRecord(cached, 'offline');
            } else {
                // sin coincidencia, limpiamos
                setBannoId('');
                setClienteId('');
                setClienteNombre('');
                setClienteCorreo('');
            }
        } finally {
            setLoadingRuta(false);
        }
    }

    useEffect(() => {
        if (qrCode) loadRutaByCode(qrCode);
    }, [qrCode]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso', 'Se requiere permiso de cámara');
            return;
        }
        const res = await ImagePicker.launchCameraAsync({ quality: 1, base64: false }); // calidad bruto; comprimimos nosotros
        if (!res.canceled) setImage(res.assets[0]);
    };

    const nn = (v) => (v === '' || v === undefined ? null : v);

    const onSubmit = async () => {
        const opId = await getOperadorId(); // ahora el operador se toma del storage
        if (!opId) {
            Alert.alert('Faltan datos', 'Debes configurar el operador en el menú.');
            return;
        }

        // ⬇️ OPCIONAL: clave de idempotencia para evitar duplicados si hay reintentos
        const idempotency_key = `app_${qrCode || 'noqr'}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

        const payload = {
            codigoqr: qrCode || null,
            banno_id: nn(banno_id ? Number(banno_id) : null),
            cliente_id: nn(cliente_id ? Number(cliente_id) : null),
            operador_id: opId,
            direccion: nn(direccion || null),
            fecha,
            ubicacion: nn(ubicacion || null),
            observaciones: nn(observaciones || null),
            idempotency_key, // ⬅️ nuevo (el backend lo ignora si no existe la columna)
            cliente_correo: nn(clienteCorreo || null), // por si sirve al correo
            cliente_nombre: nn(clienteNombre || null),
        };

        try {
            setSending(true);

            // ⬇️ 1) COMPRIMIR/REDIMENSIONAR IMAGEN SI EXISTE
            let finalImage = image;
            if (image?.uri) {
                const manipulated = await ImageManipulator.manipulateAsync(
                    image.uri,
                    [{ resize: { width: 1280 } }], // máx 1280 px de ancho
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                finalImage = { uri: manipulated.uri };
            }

            // ⬇️ 2) Intento online normal
            await createMantencion(payload, finalImage);
            Alert.alert('OK', 'Mantención registrada');
            navigation.popToTop();
        } catch (e) {
            // ⬇️ 3) Sin conexión o error -> ENCOLAR con imagen ya comprimida
            let finalImage = image;
            if (image?.uri) {
                try {
                    const manipulated = await ImageManipulator.manipulateAsync(
                        image.uri,
                        [{ resize: { width: 1280 } }],
                        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                    );
                    finalImage = { uri: manipulated.uri };
                } catch {}
            }

            await enqueuePending({ payload, image: finalImage });
            Alert.alert('ok');
            navigation.popToTop();
        } finally {
            setSending(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {!!qrCode && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Datos desde QR</Text>
                    <Text style={styles.kv}><Text style={styles.k}>Código:</Text> {qrCode}</Text>
                    <Text style={styles.kv}><Text style={styles.k}>Cliente:</Text> {clienteNombre || '(sin cliente)'}</Text>
                    <Text style={styles.kv}><Text style={styles.k}>Correo:</Text> {clienteCorreo || '(sin correo)'}</Text>
                    {direccion ? <Text style={styles.kv}><Text style={styles.k}>Dirección:</Text> {direccion}</Text> : null}
                    {loadingRuta ? <Text style={{ marginTop: 6 }}>(buscando ruta…)</Text> : null}
                </View>
            )}

            {/* Campos ocultos: ya no se muestran (banno_id, cliente_id, fecha, ubicacion) */}

            <Text style={styles.label}>Observaciones</Text>
            <TextInput
                style={[styles.input, { height: 90 }]}
                value={observaciones}
                onChangeText={setObservaciones}
                multiline
            />

            <Button title="Tomar foto" onPress={pickImage} />
            {image?.uri ? (
                <Image source={{ uri: image.uri }} style={{ width: '100%', height: 220, marginTop: 10, borderRadius: 8 }} />
            ) : null}

            <View style={{ height: 14 }} />
            <Button
                title={sending ? 'Enviando…' : 'Guardar mantención'}
                onPress={onSubmit}
                disabled={sending || loadingRuta}
            />
            <View style={{ height: 24 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16 },
    label: { fontWeight: '600', marginTop: 12, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
    card: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor:  '#fafafa', marginBottom: 10 },
    cardTitle: { fontWeight: '700', marginBottom: 6 },
    kv: { marginBottom: 4 },
    k: { fontWeight: '600' },
});

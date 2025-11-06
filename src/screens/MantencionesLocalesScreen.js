// src/screens/MantencionesLocalesScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { getQueue, getSent, clearLocalMantenciones } from '../utils/pendingQueue';

export default function MantencionesLocalesScreen() {
    const [pending, setPending] = useState([]);
    const [sent, setSent] = useState([]);
    const lastTapRef = useRef(0);

    async function load() {
        const q = await getQueue();
        const s = await getSent();
        setPending(q);
        setSent(s);
    }

    useEffect(() => {
        const id = setInterval(load, 4000); // se refresca solito
        load();
        return () => clearInterval(id);
    }, []);

    const handleClear = () => {
        Alert.alert('Limpiar', '¿Borrar registros locales?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Borrar',
                style: 'destructive',
                onPress: async () => {
                    await clearLocalMantenciones();
                    await load();
                },
            },
        ]);
    };

    const renderItem = ({ item, index, sent: isSent }) => {
        const ts = item.ts ? new Date(item.ts).toLocaleString() : '';
        const p = item.payload || {};
        const title = p.direccion || p.codigoqr || p.observaciones || 'Mantención';

        // un solo handler para double tap
        const onPress = () => {
            const now = Date.now();
            if (now - lastTapRef.current < 350) {
                // doble tap
                if (isSent) {
                    Alert.alert(
                        'Enviada',
                        [
                            `ID servidor: ${item.server?.id ?? '—'}`,
                            `Correo OK: ${item.server?.mailOk ? 'sí' : 'no'}`,
                            `Imagen URL: ${item.server?.imagenUrl ?? '—'}`,
                        ].join('\n')
                    );
                } else {
                    Alert.alert('Pendiente', 'Aún en cola, se enviará cuando haya internet.');
                }
            } else {
                // single tap
                if (!isSent) {
                    Alert.alert('Pendiente', 'Aún en cola, se enviará cuando haya internet.');
                } else {
                    Alert.alert('Enviada', 'Esta mantención ya fue enviada al backend.');
                }
            }
            lastTapRef.current = now;
        };

        return (
            <Pressable
                onPress={onPress}
                style={[styles.item, isSent ? styles.sent : styles.pending]}
            >
                <Text style={styles.title}>
                    {isSent ? '🟢 ' : '🟠 '}
                    {title}
                </Text>
                <Text style={styles.sub}>{ts}</Text>
                <Text style={styles.sub}>QR: {p.codigoqr || '—'}</Text>
                <Text style={styles.sub}>Baño: {p.banno_id || '—'}</Text>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.h1}>Mantenciones locales</Text>
                <Pressable onPress={handleClear} style={styles.clearBtn}>
                    <Text style={styles.clearTxt}>🧹 Limpiar</Text>
                </Pressable>
            </View>

            <Text style={styles.section}>Pendientes ({pending.length})</Text>
            <FlatList
                data={pending}
                keyExtractor={(_, i) => 'p-' + i}
                renderItem={({ item, index }) => renderItem({ item, index, sent: false })}
                ListEmptyComponent={<Text style={styles.empty}>No hay pendientes.</Text>}
            />

            <Text style={styles.section}>Enviadas ({sent.length})</Text>
            <FlatList
                data={sent}
                keyExtractor={(_, i) => 's-' + i}
                renderItem={({ item, index }) => renderItem({ item, index, sent: true })}
                ListEmptyComponent={<Text style={styles.empty}>No hay enviadas.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    h1: { fontSize: 20, fontWeight: '600' },
    clearBtn: { backgroundColor: '#eee', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    clearTxt: { fontWeight: '500' },
    section: { marginTop: 10, marginBottom: 4, fontWeight: '600' },
    item: { padding: 10, borderRadius: 10, marginBottom: 6 },
    pending: { backgroundColor: '#fff4de' },
    sent: { backgroundColor: '#e7fff1' },
    title: { fontSize: 16, fontWeight: '600' },
    sub: { fontSize: 12, color: '#555' },
    empty: { fontSize: 12, color: '#888', marginBottom: 10 },
});

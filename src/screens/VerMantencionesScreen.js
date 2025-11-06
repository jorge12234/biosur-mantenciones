// src/screens/VerMantencionesScreen.js
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
    fetchHistory,
    clearHistory,
    requeueFromHistory,
    startPendingQueue,
} from '../utils/pendingQueue';

export default function VerMantencionesScreen() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sendingId, setSendingId] = useState(null); // idLocal que se está reintentando

    async function load() {
        setLoading(true);
        try {
            const h = await fetchHistory();
            setItems(Array.isArray(h) ? h : []);
        } catch (e) {
            console.log('[hist] error load', e);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }

    // cargar siempre que entras a la pantalla
    useFocusEffect(
        useCallback(() => {
            load();
        }, [])
    );

    const onClear = async () => {
        Alert.alert(
            'Limpiar historial',
            '¿Seguro que quieres borrar las mantenciones locales?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Borrar',
                    style: 'destructive',
                    onPress: async () => {
                        await clearHistory();
                        await load();
                    },
                },
            ]
        );
    };

    const onResend = async (item) => {
        try {
            setSendingId(item.idLocal);
            // Reencola sin duplicar (reutiliza idLocal y marca "reintentando")
            await requeueFromHistory(item.idLocal);
            // Arranca/activa el watcher
            startPendingQueue();
            Alert.alert('Listo', 'Se reintentará enviar en segundo plano.');
            // refrescar lista
            await load();
        } catch (e) {
            Alert.alert('Error', String(e?.message || e));
        } finally {
            setSendingId(null);
        }
    };

    const badgeText = (estado) => {
        switch (estado) {
            case 'en_cola':
                return 'En cola';
            case 'reintentando':
                return 'Reintentando…';
            case 'enviado':
                return 'Enviado';
            case 'error':
                return 'Error';
            default:
                return estado || '—';
        }
    };

    const badgeStyle = (estado) => {
        switch (estado) {
            case 'en_cola':
                return { backgroundColor: 'rgba(243,156,18,.15)', color: '#e67e22', borderColor: '#f39c12' };
            case 'reintentando':
                return { backgroundColor: 'rgba(52,152,219,.15)', color: '#2980b9', borderColor: '#3498db' };
            case 'enviado':
                return { backgroundColor: 'rgba(46,204,113,.15)', color: '#27ae60', borderColor: '#2ecc71' };
            case 'error':
                return { backgroundColor: 'rgba(231,76,60,.15)', color: '#c0392b', borderColor: '#e74c3c' };
            default:
                return { backgroundColor: 'rgba(149,165,166,.15)', color: '#7f8c8d', borderColor: '#95a5a6' };
        }
    };

    const renderItem = ({ item, index }) => {
        const p = item.payload || {};
        const fecha = item.ts ? new Date(item.ts).toLocaleString() : '';
        const estado = item.estado || 'desconocido';
        const isSending = sendingId === item.idLocal || estado === 'reintentando';

        return (
            <View
                style={[
                    styles.card,
                    estado === 'enviado'
                        ? styles.cardOk
                        : estado === 'error'
                            ? styles.cardError
                            : estado === 'reintentando'
                                ? styles.cardRetry
                                : styles.cardCola,
                ]}
            >
                <View style={styles.headerRow}>
                    <Text style={styles.title}>
                        #{index + 1} • {p.codigoqr || 'sin QR'}
                    </Text>

                    <View style={[styles.badge, badgeStyle(estado)]}>
                        <Text style={[styles.badgeText, { color: badgeStyle(estado).color }]}>
                            {badgeText(estado)}
                        </Text>
                        {isSending ? (
                            <ActivityIndicator size="small" color={badgeStyle(estado).color} style={{ marginLeft: 6 }} />
                        ) : null}
                    </View>
                </View>

                <Text style={styles.small}>Cliente ID: {p.cliente_id || '-'} • Baño: {p.banno_id || '-'}</Text>
                <Text style={styles.small}>Dirección: {p.direccion || '-'}</Text>
                <Text style={styles.small}>Ubicación: {p.ubicacion || '-'}</Text>
                <Text style={styles.date}>{fecha}</Text>

                {item.lastError ? (
                    <Text style={styles.errorText}>Último error: {String(item.lastError)}</Text>
                ) : null}

                <View style={styles.actionsRow}>
                    {estado === 'enviado' ? (
                        <View style={styles.actionDisabled}>
                            <Text style={styles.actionDisabledText}>Enviado</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => onResend(item)}
                            disabled={isSending}
                        >
                            <Text style={styles.actionText}>{isSending ? 'Reintentando…' : 'Reenviar'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.screenTitle}>Historial de mantenciones</Text>
                <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
                    <Text style={styles.clearText}>Limpiar</Text>
                </TouchableOpacity>
            </View>

            {items.length === 0 && !loading ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No hay mantenciones guardadas en este teléfono.</Text>
                    <Text style={styles.emptyTextSmall}>
                        Guarda una mantención sin internet o con internet para que aparezca aquí.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item, idx) => item.idLocal ?? String(idx)}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderBottomColor: '#ddd',
        borderBottomWidth: 1,
    },
    screenTitle: { fontSize: 16, fontWeight: '600' },
    clearBtn: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 6,
    },
    clearText: { color: '#fff', fontWeight: '600' },
    emptyBox: { padding: 20, alignItems: 'center' },
    emptyText: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
    emptyTextSmall: { fontSize: 12, color: '#777', textAlign: 'center' },

    card: {
        backgroundColor: '#fff',
        marginHorizontal: 10,
        marginVertical: 8,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
    },
    cardCola: { borderColor: '#f39c12' },
    cardRetry: { borderColor: '#3498db' },
    cardOk: { borderColor: '#2ecc71' },
    cardError: { borderColor: '#e74c3c' },

    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
    small: { fontSize: 12, color: '#444' },
    date: { fontSize: 11, color: '#999', marginTop: 3 },

    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },

    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    actionBtn: {
        backgroundColor: '#3498db',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    actionText: { color: '#fff', fontWeight: '700' },
    actionDisabled: {
        backgroundColor: '#ecf0f1',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    actionDisabledText: { color: '#7f8c8d', fontWeight: '700' },

    errorText: { color: '#c0392b', fontSize: 12, marginTop: 6 },
});

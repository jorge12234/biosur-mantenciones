import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { fetchHistory, clearHistory } from '../utils/pendingQueue';

export default function VerMantencionesScreen() {
    const [items, setItems] = useState([]);

    async function load() {
        const h = await fetchHistory();
        setItems(h);
    }

    useEffect(() => {
        load();
    }, []);

    const handleClear = async () => {
        await clearHistory();
        setItems([]);
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => {
                // un clic: mostrar detalle rápido
                // podrías hacer un Alert con item.payload.direccion, etc
            }}
            onLongPress={() => {
                // largo: marcar o algo, pero ya lo hacemos desde queue
            }}
            style={{
                padding: 12,
                marginVertical: 4,
                backgroundColor: item.estado === 'en_cola' ? '#ffeb99' : '#d4ffd4',
                borderRadius: 6,
            }}
        >
            <Text style={{ fontWeight: 'bold' }}>
                {item.payload?.direccion || '(sin dirección)'}
            </Text>
            <Text>QR: {item.payload?.codigoqr || '-'}</Text>
            <Text>Estado: {item.estado}</Text>
            <Text style={{ fontSize: 11, color: '#666' }}>
                {new Date(item.ts).toLocaleString()}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <TouchableOpacity
                onPress={handleClear}
                style={{ backgroundColor: '#d33', padding: 10, borderRadius: 6, marginBottom: 12 }}
            >
                <Text style={{ color: '#fff', textAlign: 'center' }}>Limpiar historial</Text>
            </TouchableOpacity>

            <FlatList
                data={items}
                keyExtractor={(item) => item.idLocal}
                renderItem={renderItem}
                ListEmptyComponent={<Text>No hay mantenciones guardadas.</Text>}
            />
        </View>
    );
}
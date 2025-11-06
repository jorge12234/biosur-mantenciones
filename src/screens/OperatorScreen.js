import { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { setOperator, getOperator } from '../utils/operator';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE; // ej: http://192.168.0.88/app-biosur-v6/backend-php

export default function OperadorScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]); // [{id,nombre}]
    const [selected, setSelected] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/operadores/list.php`);
                const j = await res.json();
                if (!j?.success) throw new Error(j?.error || 'Respuesta inválida');
                setItems(j.data || []);
                const saved = await getOperator();
                if (saved?.id) setSelected(String(saved.id));
            } catch (e) {
                console.error(e);
                Alert.alert('Error', 'No se pudieron cargar los operadores.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const onGuardar = async () => {
        const op = items.find(o => String(o.id) === String(selected));
        if (!op) {
            Alert.alert('Atención', 'Debes seleccionar un operador.');
            return;
        }
        await setOperator({ id: String(op.id), nombre: op.nombre });
        Alert.alert('Listo', `Operador guardado: ${op.nombre}`, [
            { text: 'OK', onPress: () => navigation.goBack() },
        ]);
    };

    if (loading) {
        return (
            <View style={s.cnt}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8 }}>Cargando operadores…</Text>
            </View>
        );
    }

    return (
        <View style={s.cnt}>
            <Text style={s.title}>Selecciona operador</Text>

            <View style={s.pickerBox}>
                <Picker
                    selectedValue={selected}
                    onValueChange={(val) => setSelected(val)}
                >
                    <Picker.Item label="-- Seleccione --" value="" />
                    {items.map(op => (
                        <Picker.Item key={op.id} label={op.nombre} value={String(op.id)} />
                    ))}
                </Picker>
            </View>

            <Button title="Guardar" onPress={onGuardar} />
        </View>
    );
}

const s = StyleSheet.create({
    cnt: { flex: 1, padding: 16, justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    pickerBox: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 16 }
});

// src/screens/HomeScreen.js
import { useEffect, useState } from 'react';
import {
    View,
    Text,
    Button,
    StyleSheet,
    Alert,
    ActivityIndicator,
    TouchableOpacity,   // 👈 AGREGAR ESTO
} from 'react-native';
import * as Network from 'expo-network';

import { syncRoutes } from '../utils/syncRoutes';
import { saveRutasOffline, getRutasOffline } from '../utils/routesCache';
import { getOperator } from '../utils/operator';

export default function HomeScreen({ navigation }) {
    const [loading, setLoading] = useState(false);
    const [count, setCount] = useState(null);
    const [operador, setOperador] = useState('');

    useEffect(() => {
        const load = async () => {
            const op = await getOperator();
            setOperador(op.nombre || '');
        };

        const unsub = navigation.addListener('focus', load);
        load();
        return unsub;
    }, [navigation]);

    const cargarRutas = async () => {
        setLoading(true);
        try {
            const net = await Network.getNetworkStateAsync();
            const online = !!net.isConnected && !!net.isInternetReachable;

            if (!online) {
                Alert.alert('Sin conexión', 'No hay internet para actualizar rutas.');
                return;
            }

            const rutas = await syncRoutes();
            await saveRutasOffline(rutas);
            setCount(rutas.length);

            Alert.alert('Listo', `Rutas sincronizadas (${rutas.length}).`);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'No se pudieron sincronizar las rutas.');
        } finally {
            setLoading(false);
        }
    };

    const verCuantasTengo = async () => {
        const rutas = await getRutasOffline();
        Alert.alert('Caché', `Tienes ${rutas.length} rutas guardadas offline.`);
    };

    return (
        <View style={styles.cnt}>
            <Text style={styles.title}>Bienvenido a Biosur Mantenciones</Text>

            <Text style={styles.subtitle}>
                Operador actual:{' '}
                <Text style={{ fontWeight: '700' }}>
                    {operador || '— no definido —'}
                </Text>
            </Text>

            <View style={styles.gap}>
                <Button
                    title="Registrar mantención"
                    onPress={() => navigation.navigate('Scanner')}
                />
            </View>

            <View style={styles.divider} />

            <View style={styles.gap}>
                <Button
                    title="Cargar / Actualizar rutas"
                    onPress={cargarRutas}
                    disabled={loading}
                />
            </View>
            <View style={styles.gap}>
                <Button
                    title="Configurar operador"
                    onPress={() => navigation.navigate('Operador')}
                />
            </View>

            <View style={styles.gap}>
                <Button
                    title="¿Cuántas rutas tengo guardadas?"
                    onPress={verCuantasTengo}
                />
            </View>

            <View style={styles.gap}>
                <Button
                    title="Ver rutas guardadas"
                    onPress={() => navigation.navigate('RutasGuardadas')}
                />
            </View>

            {/* 👇 este era el que reventaba */}
            <TouchableOpacity
                style={{ padding: 14, backgroundColor: '#eee', marginBottom: 10 }}
                onPress={() => navigation.navigate('VerMantenciones')}
            >
                <Text>Ver mantenciones locales</Text>
            </TouchableOpacity>

            {loading && (
                <View style={{ marginTop: 16, alignItems: 'center' }}>
                    <ActivityIndicator />
                    <Text style={{ marginTop: 8 }}>Sincronizando…</Text>
                </View>
            )}

            {count != null && (
                <Text style={{ marginTop: 8 }}>
                    Última sincronización: {count} rutas
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cnt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
    subtitle: { marginBottom: 12, textAlign: 'center' },
    gap: { width: '100%', marginVertical: 6 },
    divider: { height: 10 },
});

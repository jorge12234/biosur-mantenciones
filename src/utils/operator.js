import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'operador:selected';

export async function setOperator(op) {
    // op = { id: string|number, nombre: string }
    await AsyncStorage.setItem(KEY, JSON.stringify(op || {}));
}

export async function getOperator() {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { id: '', nombre: '' };
    try { return JSON.parse(raw) || { id: '', nombre: '' }; }
    catch { return { id: '', nombre: '' }; }
}

export async function clearOperator() {
    await AsyncStorage.removeItem(KEY);
}

// Accesos rápidos
export async function getOperadorId() {
    const op = await getOperator();
    return op.id || '';
}
export async function getOperadorNombre() {
    const op = await getOperator();
    return op.nombre || '';
}

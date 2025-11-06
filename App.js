// App.js
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import MantencionFormScreen from './src/screens/MantencionFormScreen';
import RutasGuardadasScreen from './src/screens/RutasGuardadasScreen';
import OperatorScreen from './src/screens/OperatorScreen';
import MantencionesLocalesScreen from './src/screens/MantencionesLocalesScreen';
import VerMantencionesScreen from './src/screens/VerMantencionesScreen';

import { startPendingQueue } from './src/utils/pendingQueue';

const Stack = createNativeStackNavigator();

export default function App() {
    useEffect(() => {
        // arranca la cola
        startPendingQueue();
    }, []);

    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Biosur Mantenciones' }} />
                <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Escanear' }} />
                <Stack.Screen name="MantencionForm" component={MantencionFormScreen} options={{ title: 'Registrar mantención' }} />
                <Stack.Screen name="RutasGuardadas" component={RutasGuardadasScreen} options={{ title: 'Rutas guardadas' }} />
                <Stack.Screen name="Operador" component={OperatorScreen} options={{ title: 'Configurar operador' }} />
                <Stack.Screen name="MantencionesLocales" component={MantencionesLocalesScreen} options={{ title: 'Mantenciones locales' }} />
                <Stack.Screen
                    name="VerMantenciones"
                    component={VerMantencionesScreen}
                    options={{ title: 'Historial de mantenciones' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

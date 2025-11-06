import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';

export default function ScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const handledRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    handledRef.current = false;
  }, []);

  const onBarcodeScanned = ({ data, type }) => {
    if (handledRef.current) return;
    handledRef.current = true;
    try{
      let params = {};
      try { params = JSON.parse(data); }
      catch { params = { banno_id: data }; }
      navigation.replace('MantencionForm', { ...params, rawQR: data, type });
    }catch(e){
      Alert.alert('Error','Código inválido');
      handledRef.current = false;
    }
  };

  if (hasPermission === null) return <View style={styles.center}><ActivityIndicator/></View>;
  if (hasPermission === false) return <View style={styles.center}><Text>Sin permisos de cámara</Text></View>;

  return (
    <View style={{ flex:1 }}>
      <CameraView
        style={{ flex:1 }}
        onBarcodeScanned={onBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr','ean13','code128'] }}
      />
      <View style={styles.overlay}><Text style={styles.help}>Apunta al código</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex:1, alignItems:'center', justifyContent:'center' },
  overlay: { position:'absolute', bottom:18, alignSelf:'center', backgroundColor:'rgba(0,0,0,0.5)', paddingHorizontal:12, paddingVertical:6, borderRadius:8 },
  help: { color:'#fff', fontWeight:'600' }
});

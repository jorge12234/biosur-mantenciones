/*
import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabase('biosur.db');

export function ensureSchema() {
    db.transaction(tx => {
        tx.executeSql(`
      CREATE TABLE IF NOT EXISTS rutas_cache (
        code TEXT PRIMARY KEY NOT NULL,
        banno_id TEXT,
        cliente_id TEXT,
        cliente_nombre TEXT,
        cliente_correo TEXT,
        direccion TEXT
      );
    `);
    });
    console.log('✅ Tabla rutas_cache creada (modo clásico)');
}
*/

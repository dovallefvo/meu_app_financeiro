export default class Database {
    constructor(dbName = 'FinancasPWA', version = 2) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }
    async inicializar() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = (e) => reject(e.target.error);
            request.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('transacoes')) {
                    const store = db.createObjectStore('transacoes', { keyPath: '_id' });
                    store.createIndex('data_transacao', 'data_transacao', { unique: false });
                    store.createIndex('pendente_sync', 'pendente_sync', { unique: false });
                }
                if (!db.objectStoreNames.contains('dominios')) {
                    db.createObjectStore('dominios', { keyPath: 'tipo' });
                }
            };
        });
    }
    async salvar(storeName, objeto) {
        if (!this.db) throw new Error('DB fechada');
        return new Promise((resolve, reject) => {
            const request = this.db.transaction([storeName], 'readwrite').objectStore(storeName).put(objeto);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }
    async listarTodas(storeName) {
        if (!this.db) throw new Error('DB fechada');
        return new Promise((resolve, reject) => {
            const request = this.db.transaction([storeName], 'readonly').objectStore(storeName).openCursor();
            const resultados = [];
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) { resultados.push(cursor.value); cursor.continue(); } else resolve(resultados);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }
    async excluir(storeName, id) {
        return new Promise((resolve, reject) => {
            const request = this.db.transaction([storeName], 'readwrite').objectStore(storeName).delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    }
}
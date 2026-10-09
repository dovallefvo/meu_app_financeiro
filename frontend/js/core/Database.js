export default class Database {
    constructor(dbName = 'FinancasPWA', version = 4) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }
    async inicializar() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = (e) => {
                console.error('[Database] ❌ Erro ao abrir IndexedDB:', e.target.error);
                reject(e.target.error);
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log('[Database] ✅ IndexedDB inicializado com sucesso.');
                resolve(this.db);
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                console.log('[Database] 🔄 Upgrade necessário no IndexedDB...');
                if (!db.objectStoreNames.contains('transacoes')) {
                    const store = db.createObjectStore('transacoes', { keyPath: '_id' });
                    store.createIndex('data_transacao', 'data_transacao', { unique: false });
                    store.createIndex('pendente_sync', 'pendente_sync', { unique: false });
                }
                if (!db.objectStoreNames.contains('moedas')) db.createObjectStore('moedas', { keyPath: '_id' });
                if (!db.objectStoreNames.contains('formas_pagamento')) db.createObjectStore('formas_pagamento', { keyPath: '_id' });
                if (!db.objectStoreNames.contains('categorias')) db.createObjectStore('categorias', { keyPath: '_id' });
            };
        });
    }
    async salvar(storeName, objeto) {
        if (!this.db) throw new Error('DB fechada');
        return new Promise((resolve, reject) => {
            const request = this.db.transaction([storeName], 'readwrite').objectStore(storeName).put(objeto);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => {
                console.error(`[Database] ❌ Erro ao salvar em '${storeName}':`, e.target.error, objeto);
                reject(e.target.error);
            };
        });
    }
    async listarTodas(storeName) {
        if (!this.db) {
            console.warn('[Database] ⚠️ Tentativa de leitura com DB fechada em:', storeName);
            return [];
        }
        return new Promise((resolve) => {
            try {
                const request = this.db.transaction([storeName], 'readonly').objectStore(storeName).openCursor();
                const resultados = [];
                request.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        resultados.push(cursor.value);
                        cursor.continue();
                    } else {
                        console.log(`[Database] 📖 Listados ${resultados.length} registos de '${storeName}'.`);
                        resolve(resultados);
                    }
                };
                request.onerror = () => {
                    console.warn(`[Database] ⚠️ Erro ao listar '${storeName}'. Retornando vazio.`);
                    resolve([]);
                };
            } catch(ex) {
                console.warn(`[Database] ⚠️ Store '${storeName}' ainda não existe. Retornando vazio.`);
                resolve([]);
            }
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

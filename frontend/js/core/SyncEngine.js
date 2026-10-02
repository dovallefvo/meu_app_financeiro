export default class SyncEngine {
    constructor(database, store, apiEndpoint = 'http://localhost:8000/api/sync') {
        this.db = database;
        this.store = store;
        this.apiEndpoint = apiEndpoint;
        this.#isSyncing = false;
        this.ultimaSincronizacao = localStorage.getItem('ultima_sync') || new Date(0).toISOString();
    }

    #isSyncing;

    iniciar() {
        setInterval(() => this.sincronizar(), 10 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.sincronizar();
            }
        });
    }

    async sincronizar(isManual = false) {
        if (this.#isSyncing) return;
        this.#isSyncing = true;

        if (isManual) {
            document.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { status: 'syncing' } }));
        }

        try {
            const transacoes = await this.db.listarTodas('transacoes');
            const pendentes = transacoes.filter(t => t.pendente_sync === true);
            
            if (pendentes.length > 0) {
                const responsePush = await fetch(this.apiEndpoint + '/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transacoes: pendentes })
                });
                if (responsePush.ok) {
                    for (const p of pendentes) {
                        p.pendente_sync = false;
                        await this.db.salvar('transacoes', p);
                    }
                }
            }

            const responsePull = await fetch(this.apiEndpoint + '/pull?ultima_sync=' + encodeURIComponent(this.ultimaSincronizacao));
            if (responsePull.ok) {
                const data = await responsePull.json();
                if (data.transacoes && data.transacoes.length > 0) {
                    for (const tRemota of data.transacoes) {
                        await this.db.salvar('transacoes', tRemota);
                    }
                    await this.store.atualizarDoBanco(this.db);
                }
                this.ultimaSincronizacao = new Date().toISOString();
                localStorage.setItem('ultima_sync', this.ultimaSincronizacao);
            }

            if (isManual) {
                document.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { status: 'success' } }));
            }
        } catch (error) {
            console.warn('[SyncEngine] Modo offline ativado:', error.message);
            if (isManual) {
                document.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { status: 'error' } }));
            }
        } finally {
            this.#isSyncing = false;
        }
    }
}
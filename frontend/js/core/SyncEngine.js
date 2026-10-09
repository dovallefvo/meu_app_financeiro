export default class SyncEngine {
    constructor(database, store, apiEndpoint = 'http://localhost:8000/api/sync') {
        this.db = database;
        this.store = store;
        this.apiEndpoint = apiEndpoint;
        this.#isSyncing = false;
        
        try {
            const savedSync = localStorage.getItem('ultima_sync');
            this.ultimaSincronizacao = savedSync ? Temporal.Instant.from(savedSync) : Temporal.Instant.fromEpochMilliseconds(0);
            console.log('[SyncEngine] 🕒 Timestamp da última sincronização recuperado:', this.ultimaSincronizacao.toString());
        } catch (e) {
            console.warn('[SyncEngine] ⚠️ Falha ao ler última_sync do localStorage. Reiniciando a partir do zero.');
            this.ultimaSincronizacao = Temporal.Instant.fromEpochMilliseconds(0);
        }
    }

    #isSyncing;

    iniciar() {
        console.log('[SyncEngine] 🚀 Motor de sincronização iniciado. Disparando primeira sincronização...');
        this.sincronizar();
        setInterval(() => this.sincronizar(), 10 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('[SyncEngine] 👁️ Aba visível novamente. Acionando sincronização...');
                this.sincronizar();
            }
        });
        document.addEventListener('request-manual-sync', () => {
            console.log('[SyncEngine] 👤 Sincronização manual solicitada pelo utilizador.');
            this.sincronizar();
        });
    }

    async sincronizar() {
        if (this.#isSyncing) {
            console.log('[SyncEngine] ⏳ Sincronização já em curso. Ignorando chamada concorrente.');
            return;
        }
        this.#isSyncing = true;
        console.group('[SyncEngine] 🔄 Ciclo de Sincronização Iniciado');

        document.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { status: 'syncing' } }));

        try {
            const transacoesLocais = await this.db.listarTodas('transacoes');
            const pendentes = transacoesLocais.filter(t => t.pendente_sync === true);
            console.log(`[SyncEngine] 📦 Encontradas ${transacoesLocais.length} transações locais, sendo ${pendentes.length} pendentes de envio.`);

            const payload = {
                ultimo_sync_timestamp: this.ultimaSincronizacao.toString(),
                transacoes_pendentes: pendentes
            };

            console.log('[SyncEngine] 📤 A enviar payload para:', this.apiEndpoint, payload);

            const response = await fetch(this.apiEndpoint + '/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log('[SyncEngine] 📥 Resposta HTTP recebida. Status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('[SyncEngine] 📦 Payload de resposta processado:', data);

                for (const p of pendentes) {
                    p.pendente_sync = false;
                    await this.db.salvar('transacoes', p);
                }

                if (data.atualizadas_no_servidor && data.atualizadas_no_servidor.length > 0) {
                    console.log(`[SyncEngine] 📥 A gravar ${data.atualizadas_no_servidor.length} transações vindas do servidor.`);
                    for (const tRemota of data.atualizadas_no_servidor) {
                        await this.db.salvar('transacoes', tRemota);
                    }
                }

                if (data.dominios) {
                    console.log('[SyncEngine] 🌐 Processando domínios recebidos...');
                    if (data.dominios.moedas) {
                        for (const m of data.dominios.moedas) await this.db.salvar('moedas', m);
                    }
                    if (data.dominios.formas_pagamento) {
                        for (const f of data.dominios.formas_pagamento) await this.db.salvar('formas_pagamento', f);
                    }
                    if (data.dominios.categorias) {
                        for (const c of data.dominios.categorias) await this.db.salvar('categorias', c);
                    }
                }

                await this.store.atualizarDoBanco(this.db);

                if (data.novo_sync_timestamp) {
                    let tsStr = String(data.novo_sync_timestamp);
                    if (!tsStr.endsWith('Z') && !tsStr.match(/[+-]\d{2}:\d{2}$/)) {
                        tsStr += 'Z';
                    }
                    this.ultimaSincronizacao = Temporal.Instant.from(tsStr);
                    localStorage.setItem('ultima_sync', this.ultimaSincronizacao.toString());
                    console.log('[SyncEngine] ⏱️ Novo timestamp de sync guardado:', this.ultimaSincronizacao.toString());
                }

                const resumo = {
                    transacoes: data.atualizadas_no_servidor ? data.atualizadas_no_servidor.length : 0,
                    moedas: data.dominios && data.dominios.moedas ? data.dominios.moedas.length : 0,
                    formas: data.dominios && data.dominios.formas_pagamento ? data.dominios.formas_pagamento.length : 0,
                    categorias: data.dominios && data.dominios.categorias ? data.dominios.categorias.length : 0
                };
                const dataHora = Temporal.Now.zonedDateTimeISO().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

                document.dispatchEvent(new CustomEvent('sync-status-changed', { 
                    detail: { status: 'success', resumo: resumo, dataHora: dataHora } 
                }));
                console.log('[SyncEngine] ✅ Sincronização concluída com sucesso.');
            } else {
                console.error('[SyncEngine] ❌ Erro na resposta HTTP:', response.status, response.statusText);
                document.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { status: 'error' } }));
            }
        } catch (error) {
            console.error('[SyncEngine] ❌ Exceção apanhada no motor de sincronização:', error);
            document.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { status: 'error' } }));
        } finally {
            this.#isSyncing = false;
            console.groupEnd();
        }
    }
}

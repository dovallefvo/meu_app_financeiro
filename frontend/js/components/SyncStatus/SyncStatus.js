import BaseComponent from '../BaseComponent.js';
import { store } from '../../store/AppStore.js';
export default class SyncStatus extends BaseComponent {
    constructor() { super('SyncStatus'); }
    onMounted() {
        this.btnSync = this.$('#btn-sync');
        this.icon = this.$('#sync-icon');
        this.modal = this.$('#modal-sync');
        this.syncText = this.$('#sync-text');
        this.syncProgress = this.$('#sync-progress');
        this.detailsBox = this.$('#sync-details-box');
        this.syncTime = this.$('#sync-time');
        this.syncList = this.$('#sync-list');
        
        if (this.btnSync) this.btnSync.addEventListener('click', () => this.abrirModal());
        if (this.$('#btn-fechar-sync')) this.$('#btn-fechar-sync').addEventListener('click', () => this.fecharModal());
        if (this.$('#btn-forcar-sync')) this.$('#btn-forcar-sync').addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('request-manual-sync'));
        });
        
        document.addEventListener('sync-status-changed', (e) => this.atualizarStatusVisual(e.detail));
        store.subscribe(state => this.atualizarPendentes(state.transacoes));
    }
    atualizarPendentes(transacoes) {
        this.pendentes = transacoes.filter(t => t.pendente_sync).length;
        if (this.statusAtual !== 'syncing' && this.statusAtual !== 'success') {
            if (this.pendentes > 0) this.atualizarStatusVisual({ status: 'pending' });
        }
    }
    atualizarStatusVisual(detail) {
        const status = detail.status;
        this.statusAtual = status;
        if (!this.icon) return;
        this.icon.classList.remove('anim-spin', 'status-orange', 'status-green', 'status-red');
        
        if (status === 'syncing') {
            this.icon.classList.add('anim-spin', 'status-orange');
            if (this.syncText) this.syncText.textContent = 'A comunicar com o servidor...';
            if (this.syncProgress) this.syncProgress.removeAttribute('value');
            if (this.detailsBox) this.detailsBox.style.display = 'none';
        } else if (status === 'pending') {
            this.icon.classList.add('status-orange');
            if (this.syncText) this.syncText.textContent = this.pendentes + ' itens aguardam sincronização.';
            if (this.syncProgress) this.syncProgress.value = 0;
        } else if (status === 'success') {
            this.icon.classList.add('status-green');
            if (this.syncText) this.syncText.textContent = 'Dados atualizados com sucesso!';
            if (this.syncProgress) this.syncProgress.value = 100;
            
            // Exibe o relatório detalhado
            if (detail.resumo && this.detailsBox) {
                this.detailsBox.style.display = 'block';
                this.syncTime.textContent = detail.dataHora || new Date().toLocaleString('pt-BR');
                this.syncList.innerHTML = `
                    <li><b>${detail.resumo.transacoes}</b> Transações processadas</li>
                    <li><b>${detail.resumo.categorias}</b> Categorias/Subcategorias validadas</li>
                    <li><b>${detail.resumo.moedas}</b> Moedas e <b>${detail.resumo.formas}</b> Formas de Pagamento</li>
                `;
            }
        } else if (status === 'error') {
            this.icon.classList.add('status-red');
            if (this.syncText) this.syncText.textContent = 'Falha na comunicação com o servidor.';
            if (this.syncProgress) this.syncProgress.value = 0;
        }
    }
    abrirModal() {
        this.atualizarPendentes(store.state.transacoes);
        if (this.modal) this.modal.classList.add('active');
    }
    fecharModal() { if (this.modal) this.modal.classList.remove('active'); }
}
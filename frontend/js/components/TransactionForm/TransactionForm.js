import BaseComponent from '../BaseComponent.js';
import { store } from '../../store/AppStore.js';
export default class TransactionForm extends BaseComponent {
    constructor() { super('TransactionForm'); }
    onMounted() {
        this.modal = this.$('#modal');
        this.form = this.$('#form-transacao');
        this.titulo = this.$('#modal-title');
        this.$('#btn-cancelar').addEventListener('click', () => this.fechar());
        this.form.addEventListener('submit', (e) => this.salvar(e));
        store.subscribe(state => this.atualizarDominios(state.dominios));
    }
    atualizarDominios(dominios) {
        if(!dominios) return;
        const preencher = (id, valores) => {
            const select = this.$('#' + id);
            if (select && valores && select.options.length === 0) {
                valores.forEach(v => select.add(new Option(v, v)));
            }
        };
        preencher('moeda', dominios.moedas);
        preencher('forma-pagamento', dominios.formas_pagamento);
        preencher('tipo', dominios.macro_categorias);
    }
    abrir(transacaoExistente = null) {
        this.form.reset();
        this.atualizarDominios(store.state.dominios);
        if (transacaoExistente) {
            this.titulo.textContent = 'Editar Transação';
            this.$('#transacao-id').value = transacaoExistente._id;
            this.$('#data').value = transacaoExistente.data_transacao;
            this.$('#moeda').value = transacaoExistente.moeda || 'BRL';
            this.$('#valor').value = Math.abs(transacaoExistente.valor_bruto);
            this.$('#forma-pagamento').value = transacaoExistente.forma_pagamento || 'PIX';
            this.$('#descricao').value = transacaoExistente.descricao || '';
            this.$('#tipo').value = transacaoExistente.macro_categoria || 'Despesas';
            this.$('#categoria').value = transacaoExistente.categoria?.nome || '';
            this.$('#subcategoria').value = transacaoExistente.categoria?.subcategoria || '';
        } else {
            this.titulo.textContent = 'Nova Transação';
            this.$('#transacao-id').value = '';
            this.$('#data').value = Temporal.Now.plainDateISO().toString();
        }
        this.modal.classList.add('active');
    }
    fechar() { this.modal.classList.remove('active'); }
    salvar(e) {
        e.preventDefault();
        const dados = {
            _id: this.$('#transacao-id').value || crypto.randomUUID(),
            data_transacao: this.$('#data').value,
            valor_bruto: this.$('#valor').value,
            descricao: this.$('#descricao').value,
            macro_categoria: this.$('#tipo').value,
            forma_pagamento: this.$('#forma-pagamento').value,
            categoria: { nome: this.$('#categoria').value || 'Geral', subcategoria: this.$('#subcategoria').value || '' },
            moeda: this.$('#moeda').value,
            pendente_sync: true
        };
        this.dispatchEvent(new CustomEvent('salvar-transacao-global', { detail: dados, bubbles: true, composed: true }));
        this.fechar();
    }
}
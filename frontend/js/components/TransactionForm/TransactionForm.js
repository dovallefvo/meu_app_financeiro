import BaseComponent from '../BaseComponent.js';
import { store } from '../../store/AppStore.js';
import { FormatUtils } from '../../utils/FormatUtils.js';
export default class TransactionForm extends BaseComponent {
    constructor() { super('TransactionForm'); }
    onMounted() {
        this.modal = this.$('#modal');
        this.form = this.$('#form-transacao');
        this.titulo = this.$('#modal-title');
        this.btnExcluir = this.$('#btn-excluir');
        this.inputMoeda = this.$('#moeda');
        this.labelValor = this.$('#label-valor');
        
        this.$('#btn-cancelar').addEventListener('click', () => this.fechar());
        this.form.addEventListener('submit', (e) => this.salvar(e));
        
        if (this.inputMoeda) {
            this.inputMoeda.addEventListener('input', () => this.atualizarLabelValorDinamico());
            this.inputMoeda.addEventListener('change', () => this.atualizarLabelValorDinamico());
        }
        
        if (this.btnExcluir) {
            this.btnExcluir.addEventListener('click', () => {
                const idTransacao = this.$('#transacao-id').value;
                if (idTransacao && confirm('Tem certeza que deseja excluir esta transação?')) {
                    this.dispatchEvent(new CustomEvent('excluir-transacao-global', { detail: idTransacao, bubbles: true, composed: true }));
                    this.fechar();
                }
            });
        }
        
        this.atualizarDominios(store.state.dominios);
        store.subscribe(state => this.atualizarDominios(state.dominios));
    }
    atualizarLabelValorDinamico() {
        if (!this.inputMoeda || !this.labelValor) return;
        const valorMoeda = this.inputMoeda.value.trim();
        const sigla = valorMoeda.split(' ')[0]; // Pega a sigla limpa (ex: BRL)
        const simbolo = FormatUtils.obterSimboloMoeda(sigla);
        if (simbolo && simbolo !== sigla) {
            this.labelValor.textContent = 'Valor (' + simbolo + ')';
        } else if (sigla) {
            this.labelValor.textContent = 'Valor (' + sigla + ')';
        } else {
            this.labelValor.textContent = 'Valor';
        }
    }
    atualizarDominios(dominios) {
        const doms = dominios || store.state.dominios;
        if (!doms) return;
        
        const preencherDatalist = (idDatalist, valores) => {
            const datalist = this.$('#' + idDatalist);
            if (datalist && valores && Array.isArray(valores)) {
                datalist.innerHTML = '';
                valores.forEach(v => {
                    if (v) {
                        const opt = document.createElement('option');
                        opt.value = v;
                        datalist.appendChild(opt);
                    }
                });
            }
        };
        
        // Mantém a lista limpa apenas com as siglas no datalist
        if (doms.moedas && Array.isArray(doms.moedas)) {
            const listaMoedasStrs = doms.moedas.map(m => {
                return typeof m === 'object' ? (m.sigla || '') : String(m);
            }).filter(Boolean);
            preencherDatalist('lista-moedas', listaMoedasStrs);
        }
        
        preencherDatalist('lista-formas-pagamento', doms.formas_pagamento);
        preencherDatalist('lista-tipos', doms.macro_categorias);
        preencherDatalist('lista-categorias', doms.categorias);
        preencherDatalist('lista-subcategorias', doms.subcategorias);
    }
    abrir(transacaoExistente = null) {
        this.form.reset();
        this.atualizarDominios(store.state.dominios);
        
        if (transacaoExistente) {
            this.titulo.textContent = 'Editar Transação';
            if (this.btnExcluir) this.btnExcluir.style.display = 'inline-block';
            
            this.$('#transacao-id').value = transacaoExistente._id || '';
            
            try {
                const dataRaw = transacaoExistente.data_transacao;
                const plainDate = dataRaw ? Temporal.PlainDate.from(dataRaw.toString().split('T')[0]) : Temporal.Now.plainDateISO();
                this.$('#data').value = plainDate.toString();
            } catch(e) {
                this.$('#data').value = Temporal.Now.plainDateISO().toString();
            }
            
            const moedaOrig = transacaoExistente.moeda_original || transacaoExistente.moeda || 'BRL';
            if (this.inputMoeda) this.inputMoeda.value = moedaOrig;
            
            const valorVal = Math.abs(transacaoExistente.valor_calculado !== undefined ? transacaoExistente.valor_calculado : (transacaoExistente.valor_bruto || 0));
            if (this.$('#valor')) this.$('#valor').value = valorVal;
            
            const pgtoVal = transacaoExistente.forma_pagamento || '';
            if (this.$('#forma-pagamento')) this.$('#forma-pagamento').value = pgtoVal;
            
            if (this.$('#descricao')) this.$('#descricao').value = transacaoExistente.descricao || '';
            
            const macroVal = transacaoExistente.categoria?.macrocategoria_nome || transacaoExistente.macro_categoria || '';
            if (this.$('#tipo')) this.$('#tipo').value = macroVal;
            
            const catNome = transacaoExistente.categoria?.categoria_nome || transacaoExistente.categoria?.nome || '';
            const subNome = transacaoExistente.categoria?.subcategoria_nome || transacaoExistente.categoria?.subcategoria || '';
            
            if (this.$('#categoria')) this.$('#categoria').value = catNome;
            if (this.$('#subcategoria')) this.$('#subcategoria').value = subNome;
        } else {
            this.titulo.textContent = 'Nova Transação';
            if (this.btnExcluir) this.btnExcluir.style.display = 'none';
            
            this.$('#transacao-id').value = '';
            this.$('#data').value = Temporal.Now.plainDateISO().toString();
            
            const doms = store.state.dominios;
            if (doms && doms.moedas && doms.moedas.length > 0) {
                const moedaPadrao = doms.moedas.find(m => m.moeda_padrao === true) || doms.moedas[0];
                const sigla = typeof moedaPadrao === 'object' ? (moedaPadrao.sigla || 'BRL') : String(moedaPadrao);
                if (this.inputMoeda) this.inputMoeda.value = sigla;
            } else {
                if (this.inputMoeda) this.inputMoeda.value = 'BRL';
            }
        }
        this.atualizarLabelValorDinamico();
        this.modal.classList.add('active');
    }
    fechar() { this.modal.classList.remove('active'); }
    salvar(e) {
        e.preventDefault();
        const macro = this.$('#tipo').value;
        const bruto = parseFloat(this.$('#valor').value) || 0;       
        
        const dados = {
            _id: this.$('#transacao-id').value || crypto.randomUUID(),
            data_transacao: this.$('#data').value,
            descricao: this.$('#descricao').value,
            moeda_original: this.$('#inputMoeda').value,
            valor_bruto: bruto,
            forma_pagamento: this.$('#forma-pagamento').value,
            macro_categoria: macro,
            categoria: {
                subcategoria_id: 'sub_' + crypto.randomUUID().slice(0, 8),
                macrocategoria_nome: macro,
                categoria_nome: this.$('#categoria').value || '',
                subcategoria_nome: this.$('#subcategoria').value || ''
            },
            pendente_sync: true
        };
        this.dispatchEvent(new CustomEvent('salvar-transacao-global', { detail: dados, bubbles: true, composed: true }));
        this.fechar();
    }
}
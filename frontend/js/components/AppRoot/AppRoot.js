import { CategoryUtils } from '../../utils/CategoryUtils.js';
import BaseComponent from '../BaseComponent.js';
import { store } from '../../store/AppStore.js';
import TagMultiselect from '../TagMultiselect/TagMultiselect.js';
import TreeView from '../TreeView/TreeView.js';

export default class AppRoot extends BaseComponent {
    constructor() { super('AppRoot'); }

    onMounted() {
        this.modalFiltros = this.$('#modal-filtros');
        this.btnAbrirModal = this.$('#btn-abrir-modal-filtros');
        this.btnFecharModal = this.$('#btn-fechar-modal-filtros');
        
        this.dataInicio = this.$('#filtro-data-inicio');
        this.dataFim = this.$('#filtro-data-fim');
        this.valorMin = this.$('#filtro-valor-min');
        this.valorMax = this.$('#filtro-valor-max');
        this.tagMoedas = this.$('#filtro-moedas');
        this.tagFormas = this.$('#filtro-formas');
        this.treeView = this.$('#filtro-tree');

        this.rascunhoFiltros = {};

        store.subscribe(state => {
            const doms = state.dominios || {};
            if (this.tagMoedas && doms.moedas) this.tagMoedas.setOpcoes(doms.moedas.map(m => typeof m === 'object' ? m.sigla : m).filter(Boolean));
            if (this.tagFormas && doms.formas_pagamento) this.tagFormas.setOpcoes(doms.formas_pagamento);
            console.log('[AppRoot] 🌐 Domínios detetados no Store para a árvore:', doms);
            if (this.treeView && doms) { const arvoreNodes = CategoryUtils.buildTree(doms); this.treeView.setData(arvoreNodes); }
            this.atualizarChips(state.filtros);
        });

        if (this.btnAbrirModal) {
            this.btnAbrirModal.addEventListener('click', () => {
                this.rascunhoFiltros = { ...store.state.filtros };
                
                if (this.dataInicio) this.dataInicio.value = this.rascunhoFiltros.data_inicio || '2024-05-01';
                if (this.dataFim) this.dataFim.value = this.rascunhoFiltros.data_fim || '';
                if (this.valorMin) this.valorMin.value = this.rascunhoFiltros.valor_min || '';
                if (this.valorMax) this.valorMax.value = this.rascunhoFiltros.valor_max || '';
                
                if (this.tagMoedas) this.tagMoedas.setSelecionados(this.rascunhoFiltros.moedas);
                if (this.tagFormas) this.tagFormas.setSelecionados(this.rascunhoFiltros.formas_pagamento);
                if (this.treeView) this.treeView.setSelecionados(this.rascunhoFiltros.categorias_ids);
                
                if (this.modalFiltros) this.modalFiltros.style.display = 'flex';
            });
        }
        
        if (this.btnFecharModal) this.btnFecharModal.addEventListener('click', () => {
            if (this.modalFiltros) this.modalFiltros.style.display = 'none';
        });

        const updateDraft = (key, value) => { this.rascunhoFiltros[key] = value; };
        if (this.dataInicio) this.dataInicio.addEventListener('change', e => updateDraft('data_inicio', e.target.value));
        if (this.dataFim) this.dataFim.addEventListener('change', e => updateDraft('data_fim', e.target.value));
        if (this.valorMin) this.valorMin.addEventListener('change', e => updateDraft('valor_min', e.target.value ? parseFloat(e.target.value) : null));
        if (this.valorMax) this.valorMax.addEventListener('change', e => updateDraft('valor_max', e.target.value ? parseFloat(e.target.value) : null));
        if (this.tagMoedas) this.tagMoedas.addEventListener('change', e => updateDraft('moedas', e.detail));
        if (this.tagFormas) this.tagFormas.addEventListener('change', e => updateDraft('formas_pagamento', e.detail));
        if (this.treeView) this.treeView.addEventListener('change', e => updateDraft('categorias_ids', e.detail));

        const btnAplicar = this.$('#btn-aplicar-filtro');
        if (btnAplicar) {
            btnAplicar.addEventListener('click', () => {
                store.atualizarFiltros(this.rascunhoFiltros);
                if (this.modalFiltros) this.modalFiltros.style.display = 'none';
            });
        }

        const btnFiltroPadrao = this.$('#btn-filtro-padrao');
        if (btnFiltroPadrao) {
            btnFiltroPadrao.addEventListener('click', () => {
                const dataHoje = Temporal.Now.plainDateISO().toString();
                const defaultFiltros = {
                    pesquisa_rapida: store.state.filtros.pesquisa_rapida,
                    data_inicio: '2024-05-01',
                    data_fim: dataHoje,
                    valor_min: null,
                    valor_max: null,
                    moedas: [],
                    formas_pagamento: [],
                    categorias_ids: []
                };
                store.atualizarFiltros(defaultFiltros);
                if (this.modalFiltros) this.modalFiltros.style.display = 'none';
            });
        }

        const inputSearch = this.$('#pesquisa-rapida');
        let searchTimeout;
        if (inputSearch) {
            inputSearch.addEventListener('input', e => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => store.atualizarFiltros({ pesquisa_rapida: e.target.value.trim().toLowerCase() }), 300);
            });
        }

        // Blindagem Extrema do FAB de Adicionar
        const btnNovaTransacao = this.$('#btn-nova-transacao');
        if (btnNovaTransacao) {
            btnNovaTransacao.addEventListener('click', () => {
                let formComp = document.querySelector('app-transaction-form');
                if (!formComp) {
                    formComp = document.createElement('app-transaction-form');
                    document.body.appendChild(formComp);
                }
                
                if (formComp && typeof formComp.abrir === 'function') {
                    formComp.abrir(); // Modo Criação
                } else {
                    console.error('[AppRoot] Erro Crítico: <app-transaction-form> encontrado no DOM mas falhou ao instanciar o método abrir().');
                }
            });
        }
    }

    atualizarChips(filtros) {
        const lista = this.$('#chips-lista');
        if (!lista) return;
        lista.innerHTML = '';

        const criarChip = (texto, onRemover) => {
            const chip = document.createElement('div');
            chip.style.cssText = 'background: #1a73e8; color: white; padding: 4px 12px; border-radius: 16px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;';
            chip.innerHTML = `${texto} <span style="cursor: pointer; font-weight: bold;">×</span>`;
            chip.querySelector('span').addEventListener('click', onRemover);
            lista.appendChild(chip);
        };

        if (filtros.data_inicio !== '2024-05-01' || filtros.data_fim) {
            criarChip(`Data: ${filtros.data_inicio || '2024-05-01'} / ${filtros.data_fim || 'Hoje'}`, () => store.atualizarFiltros({ data_inicio: '2024-05-01', data_fim: null }));
        }
        if (filtros.valor_min !== null || filtros.valor_max !== null) {
            criarChip(`Valor: ${filtros.valor_min ?? '0'} a ${filtros.valor_max ?? '∞'}`, () => store.atualizarFiltros({ valor_min: null, valor_max: null }));
        }
        if (filtros.moedas && filtros.moedas.length) criarChip(`Moedas (${filtros.moedas.length})`, () => store.atualizarFiltros({ moedas: [] }));
        if (filtros.formas_pagamento && filtros.formas_pagamento.length) criarChip(`Pagamento (${filtros.formas_pagamento.length})`, () => store.atualizarFiltros({ formas_pagamento: [] }));
        if (filtros.categorias_ids && filtros.categorias_ids.length) criarChip(`Categorias (${filtros.categorias_ids.length})`, () => store.atualizarFiltros({ categorias_ids: [] }));
    }
}
if (!customElements.get('app-root')) customElements.define('app-root', AppRoot);

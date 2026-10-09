import { CategoryConstants } from '../../utils/CategoryConstants.js';
import BaseComponent from '../BaseComponent.js';
import { store } from '../../store/AppStore.js';
import { FormatUtils } from '../../utils/FormatUtils.js';

export default class Timeline extends BaseComponent {
    constructor() { super('Timeline'); }

    connectedCallback() {
        if (super.connectedCallback) super.connectedCallback();
        this.renderizar(store.state);
        store.subscribe(state => this.renderizar(state));
    }

    renderizar(state) {
        const transacoes = state.transacoes || [];
        const filtros = state.filtros || {};
        const contentor = this.shadowRoot || this;

        if (transacoes.length === 0) {
            contentor.innerHTML = '<div style="padding: 3rem; text-align: center; color: #5f6368; font-size: 1rem;">Nenhuma transação registada.</div>';
            return;
        }

        const filtradas = transacoes.filter(t => {
            const termo = filtros.pesquisa_rapida || '';
            if (termo) {
                const desc = (t.descricao || '').toLowerCase();
                const cat = (t.categoria?.categoria_nome || t.categoria?.nome || '').toLowerCase();
                const sub = (t.categoria?.subcategoria_nome || t.categoria?.subcategoria || '').toLowerCase();
                const pgto = (t.forma_pagamento || '').toLowerCase();
                if (!desc.includes(termo) && !cat.includes(termo) && !sub.includes(termo) && !pgto.includes(termo)) return false;
            }

            const dataTrans = t.data_transacao ? t.data_transacao.split('T')[0] : '';
            if (filtros.data_inicio && dataTrans < filtros.data_inicio) return false;
            if (filtros.data_fim && dataTrans > filtros.data_fim) return false;

            const valor = t.valor_calculado !== undefined ? t.valor_calculado : (t.valor_bruto || 0);
            if (filtros.valor_min !== null && valor < filtros.valor_min) return false;
            if (filtros.valor_max !== null && valor > filtros.valor_max) return false;

            const moeda = t.moeda_original || t.moeda || 'BRL';
            if (filtros.moedas && filtros.moedas.length > 0 && !filtros.moedas.includes(moeda)) return false;

            const pgtoT = t.forma_pagamento || '';
            if (filtros.formas_pagamento && filtros.formas_pagamento.length > 0 && !filtros.formas_pagamento.includes(pgtoT)) return false;

            // Filtro Hierárquico: Avalia Macro, Categoria e Subcategoria sem re-declarar variáveis
            // Filtro Hierárquico Limpo - Procura a correspondência de nome diretamente na transação
            if (filtros.categorias_ids && filtros.categorias_ids.length > 0) {
                const macro = t.categoria?.macrocategoria_nome || t.macrocategoria_nome || t.macro_categoria || t.tipo || t.natureza || '';
                const cat = t.categoria?.categoria_nome || t.categoria_nome || '';
                const sub = t.categoria?.subcategoria_nome || t.subcategoria_nome || '';

                const matchMacro = filtros.categorias_ids.includes(macro);
                const matchCat = filtros.categorias_ids.includes(cat);
                const matchSub = filtros.categorias_ids.includes(sub);

                if (!matchMacro && !matchCat && !matchSub) {
                    return false;
                }
            }

            return true;
        });

        if (filtradas.length === 0) {
            contentor.innerHTML = '<div style="padding: 3rem; text-align: center; color: #5f6368; font-size: 1rem;">Nenhum resultado encontrado com os filtros aplicados.</div>';
            return;
        }

        const gruposPorData = {};
        filtradas.forEach(t => {
            const dataKey = t.data_transacao ? t.data_transacao.split('T')[0] : 'Sem Data';
            if (!gruposPorData[dataKey]) gruposPorData[dataKey] = [];
            gruposPorData[dataKey].push(t);
        });

        const datasOrdenadas = Object.keys(gruposPorData).sort().reverse();
        
        let html = '<div class="timeline-container" style="max-width: 950px; margin: 0 auto; padding-bottom: 90px;">';
        
        datasOrdenadas.forEach(dataStr => {
            let dataFormatada = dataStr;
            try {
                if (dataStr !== 'Sem Data') {
                    const plainDate = Temporal.PlainDate.from(dataStr);
                    dataFormatada = plainDate.toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                    dataFormatada = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
                }
            } catch (e) {}

            html += `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 0.95rem; font-weight: 500; color: #5f6368; margin-bottom: 8px; padding-left: 4px;">
                        ${dataFormatada}
                    </div>
            `;

            gruposPorData[dataStr].forEach(t => {
                const valor = t.valor_calculado !== undefined ? t.valor_calculado : (t.valor_bruto || 0);
                const desc = t.descricao || '';
                const cat = t.categoria?.categoria_nome || t.categoria?.nome || t.macro_categoria || 'Geral';
                const sub = t.categoria?.subcategoria_nome || t.categoria?.subcategoria || '';
                const pgto = t.forma_pagamento || '';
                const corValor = valor < 0 ? '#c5221f' : '#137333';
                const simboloMoeda = FormatUtils.obterSimboloMoeda(t.moeda_original || t.moeda || 'BRL');
                
                html += `
                    <div style="background: white; border-radius: 8px; border: 1px solid #e0e0e0; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden;">
                        <div style="padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 500; color: #202124; font-size: 1.05rem;">
                                    ${cat}${sub ? ' / ' + sub : ''}
                                </div>
                                <div style="font-size: 0.85rem; color: #5f6368; margin-top: 3px;">
                                    ${desc}
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                                    <div style="font-weight: bold; color: ${corValor}; font-size: 1.1rem;">
                                        ${valor < 0 ? '- ' : ''}${simboloMoeda} ${Math.abs(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    ${pgto ? `<div style="font-size: 0.75rem; background: #f1f3f4; color: #5f6368; padding: 2px 8px; border-radius: 4px; margin-top: 4px; display: inline-block;">${pgto}</div>` : ''}
                                </div>
                                <div style="display: flex; gap: 8px; color: #5f6368; border-left: 1px solid #e0e0e0; padding-left: 12px;">
                                    <button class="btn-editar" data-id="${t._id}" style="background: none; border: none; cursor: pointer; font-size: 1rem;" title="Editar">✏️</button>
                                    <button class="btn-excluir" data-id="${t._id}" style="background: none; border: none; cursor: pointer; font-size: 1rem;" title="Excluir">🗑️</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        });
        html += '</div>';
        contentor.innerHTML = html;

        // Blindagem do botão editar
        contentor.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const transacao = transacoes.find(tr => tr._id === id);
                if (transacao) {
                    let formComp = document.querySelector('app-transaction-form');
                    if (!formComp) {
                        formComp = document.createElement('app-transaction-form');
                        document.body.appendChild(formComp);
                    }
                    if (formComp && typeof formComp.abrir === 'function') {
                        formComp.abrir(transacao);
                    }
                }
            });
        });

        contentor.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('Tem certeza que deseja excluir esta transação?')) {
                    document.dispatchEvent(new CustomEvent('excluir-transacao-global', { detail: id, bubbles: true, composed: true }));
                }
            });
        });
    }
}
if (!customElements.get('app-timeline')) customElements.define('app-timeline', Timeline);

import BaseComponent from '../BaseComponent.js';
export default class Timeline extends BaseComponent {
    constructor() { super('Timeline'); }
    renderizarTransacoes(transacoes) {
        const container = this.$('.timeline-container');
        if (!container) return;
        container.innerHTML = '';
        if (!transacoes || transacoes.length === 0) {
            container.innerHTML = "<p style='text-align: center; color: var(--color-text-muted); padding: 2rem;'>Nenhuma transação registada.</p>";
            return;
        }
        const ordenadas = [...transacoes].sort((a, b) => Temporal.PlainDate.compare(b.data_transacao, a.data_transacao));
        const agrupadas = new Map();
        ordenadas.forEach(t => {
            const dataStr = Temporal.PlainDate.from(t.data_transacao).toString();
            if (!agrupadas.has(dataStr)) agrupadas.set(dataStr, []);
            agrupadas.get(dataStr).push(t);
        });
        for (const [dataIso, lista] of agrupadas.entries()) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'date-group';
            const headerDiv = document.createElement('div');
            headerDiv.className = 'date-header';
            headerDiv.textContent = this.formatarData(dataIso);
            groupDiv.appendChild(headerDiv);
            lista.forEach(t => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'transaction-item';
                const catNome = t.categoria?.nome || 'Geral';
                const subNome = t.categoria?.subcategoria ? ' / ' + t.categoria.subcategoria : '';
                const v = t.valor_bruto || 0;
                const isExp = v < 0 || t.macro_categoria === 'Despesas';
                const fmtVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: t.moeda || 'BRL' }).format(Math.abs(v));
                const sinal = isExp ? '-' : '+';
                const pgto = t.forma_pagamento || 'Dinheiro';
                itemDiv.innerHTML = 
                    "<div class='item-main'>" +
                        "<span class='item-category'>" + catNome + subNome + "</span>" +
                        "<span class='item-description'>" + (t.descricao || '') + "</span>" +
                    "</div>" +
                    "<div class='item-right'>" +
                        "<span class='item-value '" + (isExp ? 'expense' : 'income') + "'>" + sinal + ' ' + fmtVal + "</span>" +
                        "<span class='item-payment'>" + pgto + "</span>" +
                    "</div>" +
                    "<div class='item-actions'>" +
                        "<button class='btn-icon edit' title='Editar'>" + '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>' + "</button>" +
                        "<button class='btn-icon delete' title='Excluir'>" + '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>' + "</button>" +
                    "</div>";
                itemDiv.querySelector('.edit').addEventListener('click', () => this.dispatchEvent(new CustomEvent('editar-transacao', { detail: t, bubbles: true, composed: true })));
                itemDiv.querySelector('.delete').addEventListener('click', () => this.dispatchEvent(new CustomEvent('excluir-transacao', { detail: t._id, bubbles: true, composed: true })));
                groupDiv.appendChild(itemDiv);
            });
            container.appendChild(groupDiv);
        }
    }
    formatarData(dataStr) {
        try {
            return Temporal.PlainDate.from(dataStr).toLocaleString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        } catch(e) { return dataStr; }
    }
}
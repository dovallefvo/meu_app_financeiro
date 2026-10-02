import BaseModel from './BaseModel.js';
export default class Transacao extends BaseModel {
    constructor(dados = {}) {
        super();
        this._id = dados._id || crypto.randomUUID();
        this.data_transacao = dados.data_transacao || Temporal.Now.plainDateISO().toString();
        
        let valor = parseFloat(dados.valor_bruto) || 0;
        this.macro_categoria = dados.macro_categoria || 'Despesas';
        
        if (this.macro_categoria === 'Despesas') valor = -Math.abs(valor);
        else valor = Math.abs(valor);
        
        this.valor_bruto = valor;
        this.descricao = dados.descricao || '';
        this.forma_pagamento = dados.forma_pagamento || 'Dinheiro';
        this.categoria = dados.categoria || { nome: 'Geral', subcategoria: '' };
        this.moeda = dados.moeda || 'BRL';
        this.pendente_sync = dados.pendente_sync !== undefined ? dados.pendente_sync : true;
    }
}
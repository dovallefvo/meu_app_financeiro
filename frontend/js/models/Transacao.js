import BaseModel from './BaseModel.js';
export default class Transacao extends BaseModel {
    constructor(dados = {}) {
        super();
        this._id = dados._id || crypto.randomUUID();
        this.data_transacao = dados.data_transacao || Temporal.Now.plainDateISO().toString();
        
        let valor = parseFloat(dados.valor_bruto) || 0;
        this.macro_categoria = dados.macro_categoria || 'Despesa';
        
        if (this.macro_categoria === 'Despesa') valor = -Math.abs(valor);
        else valor = Math.abs(valor);
        
        this.valor_bruto = valor;
        this.descricao = dados.descricao || '';
        this.forma_pagamento = dados.forma_pagamento || '';
        this.categoria = dados.categoria || { nome: '', subcategoria: '' };
        this.moeda = dados.moeda || '';
        this.pendente_sync = dados.pendente_sync !== undefined ? dados.pendente_sync : true;
    }
}
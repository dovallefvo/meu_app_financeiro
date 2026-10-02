// Padrão Observer implementado via Classe (Singleton)
class AppStore {
    constructor() {
        this.state = {
            transacoes: [],
            dominios: { moedas: [], formas_pagamento: [], macro_categorias: [] }
        };
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(l => l(this.state));
    }

    setState(newState) {
        this.state = Object.assign({}, this.state, newState);
        this.notify();
    }

    async atualizarDoBanco(db) {
        const transacoes = await db.listarTodas('transacoes');
        const dominiosDB = await db.listarTodas('dominios');
        let dominiosMap = { moedas: [], formas_pagamento: [], macro_categorias: [] };
        
        dominiosDB.forEach(d => {
            dominiosMap[d.tipo] = d.valores;
        });
        
        this.setState({ transacoes, dominios: dominiosMap });
    }
}

// Exporta a instância única (Singleton)
export const store = new AppStore();
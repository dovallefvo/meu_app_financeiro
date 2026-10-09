class AppStore {
    constructor() {
        this.state = {
            transacoes: [],
            dominios: { moedas: [], formas_pagamento: [], macro_categorias: [], categorias: [], subcategorias: [], hierarquia_completa: [] },
            filtros: { pesquisa_rapida: '', data_inicio: '2024-05-01', data_fim: null }
        };
        this.listeners = [];
    }
    subscribe(listener) { this.listeners.push(listener); }
    notify() { 
        console.log('[AppStore] 📢 A notificar', this.listeners.length, 'ouvintes sobre alteração de estado.');
        this.listeners.forEach(l => l(this.state)); 
    }
    setState(newState) {
        this.state = Object.assign({}, this.state, newState);
        this.notify();
    }
    atualizarFiltros(novosFiltros) {
        this.state.filtros = Object.assign({}, this.state.filtros, novosFiltros);
        this.notify();
    }
    async atualizarDoBanco(db) {
        try {
            console.log('[AppStore] 🔄 A ler dados do IndexedDB para atualizar o store...');
            const transacoes = await db.listarTodas('transacoes');
            const moedas = await db.listarTodas('moedas');
            const formas = await db.listarTodas('formas_pagamento');
            const categoriasDB = await db.listarTodas('categorias');
            
            const dominiosMap = {
                moedas: moedas,
                formas_pagamento: formas.map(f => f.nome).filter(Boolean),
                macro_categorias: categoriasDB.filter(c => c.tipo === 'MACROCATEGORIA'),//.map(c => c.nome).filter(Boolean),
                categorias: categoriasDB.filter(c => c.tipo === 'CATEGORIA'),//.map(c => c.nome || c.categoria_nome).filter(Boolean))],
                subcategorias: categoriasDB.filter(c => c.tipo === 'SUBCATEGORIA'),//.map(c => c.nome || c.subcategoria_nome).filter(Boolean))],
                hierarquia_completa: categoriasDB
            };
            
            console.log(`[AppStore] ✅ Estado lido: ${transacoes.length} transações, ${moedas.length} moedas, ${dominiosMap.categorias.length} categorias, ${dominiosMap.subcategorias.length} subcategorias.`);
            
            this.setState({ transacoes, dominios: dominiosMap });
        } catch (error) {
            console.error('[AppStore] ❌ Erro ao atualizar do banco:', error);
        }
    }
}
export const store = new AppStore();

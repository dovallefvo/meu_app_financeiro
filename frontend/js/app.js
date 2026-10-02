import Database from './core/Database.js';
import { store } from './store/AppStore.js';
import Transacao from './models/Transacao.js';

async function bootstrap() {
    const db = new Database();
    await db.inicializar();

    const doms = await db.listarTodas('dominios');
    if (doms.length === 0) {
        await db.salvar('dominios', { tipo: 'moedas', valores: ['BRL', 'EUR', 'USD'] });
        await db.salvar('dominios', { tipo: 'formas_pagamento', valores: ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'] });
        await db.salvar('dominios', { tipo: 'macro_categorias', valores: ['Despesas', 'Receitas'] });
    }

    await store.atualizarDoBanco(db);

    document.addEventListener('salvar-transacao-global', async (e) => {
        const novaTransacao = new Transacao(e.detail);
        await db.salvar('transacoes', novaTransacao.toJSON());
        await store.atualizarDoBanco(db);
    });

    document.addEventListener('excluir-transacao-global', async (e) => {
        await db.excluir('transacoes', e.detail);
        await store.atualizarDoBanco(db);
    });
}

bootstrap().catch(console.error);
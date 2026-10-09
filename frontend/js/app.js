import AppRoot from './components/AppRoot/AppRoot.js';
import Timeline from './components/Timeline/Timeline.js';
import TransactionForm from './components/TransactionForm/TransactionForm.js';
import SyncStatus from './components/SyncStatus/SyncStatus.js';
import Database from './core/Database.js';
import SyncEngine from './core/SyncEngine.js';
import { store } from './store/AppStore.js';

console.log('[Bootstrap] A inicializar a infraestrutura e a registar componentes...');

// Registo explícito de todos os Custom Elements de forma centralizada e segura
if (!customElements.get('app-root')) customElements.define('app-root', AppRoot);
if (!customElements.get('app-timeline')) customElements.define('app-timeline', Timeline);
if (!customElements.get('app-transaction-form')) customElements.define('app-transaction-form', TransactionForm);
if (!customElements.get('sync-status')) customElements.define('sync-status', SyncStatus);

async function iniciarApp() {
    try {
        const db = new Database();
        await db.inicializar();
        
        await store.atualizarDoBanco(db);
        
        const syncEngine = new SyncEngine(db, store);
        syncEngine.iniciar();
        
        console.log('[Bootstrap] Aplicação iniciada com sucesso.');
    } catch (erro) {
        console.error('[Bootstrap] ❌ Erro crítico ao iniciar aplicação:', erro);
    }
}

iniciarApp();

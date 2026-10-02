import BaseComponent from '../BaseComponent.js';
import Timeline from '../Timeline/Timeline.js';
import TransactionForm from '../TransactionForm/TransactionForm.js';
import { store } from '../../store/AppStore.js';
customElements.define('app-timeline', Timeline);
customElements.define('app-transaction-form', TransactionForm);
export default class AppRoot extends BaseComponent {
    constructor() { super('AppRoot'); }
    onMounted() {
        const btnAdd = this.$('#btn-add');
        const form = this.$('app-transaction-form');
        if (btnAdd && form) btnAdd.addEventListener('click', () => form.abrir());

        const renderizar = (transacoes) => {
            const tl = this.$('app-timeline');
            if (tl && tl.renderizarTransacoes) tl.renderizarTransacoes(transacoes);
        };
        store.subscribe((state) => renderizar(state.transacoes));
        if (store.state.transacoes && store.state.transacoes.length > 0) renderizar(store.state.transacoes);

        this.shadowRoot.addEventListener('editar-transacao', (e) => {
            if (form) form.abrir(e.detail);
        });

        this.shadowRoot.addEventListener('excluir-transacao', (e) => {
            if (confirm('Tem certeza que deseja excluir esta transação?')) {
                document.dispatchEvent(new CustomEvent('excluir-transacao-global', { detail: e.detail }));
            }
        });
    }
}
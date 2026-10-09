import BaseComponent from '../BaseComponent.js';

export default class TagMultiselect extends BaseComponent {
    constructor() {
        super('TagMultiselect');
        this.selecionados = [];
        this.opcoes = [];
    }

    onMounted() {
        this.selectBox = this.$('#select-box');
        this.dropdown = this.$('#dropdown-list');
        this.placeholder = this.$('#placeholder');

        this.selectBox.addEventListener('click', (e) => {
            e.stopPropagation();
            const visivel = this.dropdown.style.display === 'block';
            this.dropdown.style.display = visivel ? 'none' : 'block';
        });

        document.addEventListener('click', () => {
            if (this.dropdown) this.dropdown.style.display = 'none';
        });

        this.dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    setSelecionados(arr) { this.selecionados = arr || []; this.renderSelecao(); this.renderDropdown(); }

    setOpcoes(opcoes) {
        this.opcoes = opcoes || [];
        this.renderDropdown();
    }

    renderDropdown() {
        if (!this.dropdown) return;
        let html = '';
        this.opcoes.forEach(opt => {
            const checked = this.selecionados.includes(opt) ? 'checked' : '';
            html += `
                <div class="option-item" data-value="${opt}">
                    <input type="checkbox" value="${opt}" ${checked} style="pointer-events: none;">
                    <span>${opt}</span>
                </div>
            `;
        });
        this.dropdown.innerHTML = html;

        this.dropdown.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const val = item.getAttribute('data-value');
                this.toggleSelecao(val);
            });
        });
    }

    toggleSelecao(val) {
        if (this.selecionados.includes(val)) {
            this.selecionados = this.selecionados.filter(v => v !== val);
        } else {
            this.selecionados.push(val);
        }
        this.renderSelecao();
        this.renderDropdown();

        this.dispatchEvent(new CustomEvent('change', {
            detail: this.selecionados,
            bubbles: true,
            composed: true
        }));
    }

    renderSelecao() {
        if (!this.selectBox) return;
        this.selectBox.innerHTML = '';
        if (this.selecionados.length === 0) {
            this.selectBox.appendChild(this.placeholder);
            return;
        }
        this.selecionados.forEach(sel => {
            const chip = document.createElement('div');
            chip.className = 'tag-chip';
            chip.innerHTML = `${sel} <button type="button">×</button>`;
            chip.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSelecao(sel);
            });
            this.selectBox.appendChild(chip);
        });
    }
}
if (!customElements.get('tag-multiselect')) customElements.define('tag-multiselect', TagMultiselect);

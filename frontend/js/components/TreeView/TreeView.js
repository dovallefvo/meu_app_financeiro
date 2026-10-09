import BaseComponent from '../BaseComponent.js';

export default class TreeView extends BaseComponent {
    constructor() {
        super('TreeView');
        this.arvore = [];
        this.selecionados = new Set();
        console.log('[TreeView] 🏗️ Construtor inicializado.');
    }

    onMounted() {
        this.treeBox = this.$('#tree-box');
        this.dropdown = this.$('#tree-dropdown');
        this.placeholder = this.$('#tree-placeholder');

        this.treeBox.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = this.dropdown.style.display === 'block';
            this.dropdown.style.display = isVisible ? 'none' : 'block';
            console.log(`[TreeView] 🔘 Dropdown alternado: ${!isVisible ? 'Aberto' : 'Fechado'}`);
        });

        document.addEventListener('click', () => {
            if (this.dropdown && this.dropdown.style.display === 'block') {
                this.dropdown.style.display = 'none';
            }
        });

        this.dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    setData(nodes) {
        console.log('[TreeView] 📥 Recebeu novos dados para renderização:', nodes);
        this.arvore = nodes || [];
        this.renderTree();
    }

    setSelecionados(arr) {
        console.log('[TreeView] 🔄 A atualizar nós selecionados (Rascunho):', arr);
        this.selecionados = new Set(arr || []);
        this.atualizarLabelBox();
        this.renderTree();
    }

    renderTree() {
        if (!this.dropdown) {
            console.warn('[TreeView] ⚠️ Tentativa de renderização falhou: Dropdown container inexistente.');
            return;
        }

        let html = '<div style="font-size: 0.9rem; user-select: none; padding: 4px;">';
        this.arvore.forEach(node => html += this.gerarHtmlNo(node, 0));
        html += '</div>';

        this.dropdown.innerHTML = html;

        // Eventos Expandir / Retrair
        this.dropdown.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const group = e.target.closest('.tree-group');
                const children = group.querySelector(':scope > .tree-children');
                if (children) {
                    const isHidden = children.style.display === 'none';
                    children.style.display = isHidden ? 'block' : 'none';
                    e.target.textContent = isHidden ? '[-] ' : '[+] ';
                }
            });
        });

        // Eventos Seleção em Cascata (Diretamente pelo Nome do Nó)
        this.dropdown.querySelectorAll('.chk-node').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const group = e.target.closest('.tree-group');

                console.group(`[TreeView] 🖱️ Checkbox alterado: ${isChecked ? 'Marcado' : 'Desmarcado'}`);

                // Propaga para todos os filhos dentro do grupo clicado
                group.querySelectorAll('.chk-node').forEach(childChk => {
                    childChk.checked = isChecked;
                    const nome = childChk.getAttribute('data-nome');
                    
                    if (isChecked) {
                        this.selecionados.add(nome);
                        console.log(`[TreeView] ➕ Adicionado: ${nome}`);
                    } else {
                        this.selecionados.delete(nome);
                        console.log(`[TreeView] ➖ Removido: ${nome}`);
                    }
                });

                this.atualizarLabelBox();
                
                const selecionadosArr = Array.from(this.selecionados);
                console.log('[TreeView] 📤 Emitindo evento de change com:', selecionadosArr);
                console.groupEnd();

                this.dispatchEvent(new CustomEvent('change', { detail: selecionadosArr, bubbles: true, composed: true }));
            });
        });
    }

    gerarHtmlNo(node, level) {
        const hasChildren = node.filhos && node.filhos.length > 0;
        const icon = level === 0 ? '📁' : (level === 1 ? '📂' : '📄');
        const weight = level === 0 ? '600; color: #1a73e8' : (level === 1 ? '500; color: #202124' : '400; color: #5f6368');
        
        // Match exato pelo nome do nó
        const checked = this.selecionados.has(node.nome) ? 'checked' : '';
        const margin = level > 0 ? 16 : 0;

        let html = `<div class="tree-group" style="margin-left: ${margin}px; margin-top: 4px;">`;
        html += `<div style="display: flex; align-items: center; gap: 6px; font-weight: ${weight}; padding: 4px 0;">`;

        if (hasChildren) {
            html += `<span class="btn-toggle" style="font-family: monospace; font-weight: bold; width: 14px; cursor: pointer;">[-] </span>`;
        } else {
            html += `<span style="width: 14px;"></span>`;
        }

        html += `<label style="cursor: pointer; display: flex; align-items: center; gap: 4px; flex: 1;">
                    <input type="checkbox" class="chk-node" data-nome="${node.nome}" ${checked}> ${icon} ${node.nome}
                 </label></div>`;

        if (hasChildren) {
            html += `<div class="tree-children" style="border-left: 1px dashed #dadce0; padding-left: 8px;">`;
            node.filhos.forEach(filho => html += this.gerarHtmlNo(filho, level + 1));
            html += `</div>`;
        }
        html += `</div>`;
        return html;
    }

    atualizarLabelBox() {
        if (!this.treeBox) return;
        if (this.selecionados.size === 0) {
            this.treeBox.innerHTML = '';
            this.treeBox.appendChild(this.placeholder);
        } else {
            this.treeBox.innerHTML = `<span style="font-size: 0.9rem; color: #1a73e8; font-weight: 500;">${this.selecionados.size} selecionado(s)</span>`;
        }
    }
}
if (!customElements.get('tree-view')) customElements.define('tree-view', TreeView);

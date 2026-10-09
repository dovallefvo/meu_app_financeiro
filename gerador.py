import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

# ==========================================
# 1. CATEGORY UTILS (Arquitetura relacional com Fallback e sem Mnemónicos)
# ==========================================
category_utils_code = """export class CategoryUtils {
    static buildTree(dominios) {
        console.group('[CategoryUtils] 🌳 Iniciando construção da árvore hierárquica');
        
        if (!dominios || typeof dominios !== 'object') {
            console.warn('[CategoryUtils] ⚠️ Domínios inválidos ou ausentes.');
            console.groupEnd();
            return [];
        }

        const { macro_categorias = [], categorias = [], subcategorias = [] } = dominios;
        
        console.log(`[CategoryUtils] 📦 Dados em cache: ${macro_categorias.length} Macros, ${categorias.length} Categorias, ${subcategorias.length} Subcategorias.`);

        const macroMap = new Map();
        const catMap = new Map();
        const arvore = [];

        // 1. Processar Macrocategorias (Nós Raiz)
        macro_categorias.forEach(macro => {
            const id = macro._id || macro.id;
            const nome = macro.nome || macro.macrocategoria_nome;
            if (!nome) return;

            const node = { id, nome, tipo: 'macro', filhos: [] };
            
            // Registo seguro por ID e por Nome
            if (id) macroMap.set(id, node);
            macroMap.set(nome, node); 
            
            // Inserção na Árvore sem duplicados na raiz
            if (!arvore.find(n => n.nome === nome)) {
                arvore.push(node);
            }
        });

        // 2. Processar Categorias (Nós Intermédios)
        categorias.forEach(cat => {
            const id = cat._id || cat.id;
            const nome = cat.nome || cat.categoria_nome;
            if (!nome) return;

            const node = { id, nome, tipo: 'cat', filhos: [] };
            if (id) catMap.set(id, node);
            catMap.set(nome, node);

            const parentId = cat.parent_id || cat.macrocategoria_id;
            const parentNome = cat.macrocategoria_nome || cat.macro_categoria;

            let paiEncontrado = null;
            if (parentId && macroMap.has(parentId)) paiEncontrado = macroMap.get(parentId);
            else if (parentNome && macroMap.has(parentNome)) paiEncontrado = macroMap.get(parentNome);
            
            if (paiEncontrado) {
                paiEncontrado.filhos.push(node);
            } else {
                console.warn(`[CategoryUtils] ⚠️ Categoria '${nome}' sem macrocategoria pai associada.`);
                if (arvore.length > 0) arvore[0].filhos.push(node);
            }
        });

        // 3. Processar Subcategorias (Nós Folha)
        subcategorias.forEach(sub => {
            const id = sub._id || sub.id;
            const nome = sub.nome || sub.subcategoria_nome;
            if (!nome) return;

            const node = { id, nome, tipo: 'sub', filhos: [] };

            const parentId = sub.parent_id || sub.categoria_id;
            const parentNome = sub.categoria_nome || sub.categoria;

            let paiEncontrado = null;
            if (parentId && catMap.has(parentId)) paiEncontrado = catMap.get(parentId);
            else if (parentNome && catMap.has(parentNome)) paiEncontrado = catMap.get(parentNome);

            if (paiEncontrado) {
                paiEncontrado.filhos.push(node);
            } else {
                console.warn(`[CategoryUtils] ⚠️ Subcategoria '${nome}' sem categoria pai associada.`);
            }
        });

        console.log('[CategoryUtils] ✅ Árvore gerada com sucesso:', arvore);
        console.groupEnd();
        
        return arvore;
    }
}
"""
write_file("frontend/js/utils/CategoryUtils.js", category_utils_code)


# ==========================================
# 2. TREE VIEW (Componente Visual Agnóstico, Focado em Nomes e Eventos em Cascata)
# ==========================================
treeview_code = """import BaseComponent from '../BaseComponent.js';

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
"""
write_file("frontend/js/components/TreeView/TreeView.js", treeview_code)


# ==========================================
# 3. TIMELINE.JS (Filtragem Limpa sem Mnemónicos)
# ==========================================
with open("frontend/js/components/Timeline/Timeline.js", "r", encoding="utf-8") as f:
    timeline_code = f.read()

# Substituir bloco de filtro se existir (caso tenha o construto anterior com mnemónicos ou antigo)
start_idx = timeline_code.find("if (filtros.categorias_ids && filtros.categorias_ids.length > 0)")
if start_idx != -1:
    end_idx = timeline_code.find("return true;", start_idx)
    novo_filtro = """// Filtro Hierárquico Limpo - Procura a correspondência de nome diretamente na transação
            if (filtros.categorias_ids && filtros.categorias_ids.length > 0) {
                const macro = t.categoria?.macrocategoria_nome || t.macrocategoria_nome || t.macro_categoria || t.tipo || t.natureza || '';
                const cat = t.categoria?.categoria_nome || t.categoria_nome || '';
                const sub = t.categoria?.subcategoria_nome || t.subcategoria_nome || '';

                const matchMacro = filtros.categorias_ids.includes(macro);
                const matchCat = filtros.categorias_ids.includes(cat);
                const matchSub = filtros.categorias_ids.includes(sub);

                if (!matchMacro && !matchCat && !matchSub) {
                    return false;
                }
            }

            """
    timeline_code = timeline_code[:start_idx] + novo_filtro + timeline_code[end_idx:]
    write_file("frontend/js/components/Timeline/Timeline.js", timeline_code)

print("✅ Todos os scripts (CategoryUtils, TreeView e Timeline) foram reescritos e guardados de forma segura e estruturada!")
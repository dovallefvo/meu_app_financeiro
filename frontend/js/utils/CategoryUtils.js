export class CategoryUtils {
    static buildTree(dominios) {
        console.group('[CategoryUtils] 🌳 Iniciando construção da árvore hierárquica por ID (_id / parent_id)');
        
        if (!dominios || typeof dominios !== 'object') {
            console.warn('[CategoryUtils] ⚠️ Domínios inválidos ou ausentes.');
            console.groupEnd();
            return [];
        }

        const { macro_categorias = [], categorias = [], subcategorias = [] } = dominios;
        
        console.log(`[CategoryUtils] 📦 Domínios recebidos (Objetos Completos): ${macro_categorias.length} Macros, ${categorias.length} Categorias, ${subcategorias.length} Subcategorias.`);

        const macroMap = new Map();
        const catMap = new Map();
        const arvore = [];

        try {
            // 1. Processar Macrocategorias (Raiz)
            macro_categorias.forEach(macro => {
                try {
                    const id = macro._id || macro.id;
                    const nome = macro.nome || macro.macrocategoria_nome;
                    if (!id || !nome) return;

                    const node = { 
                        id: id, 
                        nome: nome, 
                        tipo: macro.tipo || 'MACROCATEGORIA', 
                        filhos: [] 
                    };
                    
                    macroMap.set(id, node);
                    if (!arvore.find(n => n.nome === nome)) {
                        arvore.push(node);
                    }
                } catch (errItem) {
                    console.error('[CategoryUtils] ❌ Erro ao processar macrocategoria:', errItem);
                }
            });
        } catch (errMacro) {
            console.error('[CategoryUtils] ❌ Erro crítico no loop de macrocategorias:', errMacro);
        }

        try {
            // 2. Processar Categorias (Filhas de Macrocategorias)
            categorias.forEach(cat => {
                try {
                    const id = cat._id || cat.id;
                    const nome = cat.nome || cat.categoria_nome;
                    const parentId = cat.parent_id || cat.macrocategoria_id;
                    
                    if (!id || !nome) return;

                    const node = { 
                        id: id, 
                        nome: nome, 
                        tipo: cat.tipo || 'CATEGORIA', 
                        filhos: [] 
                    };
                    catMap.set(id, node);

                    if (parentId && macroMap.has(parentId)) {
                        macroMap.get(parentId).filhos.push(node);
                    } else if (arvore.length > 0) {
                        arvore[0].filhos.push(node);
                    }
                } catch (errItem) {
                    console.error('[CategoryUtils] ❌ Erro ao processar categoria:', errItem);
                }
            });
        } catch (errCat) {
            console.error('[CategoryUtils] ❌ Erro crítico no loop de categorias:', errCat);
        }

        try {
            // 3. Processar Subcategorias (Filhas de Categorias)
            subcategorias.forEach(sub => {
                try {
                    const id = sub._id || sub.id;
                    const nome = sub.nome || sub.subcategoria_nome;
                    const parentId = sub.parent_id || sub.categoria_id;

                    if (!id || !nome) return;

                    const node = { 
                        id: id, 
                        nome: nome, 
                        tipo: sub.tipo || 'SUBCATEGORIA', 
                        filhos: [] 
                    };

                    if (parentId && catMap.has(parentId)) {
                        catMap.get(parentId).filhos.push(node);
                    }
                } catch (errItem) {
                    console.error('[CategoryUtils] ❌ Erro ao processar subcategoria:', errItem);
                }
            });
        } catch (errSub) {
            console.error('[CategoryUtils] ❌ Erro crítico no loop de subcategorias:', errSub);
        }

        console.log('[CategoryUtils] ✅ Árvore hierárquica construída com sucesso:', arvore);
        console.groupEnd();
        
        return arvore;
    }
}
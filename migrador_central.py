import asyncio
import pandas as pd
import csv
import os
from datetime import datetime
from dotenv import load_dotenv
from pymongo import ReturnDocument # <--- ADICIONE ESTE IMPORT NO TOPO

from src.api.main import processador, repo
from src.domain.entities import (
    Categoria, FormaPagamento, Moeda, 
    PRIORIDADE_ALTA, PRIORIDADE_MEDIA, PRIORIDADE_BAIXA
)

load_dotenv()

async def migrar_dominio(caminho_excel: str):
    """Lê o excel dominio.xlsx e faz UPSERT (Atualiza ou Insere) no MongoDB."""
    print("Iniciando carga de Domínio (Modo Upsert)...")
    xls = pd.ExcelFile(caminho_excel)
    
    # 1. Migrar Categorias
    df_cat = pd.read_excel(xls, sheet_name='Categorias')
    mapa_macro = {}
    mapa_cat = {}

    print(f"---- Quantitade de linhas a serem carregadas {len(df_cat)}")
    for _, row in df_cat.iterrows():
        sinal = int(row['Cálculo'])
        macro = str(row['macrocategoria']).strip()
        cat = str(row['categoria']).strip()
        sub = str(row['subcategoria']).strip()
        
        chaves_raw = row['chavepesquisa']
        chaves = [c.strip() for c in str(chaves_raw).split('|')] if pd.notna(chaves_raw) else []
        
        ativo = True
        prioridade = PRIORIDADE_ALTA

        match cat:
            case 'Viagem':
                prioridade = PRIORIDADE_MEDIA
            case 'Outros gastos':
                prioridade = PRIORIDADE_BAIXA

        # UPSERT Macrocategoria
        if macro not in mapa_macro:
            doc = Categoria(nome=macro, tipo="MACROCATEGORIA", sinal_operacao=sinal, ativo=True)
            payload = doc.model_dump(by_alias=True, exclude={"id"})
            
            res = await repo.db.categorias.find_one_and_update(
                {"nome": macro, "tipo": "MACROCATEGORIA"}, # Chave de busca
                {"$set": payload},                         # O que atualizar
                upsert=True,                               # Se não achar, insere
                return_document=ReturnDocument.AFTER       # Retorna o documento pós-operação
            )
            mapa_macro[macro] = str(res["_id"])
            
        # UPSERT Categoria
        chave_cat = f"{macro}_{cat}"
        if chave_cat not in mapa_cat:
            doc = Categoria(nome=cat, tipo="CATEGORIA", parent_id=mapa_macro[macro], sinal_operacao=sinal, ativo=True, prioridade=prioridade)
            payload = doc.model_dump(by_alias=True, exclude={"id"})
            
            res = await repo.db.categorias.find_one_and_update(
                {"nome": cat, "tipo": "CATEGORIA", "parent_id": mapa_macro[macro]},
                {"$set": payload},
                upsert=True,
                return_document=ReturnDocument.AFTER
            )
            mapa_cat[chave_cat] = str(res["_id"])

        # UPSERT Subcategoria
        doc_sub = Categoria(
            nome=sub, tipo="SUBCATEGORIA", parent_id=mapa_cat[chave_cat], 
            chaves_pesquisa=chaves, sinal_operacao=sinal, ativo=ativo, prioridade=prioridade
        )
        payload = doc_sub.model_dump(by_alias=True, exclude={"id"})
        
        await repo.db.categorias.update_one(
            {"nome": sub, "tipo": "SUBCATEGORIA", "parent_id": mapa_cat[chave_cat]},
            {"$set": payload},
            upsert=True
        )
        
    print("✅ Categorias sincronizadas (Upsert).")

    # 2. Migrar Formas de Pagamento
    df_forma = pd.read_excel(xls, sheet_name='FormaPagamento')
    for _, row in df_forma.iterrows():
        nome_forma = str(row['Formas de pagamento']).strip()
        doc = FormaPagamento(nome=nome_forma)
        payload = doc.model_dump(by_alias=True, exclude={"id"})
        
        await repo.db.formas_pagamento.update_one(
            {"nome": nome_forma},
            {"$set": payload},
            upsert=True
        )
    print("✅ Formas de Pagamento sincronizadas (Upsert).")
        
    # 3. Migrar Moedas
    df_moeda = pd.read_excel(xls, sheet_name='Moeda')
    for _, row in df_moeda.iterrows():
        sigla = str(row['Sigla']).strip()
        is_padrao = str(row['MoedaPadrao']).strip().lower() == 'sim'
        doc = Moeda(sigla=sigla, moeda_padrao=is_padrao)
        payload = doc.model_dump(by_alias=True, exclude={"id"})
        
        await repo.db.moedas.update_one(
            {"sigla": sigla},
            {"$set": payload},
            upsert=True
        )
    print("✅ Moedas sincronizadas (Upsert).")


async def migrar_transacoes(caminho_csv: str, exportar_csv_local: bool = True, salvar_mongodb: bool = False):
    """
    Se exportar_csv_local=True -> Gera um 'resultado_validacao.csv' comparativo.
    Se salvar_mongodb=True -> Converte câmbio e salva no Mongo.
    """
    print(f"\\nIniciando avaliação de transações (Dry Run: {not salvar_mongodb})")
    await processador.carregar_cache_categorias()
    
    resultados_validacao = []
    
    with open(caminho_csv, mode='r', encoding='utf-8-sig') as arquivo:
        leitor = csv.DictReader(arquivo, delimiter=';')
        # leitor.fieldnames = [str.replace(name, '\ufeff', '') for name in leitor.fieldnames]  # Remove BOM se existir
        for linha in leitor:
            try:
                # Ajuste estes nomes para bater exatamente com os cabeçalhos do seu CSV
                dados_brutos = {
                    "usuario_id": "felipe_do_valle", 
                    "data_transacao": datetime.strptime(linha['Data'].strip(), '%Y-%m-%d'),
                    "descricao": linha['Descrição'].strip(),
                    "moeda_original": linha['Moeda'].strip(),
                    "valor_bruto": float(linha['Valor'].replace(',', '.').strip()), 
                    "forma_pagamento": linha['Forma de pagamento'].strip()
                }
                
                # O dry_run ignora chamadas a API e banco de dados
                transacao_avaliada = await processador.processar_e_salvar(dados_brutos, dry_run=not salvar_mongodb)
                
                if exportar_csv_local:
                    resultados_validacao.append({
                        "Data": linha['Data'],                        
                        "Moeda": linha['Moeda'],
                        "Valor": linha['Valor'],
                        "Descrição": linha['Descrição'],
                        "Forma de pagamento": linha['Forma de pagamento'],
                        "MacroCategoria": linha.get('MacroCategoria', ''),
                        "Categoria": linha.get('Categoria', ''),
                        "Subcategoria": linha.get('SubCategoria', ''),
                        "----": "||",
                        "Categoria_Adivinhada_Regex": transacao_avaliada["categoria"]["categoria_nome"],
                        "Subcategoria_Adivinhada_Regex": transacao_avaliada["categoria"]["subcategoria_nome"],
                        "EstaoIguais": linha.get('Categoria', '')==transacao_avaliada["categoria"]["categoria_nome"] and linha.get('SubCategoria', '')==transacao_avaliada["categoria"]["subcategoria_nome"]

                    })
                    
            except Exception as e:
                print(f"Erro na linha referente à descrição: {linha.get('Descrição', 'Desconhecida')}: {e}")

    if exportar_csv_local and resultados_validacao:
        df_resultado = pd.DataFrame(resultados_validacao)
        df_resultado.to_csv("resultado_validacao.csv", index=False, encoding='utf-8-sig', sep=';')
        print("✅ Arquivo 'resultado_validacao.csv' gerado na raiz do projeto para sua conferência.")
        
    if salvar_mongodb:
        print("✅ Transações migradas com sucesso para o banco de dados.")

if __name__ == "__main__":
    # ==========================================
    # ÁREA DE CONTROLE DE EXECUÇÃO
    # Descomente o que deseja rodar
    # ==========================================
    
    # PASSO 1: Rodar para preparar o banco
    # asyncio.run(migrar_dominio('dominio.xlsx'))
    
    # PASSO 2: Rodar para gerar o arquivo de validação local do Regex
    # asyncio.run(migrar_transacoes('transacoes_legadas.csv', exportar_csv_local=True, salvar_mongodb=False))
    
    # PASSO 3: Rodar definitivamente (cuidado, se rodar duas vezes vai duplicar no banco)
    asyncio.run(migrar_transacoes('transacoes_legadas.csv', exportar_csv_local=False, salvar_mongodb=True))
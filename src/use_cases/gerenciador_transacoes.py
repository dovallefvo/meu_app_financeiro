import re
from typing import Dict, List, Optional
from src.domain.entities import Transacao, TaxaCambioDiaria, CategoriaResumo, PRIORIDADE_ALTA
from src.adapters.repositories.mongo_repository import TransacaoRepository
from src.adapters.external_apis.cambio_api import ProvedorCambioFrankfurter
from datetime import datetime, date

class ProcessadorTransacao:
    def __init__(
        self, 
        repo: TransacaoRepository, 
        api_cambio: ProvedorCambioFrankfurter,
        moedas_alvo: List[str] = ["BRL", "CAD", "EUR", "USD"]
    ):
        self.repo = repo
        self.api_cambio = api_cambio
        self.moedas_alvo = moedas_alvo
        
        # Estruturas em memória para busca rápida
        self.categorias_ativas = []
        self.subcategorias_ativas = []
        self.mapa_pais = {} # Para descobrir facilmente quem é o Pai/Avô de uma subcategoria

    async def carregar_cache_categorias(self):
        """Prepara o cache separando em níveis hierárquicos e apenas os ativos."""
        todas = await self.repo.obter_todas_categorias()
        
        for cat in todas:
            self.mapa_pais[str(cat["_id"])] = cat
            
            if cat.get("ativo", True):
                if cat.get("tipo") == "CATEGORIA":
                    self.categorias_ativas.append(cat)
                elif cat.get("tipo") == "SUBCATEGORIA":
                    self.subcategorias_ativas.append(cat)

    def _descobrir_categoria_por_regex(self, descricao: str) -> Dict:
        palavras = descricao.strip().lower().split()
        if not palavras or not self.subcategorias_ativas:
            return self._resultado_padrao()

        matches_encontrados = []

        # Loop principal por PALAVRAS
        for index, palavra in enumerate(palavras):
            # 1. Verifica se a palavra coincide com alguma categoria/pai
            categoria_pai = self._buscar_categoria_por_nome(palavra)
            
            if categoria_pai:
                # Encontrou o Pai (Categoria). Filtra a lista para buscar apenas as filhas dela
                pai_id = str(categoria_pai.get("_id"))
                subcategorias_escopo = [
                    sub for sub in self.subcategorias_ativas 
                    if str(sub.get("parent_id")) == pai_id
                ]
                palavras_restantes = palavras[index + 1:]
                
                # Coleta todos os matches possíveis dentro das filhas
                matches_escopo = self._buscar_em_subcategorias(palavras_restantes, subcategorias_escopo)
            else: # senão encontrou na categoria pai
                # tenta fazer o match já direto com a primeira palavra
                matches_escopo = self._buscar_em_subcategorias([palavra])

            if matches_escopo:
                    matches_encontrados.extend(matches_escopo)
                    break # Se achou no escopo do pai, encerra a busca hierárquica

        # 2. Se não achou categoria pai, ou se o escopo restrito não retornou nada,
        # busca no escopo geral (todas as subcategorias)    
        if not matches_encontrados:
            matches_globais = self._buscar_em_subcategorias(palavras) # Passa None implicitamente
            if matches_globais:
                matches_encontrados.extend(matches_globais)

        # Regra de Desempate ÚNICA e Retorno
        if matches_encontrados:
            # Encontra o match com o menor valor de prioridade
            vencedor = min(matches_encontrados, key=lambda x: x.get("prioridade", PRIORIDADE_ALTA))
            return self._montar_resultado(vencedor)

        return self._resultado_padrao()

    def _buscar_categoria_por_nome(self, nome_palavra: str) -> Optional[Dict]:
        """Busca se o termo corresponde ao nome de uma categoria pai."""
        for pai_categoria in self.categorias_ativas:
            if pai_categoria.get("nome", "").lower() == nome_palavra:
                return pai_categoria
        return None

    def _buscar_em_subcategorias(self, palavras: List[str], escopo_subcategorias: Optional[List[Dict]] = None) -> List[Dict]:
        """
        Varre o escopo fornecido (ou o padrão geral) e RETORNA TODOS OS MATCHES
        encontrados por Nome ou por Chaves de Pesquisa.
        """
        if not palavras:
            return []

        if escopo_subcategorias is None:
            escopo_subcategorias = self.subcategorias_ativas

        matches_locais = []

        for palavra in palavras:
            for sub in escopo_subcategorias:
                chaves = sub.get('chaves_pesquisa', [])
                # quebra o nome da categoria caso contenha espaço e junta com as chaves através de pesquisa OU |
                textual_pesquisa = '|'.join(str(sub['nome']).split() + chaves)
                
                # Regex amplo restaurado, sem delimitadores forçados
                if re.search(rf'{textual_pesquisa.lower()}', palavra):
                    matches_locais.append(sub)
        
        return matches_locais # Apenas coleta, não decide quem ganha

    def _resultado_padrao(self) -> Dict:
        return {
            "macrocategoria_nome": "Despesa",
            "categoria_nome": "Outros",
            "subcategoria_id": "0",
            "subcategoria_nome": "Não Categorizado",
            "sinal_operacao": -1
        }
        
    def _montar_resultado(self, vencedor: Dict) -> Dict:
        pai = self.mapa_pais.get(str(vencedor.get("parent_id")), {})
        avo = self.mapa_pais.get(str(pai.get("parent_id")), {})
        return {
            "subcategoria_id": str(vencedor["_id"]),
            "subcategoria_nome": vencedor["nome"],
            "categoria_nome": pai.get("nome", "Não Categorizado"),
            "macrocategoria_nome": avo.get("nome", "Despesa"),
            "sinal_operacao": vencedor.get("sinal_operacao", -1)
        }
    
    async def processar_e_salvar(self, dados_brutos: dict, dry_run: bool = False) -> Dict:
        cat_info = self._descobrir_categoria_por_regex(dados_brutos["descricao"])
        valor_calculado = dados_brutos["valor_bruto"] * cat_info["sinal_operacao"]
        
        data_obj = dados_brutos["data_transacao"]
        
        # Data original em string usada como Chave do Cache e gravação no banco
        data_str_original = data_obj.strftime("%Y-%m-%d") if hasattr(data_obj, 'strftime') else str(data_obj)[:10]
        moeda_original = dados_brutos["moeda_original"]
        
        taxas = {}
        if not dry_run:
            # 1. Tenta buscar no cache pela data ORIGINAL da transação
            taxa_diaria = await self.repo.obter_taxa_cambio_cache(data_str_original, moeda_original)
            
            if not taxa_diaria:
                # 2. Avalia a regra temporal de câmbio (Passado vs Futuro)
                data_api = self._determinar_data_busca_cambio(data_obj)
                
                # 3. Faz a requisição limpa, sem depender de erros 404
                taxas_api = await self.api_cambio.obter_taxas_historicas(data_api, moeda_original, self.moedas_alvo)
                
                # 4. Salva no cache amarrado à data ORIGINAL para otimizar futuras parcelas
                taxa_diaria = TaxaCambioDiaria(data_cotacao=data_str_original, moeda_base=moeda_original, taxas=taxas_api)
                await self.repo.salvar_taxa_cambio_cache(taxa_diaria)
            
            taxas = taxa_diaria.taxas

        categoria_resumo = CategoriaResumo(
            macrocategoria_nome=cat_info["macrocategoria_nome"],
            categoria_nome=cat_info["categoria_nome"],
            subcategoria_id=cat_info["subcategoria_id"],
            subcategoria_nome=cat_info["subcategoria_nome"]
        )
        
        transacao = Transacao(
            **dados_brutos,
            valor_calculado=valor_calculado,
            categoria=categoria_resumo
        )
        
        if not dry_run:
            transacao.aplicar_conversao(taxas)
            await self.repo.salvar_transacao(transacao)
            
        return transacao.model_dump()
    
    def _determinar_data_busca_cambio(self, data_transacao: datetime) -> str:
        """
        Avalia se a data da transação é futura.
        Retorna 'latest' se for futuro, ou a data formatada (YYYY-MM-DD) se for passado/hoje.
        """
        # Extrai apenas a parte da data para a comparação
        data_date = data_transacao.date() if isinstance(data_transacao, datetime) else data_transacao
        hoje = datetime.utcnow().date()
        
        # Se for no futuro (ou seja, uma parcela a vencer), usamos a taxa mais recente disponível
        return "latest" if data_date > hoje else data_date.strftime("%Y-%m-%d")
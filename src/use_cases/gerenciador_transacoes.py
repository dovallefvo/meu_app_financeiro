import re
from typing import Dict, List
from src.domain.entities import Transacao, TaxaCambioDiaria
from src.adapters.repositories.mongo_repository import MongoTransacaoRepository
from src.adapters.external_apis.cambio_api import ProvedorCambioFrankfurter

class ProcessadorDeTransacao:
    def __init__(
        self, 
        repo: MongoTransacaoRepository, 
        api_cambio: ProvedorCambioFrankfurter,
        moedas_alvo: List[str] = ["BRL", "CAD", "EUR", "USD"]
    ):
        self.repo = repo
        self.api_cambio = api_cambio
        self.moedas_alvo = moedas_alvo
        self.cache_categorias = [] 

    async def carregar_cache_categorias(self):
        self.cache_categorias = await self.repo.obter_todas_categorias()

    def _descobrir_categoria_por_regex(self, descricao: str) -> Dict:
        resultado = {
            "macrocategoria_nome": "Despesa",
            "categoria_nome": "Outros",
            "subcategoria_id": "0",
            "subcategoria_nome": "Não Categorizado",
            "sinal_operacao": -1
        }
        
        palavras = descricao.lower().split()
        for cat in self.cache_categorias:
            if cat.get("tipo") == "SUBCATEGORIA":
                chaves = cat.get("chaves_pesquisa", [])
                for palavra in palavras:
                    for chave in chaves:
                        if re.search(rf'\b{chave.lower()}\b', palavra):
                            resultado["subcategoria_id"] = str(cat["_id"])
                            resultado["subcategoria_nome"] = cat["nome"]
                            resultado["sinal_operacao"] = cat.get("sinal_operacao", -1)
                            resultado["categoria_nome"] = "Categoria Pai" 
                            resultado["macrocategoria_nome"] = "Receita" if resultado["sinal_operacao"] == 1 else "Despesa"
                            return resultado
        return resultado

    async def processar_e_salvar(self, dados_brutos: dict) -> str:
        cat_info = self._descobrir_categoria_por_regex(dados_brutos["descricao"])
        valor_calculado = dados_brutos["valor_bruto"] * cat_info["sinal_operacao"]
        
        data_obj = dados_brutos["data_transacao"]
        data_str = data_obj.strftime("%Y-%m-%d") if hasattr(data_obj, 'strftime') else data_obj[:10]
        moeda_original = dados_brutos["moeda_original"]
        
        taxa_diaria = await self.repo.obter_taxa_cambio_cache(data_str, moeda_original)
        
        if not taxa_diaria:
            taxas = await self.api_cambio.obter_taxas_historicas(
                data=data_str, 
                moeda_base=moeda_original, 
                moedas_destino=self.moedas_alvo
            )
            taxa_diaria = TaxaCambioDiaria(
                data_cotacao=data_str,
                moeda_base=moeda_original,
                taxas=taxas
            )
            await self.repo.salvar_taxa_cambio_cache(taxa_diaria)
            
        transacao = Transacao(
            **dados_brutos,
            valor_calculado=valor_calculado,
            macrocategoria_nome=cat_info["macrocategoria_nome"],
            categoria_nome=cat_info["categoria_nome"],
            subcategoria_id=cat_info["subcategoria_id"],
            subcategoria_nome=cat_info["subcategoria_nome"]
        )
        
        transacao.aplicar_conversao(taxa_diaria.taxas)
        return await self.repo.salvar_transacao(transacao)
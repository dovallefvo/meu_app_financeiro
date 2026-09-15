from motor.motor_asyncio import AsyncIOMotorClient
from src.domain.entities import Transacao, TaxaCambioDiaria

class MongoTransacaoRepository:
    def __init__(self, string_conexao: str, nome_banco: str):
        self.client = AsyncIOMotorClient(string_conexao)
        self.db = self.client[nome_banco]
        
    async def salvar_transacao(self, transacao: Transacao) -> str:
        transacao_dict = transacao.model_dump(by_alias=True, exclude={"id"})
        resultado = await self.db.transacoes.insert_one(transacao_dict)
        return str(resultado.inserted_id)

    async def obter_taxa_cambio_cache(self, data: str, moeda_base: str) -> TaxaCambioDiaria:
        doc = await self.db.historico_cambio.find_one({
            "data_cotacao": data,
            "moeda_base": moeda_base
        })
        if doc:
            return TaxaCambioDiaria(**doc)
        return None

    async def salvar_taxa_cambio_cache(self, taxa: TaxaCambioDiaria):
        taxa_dict = taxa.model_dump(by_alias=True, exclude={"id"})
        await self.db.historico_cambio.insert_one(taxa_dict)
        
    async def obter_todas_categorias(self) -> list:
        cursor = self.db.categorias.find({})
        return await cursor.to_list(length=None)
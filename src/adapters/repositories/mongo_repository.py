from motor.motor_asyncio import AsyncIOMotorDatabase # Mudou de Client para Database
from typing import TypeVar, Generic, Type, List, Optional
from pydantic import BaseModel
from bson import ObjectId
from src.domain.entities import Transacao, TaxaCambioDiaria

T = TypeVar('T', bound=BaseModel)

class MongoBaseRepository(Generic[T]):
    def __init__(self, db: AsyncIOMotorDatabase, nome_colecao: str, classe_entidade: Type[T]):
        self.db = db # A conexão Singleton chega pronta aqui
        self.colecao = self.db[nome_colecao]
        self.classe_entidade = classe_entidade

    async def _converter_id(self, documento: dict) -> dict:
        """Utilitário interno: Converte o _id nativo (ObjectId) para string (para o Pydantic)."""
        if documento and "_id" in documento:
            documento["_id"] = str(documento["_id"])
        return documento

    async def obter_por_id(self, id_str: str) -> Optional[T]:
        """Busca um registro específico e retorna a Entidade instanciada."""
        doc = await self.colecao.find_one({"_id": ObjectId(id_str)})
        if doc:
            return self.classe_entidade(**(await self._converter_id(doc)))
        return None

    async def listar(self, filtro: dict = None, apenas_ativos: bool = True) -> List[T]:
        """
        Lista registros. Por padrão, oculta os registros excluídos logicamente (ativo=False).
        """
        query = filtro or {}
        if apenas_ativos:
            query["ativo"] = True
            
        cursor = self.colecao.find(query)
        resultados = []
        async for doc in cursor:
            resultados.append(self.classe_entidade(**(await self._converter_id(doc))))
        return resultados

    async def inserir(self, entidade: T) -> str:
        """Salva uma nova entidade e retorna o ID."""
        doc_dict = entidade.model_dump(by_alias=True, exclude={"id"})
        resultado = await self.colecao.insert_one(doc_dict)
        return str(resultado.inserted_id)

    async def atualizar(self, id_str: str, dados_atualizacao: dict) -> bool:
        """Atualiza parcialmente um registro."""
        resultado = await self.colecao.update_one(
            {"_id": ObjectId(id_str)},
            {"$set": dados_atualizacao}
        )
        return resultado.modified_count > 0

    async def excluir(self, id_str: str) -> bool:
        """SOFT DELETE: Não apaga do banco, apenas marca como inativo."""
        return await self.atualizar(id_str, {"ativo": False})

    async def destruir_fisicamente(self, id_str: str) -> bool:
        """HARD DELETE: Remove o registro permanentemente do banco."""
        resultado = await self.colecao.delete_one({"_id": ObjectId(id_str)})
        return resultado.deleted_count > 0

# ==========================================
# REPOSITÓRIO ESPECÍFICO DE TRANSAÇÃO
# ==========================================
class TransacaoRepository(MongoBaseRepository[Transacao]):
    def __init__(self, db: AsyncIOMotorDatabase):
        # A classe filha só repassa o banco recebido para a base
        super().__init__(
            db=db, 
            nome_colecao="transacoes", 
            classe_entidade=Transacao
        )
    
    # ---------------------------------------------------------
    # Métodos específicos que fogem do CRUD genérico
    # ---------------------------------------------------------
    async def obter_taxa_cambio_cache(self, data: str, moeda_base: str) -> Optional[TaxaCambioDiaria]:
        """Busca a taxa de câmbio na coleção separada."""
        doc = await self.db.historico_cambio.find_one({
            "data_cotacao": data,
            "moeda_base": moeda_base
        })
        if doc:
            doc["_id"] = str(doc["_id"]) 
            return TaxaCambioDiaria(**doc)
        return None

    async def salvar_taxa_cambio_cache(self, taxa: TaxaCambioDiaria):
        """Salva a taxa de câmbio na coleção separada."""
        taxa_dict = taxa.model_dump(by_alias=True, exclude={"id"})
        await self.db.historico_cambio.insert_one(taxa_dict)
        
    async def obter_todas_categorias(self) -> list:
        """
        Retorna dicionários crus das categorias para o cache em memória do Motor de Regex.
        O Motor de Regex foi projetado para ler dicionários rápidos, e não classes Pydantic inteiras.
        """
        cursor = self.db.categorias.find({})
        categorias = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            categorias.append(doc)
        return categorias
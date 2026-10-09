from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

# ==========================================
# CACHE GLOBAL DE DOMÍNIOS (Singleton)
# ==========================================
class CacheDominios:
    _instancia = None

    def __new__(cls):
        if cls._instancia is None:
            cls._instancia = super().__new__(cls)
            cls._instancia.moedas = []
            cls._instancia.formas_pagamento = []
            cls._instancia.categorias = []
        return cls._instancia

    async def carregar_se_vazio(self, db):
        if not self.moedas:
            async for m in db.moedas.find({"ativo": True}):
                m["_id"] = str(m["_id"])
                self.moedas.append(m)

            async for f in db.formas_pagamento.find({"ativo": True}):
                f["_id"] = str(f["_id"])
                self.formas_pagamento.append(f)

            async for c in db.categorias.find({"ativo": True}):
                c["_id"] = str(c["_id"])
                self.categorias.append(c)

    def obter_payload(self) -> Dict[str, Any]:
        return {
            "moedas": self.moedas,
            "formas_pagamento": self.formas_pagamento,
            "categorias": self.categorias
        }

cache_global = CacheDominios()

# ==========================================
# ROTAS E DTOs DE SINCRONIZAÇÃO
# ==========================================
class SyncRequest(BaseModel):
    ultimo_sync_timestamp: datetime
    transacoes_pendentes: List[Dict[str, Any]]

class SyncResponse(BaseModel):
    novo_sync_timestamp: datetime
    processadas_agora: List[str]
    atualizadas_no_servidor: List[Dict[str, Any]]
    dominios: Optional[Dict[str, List[Dict[str, Any]]]] = Field(default_factory=dict)

router = APIRouter(prefix="/api/sync", tags=["Sincronização"])

@router.post("/", response_model=SyncResponse)
async def sincronizar_dados(payload: SyncRequest):
    from src.api.main import processador, repo
    
    ids_processados = []
    for dados_transacao in payload.transacoes_pendentes:
        novo_id = await processador.processar_e_salvar(dados_transacao)
        ids_processados.append(novo_id)
        
    cursor = repo.db.transacoes.find({
        "atualizado_em": {"$gt": payload.ultimo_sync_timestamp}
    })
    
    transacoes_atualizadas = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if doc["_id"] not in ids_processados:
            transacoes_atualizadas.append(doc)

    await cache_global.carregar_se_vazio(repo.db)

    return SyncResponse(
        novo_sync_timestamp=datetime.now(timezone.utc),  # <-- CORRIGIDO AQUI
        processadas_agora=ids_processados,
        atualizadas_no_servidor=transacoes_atualizadas,
        dominios=cache_global.obter_payload()
    )
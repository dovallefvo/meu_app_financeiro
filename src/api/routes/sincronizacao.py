from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime

# Importações adiadas para evitar ciclo no main
class SyncRequest(BaseModel):
    ultimo_sync_timestamp: datetime
    transacoes_pendentes: List[Dict[str, Any]]

class SyncResponse(BaseModel):
    novo_sync_timestamp: datetime
    processadas_agora: List[str]
    atualizadas_no_servidor: List[Dict[str, Any]]

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

    return SyncResponse(
        novo_sync_timestamp=datetime.utcnow(),
        processadas_agora=ids_processados,
        atualizadas_no_servidor=transacoes_atualizadas
    )
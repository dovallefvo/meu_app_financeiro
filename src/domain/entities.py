from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class Categoria(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    nome: str
    tipo: str  
    parent_id: Optional[str] = None
    chaves_pesquisa: List[str] = []
    sinal_operacao: int = -1 

    class Config:
        populate_by_name = True

class TaxaCambioDiaria(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    data_cotacao: str  
    moeda_base: str    
    taxas: Dict[str, float]  

class Transacao(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    usuario_id: str
    data_transacao: datetime
    descricao: str
    
    moeda_original: str
    valor_bruto: float
    valor_calculado: float 
    valores_convertidos: Dict[str, float] = {}
    forma_pagamento: str
    
    macrocategoria_nome: str
    categoria_nome: str
    subcategoria_id: str
    subcategoria_nome: str
    
    pendente_sync: bool = False
    criado_em: datetime = Field(default_factory=datetime.utcnow)
    atualizado_em: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

    def aplicar_conversao(self, taxas_do_dia: Dict[str, float]):
        self.valores_convertidos = {}
        for moeda_destino, taxa in taxas_do_dia.items():
            self.valores_convertidos[moeda_destino] = round(self.valor_calculado * taxa, 2)
        self.valores_convertidos[self.moeda_original] = self.valor_calculado
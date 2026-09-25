from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, Field, model_validator

# ==========================================
# CONSTANTES DE REGRA DE NEGÓCIO
# ==========================================
PRIORIDADE_ALTA = 10
PRIORIDADE_MEDIA = 30
PRIORIDADE_BAIXA = 50

# ==========================================
# SUPERCLASSE (LAYER SUPERTYPE)
# ==========================================
class EntidadeBase(BaseModel):
    """
    Classe base que fornece ID, controle de exclusão lógica (ativo) 
    e trilha de auditoria (criado_em, atualizado_em) para todas as entidades.
    """
    id: Optional[str] = Field(default=None, alias="_id")
    ativo: bool = True
    criado_em: datetime = Field(default_factory=datetime.utcnow)
    atualizado_em: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        
    @model_validator(mode='before')
    @classmethod
    def atualizar_timestamp(cls, values):
        """Sempre que a entidade for manipulada via Pydantic, atualiza o timestamp."""
        # Se os dados estão vindo do banco (já possuem _id), tocamos no atualizado_em
        if "_id" in values or "id" in values:
            values["atualizado_em"] = datetime.utcnow()
        return values

# ==========================================
# ENTIDADES BASE E CONFIGURAÇÕES
# ==========================================
# Note que Categoria, FormaPagamento e Moeda agora herdam de EntidadeBase, 
# ganhando automaticamente 'id', 'ativo', 'criado_em' e 'atualizado_em'.

class Categoria(EntidadeBase):
    nome: str
    tipo: str  # MACROCATEGORIA, CATEGORIA, SUBCATEGORIA
    parent_id: Optional[str] = None
    chaves_pesquisa: List[str] = []
    sinal_operacao: int = -1
    prioridade: int = PRIORIDADE_ALTA

class FormaPagamento(EntidadeBase):
    nome: str

class Moeda(EntidadeBase):
    sigla: str
    moeda_padrao: bool = False

class TaxaCambioDiaria(EntidadeBase):
    data_cotacao: str
    moeda_base: str
    taxas: Dict[str, float]

# ==========================================
# ENTIDADE PRINCIPAL: TRANSAÇÃO
# ==========================================

class CategoriaResumo(BaseModel):
    """Objeto de Valor (Value Object) para embutir na Transação"""
    subcategoria_id: str
    macrocategoria_nome: str
    categoria_nome: str
    subcategoria_nome: str

class Transacao(EntidadeBase):
    usuario_id: str
    data_transacao: datetime
    descricao: str
    
    moeda_original: str
    valor_bruto: float
    valor_calculado: float 
    valores_convertidos: Dict[str, float] = {}
    forma_pagamento: str
        
    categoria: CategoriaResumo
    
    pendente_sync: bool = False

    def aplicar_conversao(self, taxas_do_dia: Dict[str, float]):
        self.valores_convertidos = {}
        for moeda_destino, taxa in taxas_do_dia.items():
            self.valores_convertidos[moeda_destino] = round(self.valor_calculado * taxa, 2)
        self.valores_convertidos[self.moeda_original] = self.valor_calculado
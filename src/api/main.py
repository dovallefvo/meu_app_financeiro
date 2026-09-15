from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.adapters.repositories.mongo_repository import MongoTransacaoRepository
from src.adapters.external_apis.cambio_api import ProvedorCambioFrankfurter
from src.use_cases.gerenciador_transacoes import ProcessadorDeTransacao

import os
from dotenv import load_dotenv

load_dotenv() # Carrega as variáveis do .env

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "app_financeiro")

repo = MongoTransacaoRepository(MONGO_URI, MONGO_DB)
api_cambio = ProvedorCambioFrankfurter()
processador = ProcessadorDeTransacao(repo, api_cambio)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Iniciando servidor... Carregando cache do Motor Regex.")
    await processador.carregar_cache_categorias()
    yield
    print("Desligando servidor...")

app = FastAPI(
    title="API - Finanças Nômade",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Erro inesperado: {exc}") 
    return JSONResponse(
        status_code=500,
        content={"erro": "Erro interno", "detalhe": str(exc)}
    )

from src.api.routes import sincronizacao
app.include_router(sincronizacao.router)
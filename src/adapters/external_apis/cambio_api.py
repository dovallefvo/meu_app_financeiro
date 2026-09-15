import httpx
from typing import Dict

class ProvedorCambioFrankfurter:
    BASE_URL = "https://api.frankfurter.app"

    async def obter_taxas_historicas(self, data: str, moeda_base: str, moedas_destino: list) -> Dict[str, float]:
        simbolos = ",".join(moedas_destino)
        url = f"{self.BASE_URL}/{data}?from={moeda_base}&to={simbolos}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            dados = response.json()
            return dados.get("rates", {})
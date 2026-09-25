import httpx
from typing import Dict

class ProvedorCambioFrankfurter:
    BASE_URL = "https://api.frankfurter.dev/v1"

    async def obter_taxas_historicas(self, data: str, moeda_base: str, moedas_destino: list) -> Dict[str, float]:
        moedas_filtradas = [m for m in moedas_destino if m != moeda_base]
        simbolos = ",".join(moedas_filtradas)
        url = f"{self.BASE_URL}/{data}?from={moeda_base}&to={simbolos}"
        rates = {moeda_base: 1.0}

        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            dados = response.json()
            rates.update(dados.get("rates", {}))
            print(rates)
            return rates
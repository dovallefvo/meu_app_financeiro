export class FormatUtils {
    static obterSimboloMoeda(codigoMoeda, localizacao = 'pt-BR') {
        if (!codigoMoeda) return '';
        try {
            const formatador = new Intl.NumberFormat(localizacao, {
                style: 'currency',
                currency: codigoMoeda.trim().toUpperCase(),
            });
            const partes = formatador.formatToParts(0);
            const simbolo = partes.find(parte => parte.type === 'currency');
            return simbolo ? simbolo.value : codigoMoeda;
        } catch (erro) {
            return codigoMoeda;
        }
    }
}
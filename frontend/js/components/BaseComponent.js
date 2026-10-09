export default class BaseComponent extends HTMLElement {
    constructor(componentName) {
        super();
        this.attachShadow({ mode: 'open' });
        this.componentName = componentName;
    }
    async connectedCallback() {
        try {
            await this.render();
            this.onMounted();
        } catch (error) {
            console.error('[BaseComponent] Erro Crítico em <' + this.componentName + '>: ', error);
            this.exibirErroVisual(error.message);
        }
    }
    async render() {
        const basePath = '/js/components/' + this.componentName;
        const [htmlRes, cssRes] = await Promise.all([
            fetch(basePath + '/' + this.componentName + '.html', { cache: 'no-store' }),
            fetch(basePath + '/' + this.componentName + '.css', { cache: 'no-store' })
        ]);
        if (!htmlRes.ok || !cssRes.ok) throw new Error('Falha ao descarregar recursos físicos do componente ' + this.componentName);

        const htmlText = await htmlRes.text();
        const cssText = await cssRes.text();

        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        this.shadowRoot.adoptedStyleSheets = [sheet];

        const template = document.createElement('template');
        template.innerHTML = htmlText;
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }
    exibirErroVisual(mensagem) { 
    this.shadowRoot.innerHTML = `
        <div style="padding: 1.5rem; background: #fce8e6; color: #c5221f; border-radius: 8px; font-family: system-ui; margin: 1rem;">
        <strong>Erro no Componente [${this.componentName}]</strong>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">${mensagem}</p>
        </div>
    `; 
    }
    $(selector) { return this.shadowRoot.querySelector(selector); }
    onMounted() {}
}
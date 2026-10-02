export default class BaseComponent extends HTMLElement {
    constructor(componentName) {
        super();
        this.attachShadow({ mode: 'open' });
        this.componentName = componentName;
    }
    async connectedCallback() {
        await this.render();
        this.onMounted();
    }
    async render() {
        try {
            const basePath = '/js/components/' + this.componentName;
            const [htmlRes, cssRes] = await Promise.all([
                fetch(basePath + '/' + this.componentName + '.html', { cache: 'no-store' }),
                fetch(basePath + '/' + this.componentName + '.css', { cache: 'no-store' })
            ]);
            if (!htmlRes.ok || !cssRes.ok) throw new Error('Recursos Ausentes');

            const htmlText = await htmlRes.text();
            const cssText = await cssRes.text();

            const sheet = new CSSStyleSheet();
            sheet.replaceSync(cssText);
            this.shadowRoot.adoptedStyleSheets = [sheet];

            const template = document.createElement('template');
            template.innerHTML = htmlText;
            this.shadowRoot.appendChild(template.content.cloneNode(true));
        } catch (error) {
            console.error('[BaseComponent] Erro ' + this.componentName + ':', error);
            this.shadowRoot.innerHTML = "<p style='color:red;'>Erro estrutural.</p>";
        }
    }
    $(selector) { return this.shadowRoot.querySelector(selector); }
    onMounted() {}
}
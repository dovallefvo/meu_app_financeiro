import BaseComponent from '../BaseComponent.js';
export default class TreeView extends BaseComponent {
 constructor() { super('TreeView'); }
 renderizarArvore(hierarquia) {
 const root = this.$('#tree-root');
 if (!root) return;
 root.innerHTML = '';
 root.appendChild(this.#construirNoh(hierarquia));
 }
 #construirNoh(dados) {
 const fragment = document.createDocumentFragment();
 for (const [macro, categorias] of Object.entries(dados)) {
 const details = document.createElement('details');
 details.open = true;
 const summary = document.createElement('summary');
 summary.textContent = macro;
 details.appendChild(summary);
 
 for (const [cat, subcats] of Object.entries(categorias)) {
 if (Array.isArray(subcats) && subcats.length > 0) {
 const subDetails = document.createElement('details');
 const subSummary = document.createElement('summary');
 subSummary.textContent = cat;
 subDetails.appendChild(subSummary);
 
 subcats.forEach(sub => {
 const div = document.createElement('div');
 div.className = 'tree-item';
 div.innerHTML = ' ' + sub + '';
 subDetails.appendChild(div);
 });
 details.appendChild(subDetails);
 } else {
 const div = document.createElement('div');
 div.className = 'tree-item';
 div.innerHTML = ' ' + cat + '';
 details.appendChild(div);
 }
 }
 fragment.appendChild(details);
 }
 return fragment;
 }
}
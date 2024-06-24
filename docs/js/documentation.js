import Playground from "./Playground.js";



// We have to import like this b/c we're not a module.


document.addEventListener('DOMContentLoaded', () => {
	
	let dt = new DarkToggle();
	dt.setAttribute('style', 'position: fixed; top: 15px; right: 15px; cursor: pointer; transform: scale(2)');
	document.body.append(dt);
	


	// Convert all code blocks to use Playground.js
    for (let pre of document.querySelectorAll('pre.ty-contain-cm')) {
        let lines = [];
        for (let preLine of pre.querySelectorAll('pre.CodeMirror-line > span'))
            lines.push(preLine.textContent.replace(/\xa0/g, ' ').replace(/\n$/g, '').replace(/    /g, '\t'))
	    
	    let prefix = `
			<script>document.documentElement.classList.add('eternium')</script>
			<link rel="stylesheet" href="eternium.css">
			<style>
				html[dark] { background: var(--shade2) }
				body { font: 12px Arial; background: transparent !important }
				/*.box { width: 20px; height: 20px; background: var(--shade4) }*/
				h4 { margin-bottom: 0 }
			</style>`;
        let value = lines.join('\n');
		
        let pg = new Playground({value, language: pre.getAttribute('lang'), width: 50, prefix, limitCodeEditorHeight: true})
        pre.replaceWith(pg);
    }
})

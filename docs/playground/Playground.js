import {r, Red} from "./redcomponent/RedComponent.js";
import "./ui/CodeEditor.js";
import "./ui/FlexResizer.js";


export default class Playground extends Red {
	
	/**
	 *
	 * @param code
	 * @param language
	 * @param width
	 *
	 * @param maxHeight {int} If the editor is taller than the preview, and taller than this height, limit it the max of this height and the preview height.
	 * */
	constructor({value, language='JavaScript', width=50, prefix='', maxHeight=555}={}) {
		super({scripts: false});
		value = value || (this.code ? this.code.querySelector('script')?.textContent : '');
		this.value = value;
		this.language = language;
		this.width = width;
		this.prefix2 = prefix;
		this.maxHeight = maxHeight
		this.render();
		
		this.editor.onChange.push(() => {
			this.run();
		});
		
		this.run();
	}

	run() {
		let html;
		if (this.language === 'javascript')
			html = `<script type="module">${this.editor.getValue()}</script>`;
		else if (this.language === 'html')
			html = this.editor.getValue();
		else {
			this.editor.style.width = '100%';
			this.editor.style.borderRight = 'none';
			this.resizer.style.display = 'none';
			this.preview.style.display = 'none';
			return;
		}

		// Create a new preview iframe and swap it for the old one once it's loaded.
		let newIframe = r(`<iframe data-id="preview" frameborder="0" style="display: none; height: 0">`);
		newIframe.onload = () => {

			newIframe.contentWindow.document.open();
			newIframe.contentWindow.onerror = (msg, url, line, col, error) => {

				setTimeout(() => {
					let message;
					if (error instanceof newIframe.contentWindow.SyntaxError)
						message = `${msg} on line ${line}:${col}`
					else
						message = shortenError(error)

					let errorDiv = `<div style="color: red; font: 12px sans-serif; position: fixed; left: 0; bottom: 0;
						width: 100%; padding: 5px; max-height: 50%; overflow-y: auto; background: white">${message}</div>`;
					newIframe.contentWindow.document.body.append(r(errorDiv));
				}, 0);
			}
			
			newIframe.contentWindow.document.write(this.prefix2 + html);

			newIframe.contentWindow.document.close();
			newIframe.onload = null;
			
			if (document.documentElement.hasAttribute('dark'))
				newIframe.contentWindow.document.documentElement.setAttribute('dark', '');
			// TODO use mutation observer to watch for change.
			
			
			
			
			
			// TODO: Check to see when all links have a .sheet property with css rules.
			// let dynamic = newIframe.contentWindow.document.querySelectorAll('link');
			// for (let el of dynamic) {
			// 	console.log(el)
			// 	dynamic.onload = () => {
			// 		console.log('loaded')
			// 		console.log(el)
			// 	}
			// }
			
			

			// Prevent flashing
			//newIframe.contentWindow.document.addEventListener('load', () => {
			setTimeout(() => {
				//newIframe.contentWindow.requestAnimationFrame(() => {
				this.preview.remove();
				newIframe.style.display = '';
				this.preview = newIframe;
				
				// Resize iframe to height of content.
				let newPreviewHeight = expandIframe(newIframe);
				setTimeout(() => {
					expandIframe(newIframe);
				}, 500);
				
				
				if (this.maxHeight) {
					
					// Get scroll position.
					let scroller = this.editor.querySelector('.cm-editor > .cm-scroller');
					let scroll = {x: scroller?.scrollLeft || 0, y: scroller?.scrollTop || 0};
					
					// Don't let CodeEditor be taller than preview.
					this.editor.style.height = '';
					let editorHeight = this.editor.getBoundingClientRect().height;
					if (editorHeight > newPreviewHeight && editorHeight > this.maxHeight)
						this.editor.style.height = Math.max(newPreviewHeight, this.maxHeight) + 'px';
					
					// Restore scroll position.
					if (scroller) {
						scroller.scrollTop = scroll.y;
						scroller.scrollLeft = scroll.x;
						requestAnimationFrame(() => {
							scroller.scrollTop = scroll.y;
							scroller.scrollLeft = scroll.x;
						});
					}
				}
				//})
			}, 10);
		}
		
		this.insertBefore(newIframe, this.preview);
	}


	render() {
		this.html = r`
			<play-ground class="card row pad stretch-v  pad-small-tablet col-mobile pad-tiny-mobile">
				<style>
					@media (width < 768px) { /* On mobile, put preview below code */
						:host code-editor { max-height: 300px; border-bottom: var(--border) }
						:host [data-id=preview] { margin: 0; min-width: 0; background: white }
						:host flex-resizer { display: none }
					}
					@media (768px <= width) {
						:host code-editor { width: ${this.width}%; border-right: var(--border) }
						:host [data-id=preview] { width: ${100 - this.width}%; min-width: 0; margin: 0; background: white }
					}
				</style>			
				<code-editor data-id="editor" value="${this.value}" language="${this.language}"></code-editor>
				<flex-resizer data-id="resizer"></flex-resizer>
				<iframe data-id="preview" frameborder="0"></iframe>
				<slot data-id="code" style="display: none"></slot>
			</play-ground>`
	}
}
Playground.define('play-ground')

function shortenError(error, br='<br>&nbsp;&nbsp;') {
	if (typeof error === 'string')
		return error;

	return error.stack.replace(/\r?\n/g, br);
}

function expandIframe(iframe) {
	if (!iframe.contentWindow)
		return;

	iframe.style.height = '0';
	iframe.style.minHeight = '';
	iframe.style.maxHeight = '0';
	
	let previewHeight = iframe.contentWindow.document.documentElement.scrollHeight;
	let newPreviewHeight = Math.ceil(previewHeight);
	if (iframe.contentWindow.document.body.scrollWidth > iframe.clientWidth)
		newPreviewHeight += 24; // If it has a scrollbar.
	
	iframe.style.height = '';
	iframe.style.minHeight = newPreviewHeight + 'px';
	iframe.style.maxHeight = newPreviewHeight + 'px';
	return newPreviewHeight;
}
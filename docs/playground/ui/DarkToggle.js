// Add this from a regular script tag in the head, not a module!


/** TODO: Use slot for custom content? */
class DarkToggle extends HTMLElement {
	
	constructor() {
		super();
		this.render();
		
		this.addEventListener('click', () => {
			let h=document.documentElement;
			let isDark = !h.hasAttribute('dark');
			h.toggleAttribute('dark', isDark);
			localStorage.setItem('dark', h.hasAttribute('dark')+'');
			
			for (let iframe of this.ownerDocument.body.querySelectorAll('iframe'))
				iframe.contentWindow.document.documentElement.toggleAttribute('dark', isDark);
		})
	}
	
	/**
	 * Add a dark attibute to the head tag if local storage or prefers-color-scheme says we're in dark mode.  */
	static init() {
		let saved = localStorage.getItem('dark');
		let isDark = saved
			? saved==='true'
			: (document.querySelector('html[light]') ?
				false
				: (document.querySelector('html[dark]')/* || window?.matchMedia('(prefers-color-scheme: dark)').matches*/));
		
		document.documentElement.toggleAttribute('dark', isDark);
	}
	
	
	render() {
		this.setAttribute('style', 'user-select: none');
		this.setAttribute('title', 'Toggle Dark Mode');
		this.innerHTML = `
			<svg width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 512 512">
				<path fill="currentColor" d="M152.62 126.77c0-33 4.85-66.35 17.23-94.77C87.54 67.83 32 151.89 32 247.38C32
			375.85 136.15 480 264.62 480c95.49 0 179.55-55.54 215.38-137.85c-28.42 12.38-61.8 17.23-94.77 17.23c-128.47
			0-232.61-104.14-232.61-232.61Z"/></svg>`;
	}
}

customElements.define('dark-toggle', DarkToggle);
DarkToggle.init();
document.documentElement.classList.add('eternium');

// "Export"
window.DarkToggle = DarkToggle;
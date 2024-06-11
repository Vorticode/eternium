var div = document.createElement('div');
var decodeCache_ = {};

// TODO: Move all of this to StringUtil?
// Or move createEl here, along with htmlToText and textToHtml?
export default {

	/**
	 * Convert html entities like &lt; to their literal values like <.
	 * @param {string} html
	 * @return {string} */
	decode(html) {
		if (!html)
			return '';

		return html // Fast solution inspired by https://stackoverflow.com/a/43282001
			.replace(/&[#A-Z0-9]+;/gi, entity => {
				let result = decodeCache_[entity];
				if (result)
					return result;

				div.innerHTML = entity; // create and cache new entity
				return decodeCache_[entity] = div.textContent;
			});

	},

	encode(text, quotes='"') {
		text = ((text === null || text === undefined) ? '' : text+'')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\a0/g, '&nbsp;')
		if (quotes.includes("'"))
			text = text.replace(/'/g, '&apos;');
		if (quotes.includes('"'))
			text = text.replace(/"/g, '&quot;');
		return text;
	},




	/**
	 * Convert a template tag with embedded html elements into a complete DOM tree,
	 * without recreating the embedded elements.
	 *
	 * Caveats:
	 * Will fail if elements are inserted as expressions inside <tags> instead of as children.
	 *
	 * See also createEl()
	 *
	 * @param strings {string[]}
	 * @param exprs {*[]}
	 * @return {Node[]} asdf
	 *
	 * @example
	 * Html.create`<div>${document.createElement('a')}hi</div>` */
	create(strings, ...exprs) {

		// 1.  Append html strings together with placeholders for Nodes.
		let html = [];
		let placeholders = [];
		for (let i in strings) {
			html.push(strings[i])
			let val = exprs[i];
			if (val) {
				if (val instanceof Node) {
					html.push('') // U+E000, part of private unicode range for custom use.
					placeholders.push(val)
				}
				else if (Array.isArray(val)) {
					val = val.flat();
					for (let item of val)
						if (item instanceof Node) {
							html.push('')
							placeholders.push(item)
						}
						else
							html.push(item+'');
				}
				else
					html.push(val+'');
			}
		}

		// 2. Create the element.
		let htmlJoined = html.join('');
		div.innerHTML = htmlJoined;

		// Why does it sometimes fail but work on the second try?  Why is this remarkably stupid code necessary?
		if (div.innerHTML !== htmlJoined)
			div.innerHTML = htmlJoined;

		// 3. Replace the placeholders:
		let node;
		let toRemove = [];
		const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
		while (node = walker.nextNode()) {
			let parts = node.textContent.split(//g)
			if (parts.length > 1) {
				let next = node.nextElementSibling;
				for (let i = 0; i < parts.length; i++) {
					let text = parts[i];
					if (i > 0)
						node.parentNode.insertBefore(placeholders.shift(), next);
					if (text.length)
						node.parentNode.insertBefore(document.createTextNode(text), next);
				}

				// Removing them here will mess up the treeWalker.
				toRemove.push(node);
			}
		}

		if (placeholders.length)
			debugger;

		toRemove.map(el => el.remove())

		// 4. Get the result
		let result = [];
		while (div.firstChild)
			result.push(div.removeChild(div.firstChild));
		return result;
	},

	/**
	 * Create and return one element.
	 * If the string starts with whitespace before an element, trim that whitespace.
	 * @param strings {string|string[]}
	 * @param exprs {*[]=}
	 * @returns {Node} */
	createOne(strings, ...exprs) {
		if (!Array.isArray(strings))
			strings = [strings];

		if (strings.length && strings[0].match(/^\s*</)) {
			strings = strings.slice();
			strings[0] = strings[0].trimStart();
		}
		return this.create(strings, ...exprs)[0];
	}
};

export {div};


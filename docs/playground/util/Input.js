import Html from "./Html.js";


var keys = {
	specialKeys: {
		8: "backspace", 9: "tab", 10: "return", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
		20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
		37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del", 59: ";", 61: "=",
		96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
		104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/",
		112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8",
		120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 173: "-", 186: ";", 187: "=",
		188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\", 221: "]", 222: "'"
	},
	shiftNums: {
		"`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&",
		"8": "*", "9": "(", "0": ")", "-": "_", "=": "+", ";": ": ", "'": "\"", ",": "<",
		".": ">",  "/": "?",  "\\": "|"
	},

	nonEditing: ['ctrl', 'alt', 'shift', 'capslock', 'numlock', 'esc',
		'up', 'down', 'left', 'right', 'home', 'end', 'insert', 'pageup', 'pagedown', 'scroll', 'pause',
		'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
		'f13', 'f14', 'f15', 'f16', 'f17', 'f18', 'f19', 'f20', 'f21', 'f22', 'f23', 'f24']
};

var Input = {

	/**
	 * Write the text to the clipboard.
	 * @param text {string} */
	copyText(text) {
		let input = document.createElement('textarea');
		input.style.width = 0;
		input.innerHTML = text;
		document.body.appendChild(input);
		input.select();
		let result = document.execCommand('copy');
		document.body.removeChild(input);
		return result;
	},

	/**
	 * Force the element to have focus so it can receive keyboard and paste events.
	 * calling .focus() on it isn't enough.
	 * @param el {HTMLElement} Must have a tabindex property. */
	forceFocus(el) {
		let input = el.ownerDocument.createElement('input');
		input.style.height = '0';
		input.style.width = '0';
		el.append(input);
		input.focus();
		el.focus();
		input.remove()
	},


	/**
	 * Is the KeyboardEvent something that will produce text input?
	 * @param e {KeyboardEvent}
	 * @return {boolean} */
	isInput(e) {
		if (e.ctrlKey || e.altKey || e.metaKey) // we allow shift b/c it's for capital letters.
			return false;

		return !this.isKey(e, keys.nonEditing) && e.key?.length === 1; // Filter out other keys like 'MediaPlay'
	},

	/**
	 * @example Hotkey.is(e, ['ctrl+y', 'ctrl+z']); // returns true if it's one of these events.
	 * @param e {KeyboardEvent}
	 * @param types {string|string[]}
	 * @param ignoreModifierKeys {boolean=false}
	 * @return {boolean} */
	isKey(e, types, ignoreModifierKeys) {
		//#IFDEV
		if (!types)
			throw new Error('Missing types argument');
		//#ENDIF
		if (!Array.isArray(types))
			types = [types];

		var special = keys.specialKeys[e.keyCode],
			character = String.fromCharCode(e.which).toLowerCase(),
			modif = '', possible = {};

		for (let specialKey of [ "alt", "ctrl", "meta", "shift" ]) {
			if (e[specialKey + 'Key'] && special !== specialKey)
				modif += specialKey + '+';
		}
		modif = modif.replace('alt+ctrl+meta+shift', 'hyper');
		if (special) {
			possible[ modif + special ] = true;
			if (special === 'return')
				possible[modif + 'enter'] = true;
			if (ignoreModifierKeys) {
				possible[special] = true;
				if (special === 'return')
					possible['enter'] = true;
			}
		}

		if (character) {
			possible[modif + character] = true;
			if (ignoreModifierKeys)
				possible[character] = true;
			possible[modif + keys.shiftNums[character]] = true;
			if (ignoreModifierKeys)
				possible[ keys.shiftNums[character]] = true;

			// "$" can be triggered as "Shift+4" or "Shift+$" or just "$"
			if (modif === 'shift+')
				possible[ keys.shiftNums[character]] = true;
		}
		for (var i=0, l=types.length; i<l; i++)
			if (possible[types[i]])
				return true;

		return false;
	},

	/**
	 * @deprecated for Util.on()
	 * Add a filtered event listener and return a function to remove that listener.
	 * Supports {once: true} as an option.
	 * Then move this outside of Input?
	 * @param div {HTMLElement}
	 * @param type {string}
	 * @param key {null|string|function(Event)}
	 *     If a string and a KeyboardEvent, only if the event matches this key.
	 *     If a function, only if the function returns true when called with an event of any type.
	 * @param callback {function(Event)|Object|boolean}
	 * @param options {Object|boolean=}  Can include {once: true}
	 * @return {function} Call this function to unbind. */
	on(div, type, key=null, callback, options) {

		// We handle "once" ourselves.
		let once = options?.once;
		if (once)
			delete options.once;

		let internalCallback = e => {
			if (!key || (e instanceof KeyboardEvent && e.key === key || Input.isKey(e, key)) || (typeof key === 'function' && key(e))) {
				callback(e);
				if (once)
					div.removeEventListener(type, internalCallback, options);
			}
		};
		div.addEventListener(type, internalCallback, options);

		return () => div.removeEventListener(type, internalCallback, options);
	},

	/**
	 * Restrict each typed letter to the pattern Regex.
	 * Also see Input.pasteAsPlainText() which is often used along with this function.
	 * @param {KeyboardEvent|Node} event
	 * @param {RegExp} allowed
	 * @example
	 * <input onkeydown="Input.limitKeys(event, /[A-Za-z_0-9]/)"> */
	limitKeys(event, allowed) {
		if (event instanceof Node)
			event.addEventListener('keydown', e=>Input.limitKeys(e, allowed));
		else {
			// Allow ctrl+a, ctrl+c, etc.
			if (event.ctrlKey)
				return true;


			// Always allow keycodes that don't insert characters
			var k = event.keyCode;

			// Allow keys that don't add a character:
			// all keycodes listed here:  https://github.com/wesbos/keycodes/blob/gh-pages/scripts.js
			if ((k < 48 && ![9, 12, 13, 32].includes(k)) || // all of the lower keycodes except tab, enter, space
				[91, 92, 93, 95,].includes(k) ||		    // left windows/⌘ key, right windows key, windows menu, sleep
				(112 <= k && k <= 151) ||					// F1-F32, numlock, scroll-lock, airplane mode
				[166, 167, 168, 169].includes(k) ||		    // page back, page forward, refresh
				(172 <= k && k <= 183) ||					// home key, media keys
				[224, 230, 233, 234, 251, 255].includes(k)  // ⌘ key firefox, gnome compose key, XF86 Forwared, XF86 Back, unlock trackpad, toggle touchpad.
			)
				return true;

			//console.log(String.fromCharCode(event.keyCode));
			// We use event.key because String.fromCharCode(event.keyCode) will return '4' for '$' and other keys entered through modifiers.
			let key = event.key;
			if (key === 'Enter') // Why does "Enter" appear as text instead of the literal '\n' ?
				key = '\n';
			if (!allowed.test(key)) {
				event.preventDefault();
				return false;
			}

			return true;
		}
	},

	/**
	 * Also see Input.limitKeys() which is often used along with this function.
	 *
	 * @param item {ClipboardEvent|Event|Node} If a node, a paste event listener will be assigned to it.
	 * Otherwise, insert clipboard data from the paste event to the element that has focus.
	 * @param allowLn
	 * @param allowed {?RegExp} If set, only allow characters that match this regex.  Must be a global /g regex.
	 *
	 * @example
	 * <div contenteditable onpaste="Input.pasteAsPlainText(event)">
	 *
	 * @example
	 * Input.pasteAsPlainText(document.getElementById('notes')); */
	pasteAsPlainText(item, allowLn=true, allowed=null) {
		if (item instanceof Node)
			item.addEventListener('paste', e=> Input.pasteAsPlainText(e, allowLn));

		else {
			let event = item;
			event.preventDefault();
			let text = (event.originalEvent || event).clipboardData.getData('text/plain');
			text = Html.encode(text);
			if (allowed) {
				let copy = '';
				text.replaceAll(allowed, match => {
					copy += match
				});
				text = copy;
			}

			if (allowLn)
				text = text.replace(/\r?\n/g, '<br>');

			// The target element already has focus, so the command puts the text there.
			document.execCommand("insertHTML", false, text);
			return false;
		}
	},

	/**
	 * Select all the text in an element.
	 * @param el {HTMLElement|HTMLInputElement} */
	selectAll(el) {
		if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
			el.select();
		else {
			let range = document.createRange();
			range.selectNodeContents(el);
			let sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		}
	}
};

export default Input;
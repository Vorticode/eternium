import Input from "./Input.js";


 
 /**
 * @typedef {Array|function(...*)} Callbacks
 * @property {function(function)} push
 * @property {function()} remove
 * @property {function()} pause
 * @property {function()} resume
 * */


/**
 * A place for functions that have no other home.*/
var Util = {

	/**
	 * Create an array-like object that stores a group of callbacks.
	 * Supports all array functions and properties like push() and .length.
	 * Can be called directly.
	 *
	 * @param functions {function[]}
	 * @return {Callbacks|function}
	 *
	 * @example
	 * var c = Util.callback();
	 * var f = () => console.log(3);
	 * c.push(f);
	 * c();
	 * c.remove(f);
	 * c();
	 */
	callback(...functions) {
		var paused = false;

		// Make it callable.  When we call it, call all callbacks() with the given args.
		let result = async function(...args) {
			let result2 = [];
			if (!paused)
				for (let i=0; i<result.length; i++)
					result2.push(result[i](...args));
			return await Promise.all(result2);
		};
		
		// Make it iterable.
		result[Symbol.iterator] = function() {
			let index = 0;
			return {
				next: () => index < result.length
					 ? {value: result[index++], done: false}
					 : {done: true}
			};
		};

		// Use properties from Array
		for (let prop of Object.getOwnPropertyNames(Array.prototype))
			if (prop !== 'length' && prop !== 'constructor')
				result[prop] = Array.prototype[prop];

		result.l = 0; // Internal length
		Object.defineProperty(result, 'length', {
			get() { return result.l },
			set(val) { result.l = val}
		});

		// Add the remove() function.
		result.remove = func => {
			let idx = result.findIndex(item => item === func);
			if (idx !== -1)
				result.splice(idx, 1);
		};
		result.pause = () => paused = true;

		result.resume = () => paused = false;

		// Add initial functions
		for (let f of functions)
			result.push(f);

		return result;
	},
	
	
	/**
	 * Add a filtered event listener and return a function to remove that listener.
	 * Supports {once: true} as an option.
	 * The last three arguments can be provided in any order, and may be omitted.
	 * @param el {HTMLElement}
	 * @param type {string}
	 * @param selector {null|string|function(Event)}
	 *     If a string, only if the element matches this selector.
	 * @param callback {function(Event)|Object|boolean}
	 * @param options {Object|boolean=}  Can include {once: true, key: 'ctrl+enter'}
	 *     As well as any options passed to addEventListener.
	 *     Key can be any string matched by Input.isKey()
	 * @return {function} Call this function to unbind. */
	on(el, type, selector=null, callback, options) {
		
		selector = callback = options = null;
		for (let arg of [...arguments].slice(2)) {
			if (typeof arg === 'object')
				options = arg;
			else if (typeof arg === 'function')
				callback = arg;
			else if (typeof arg === 'string')
				selector = arg;
		}

		// We handle "once" ourselves.
		let once = options?.once;
		if (once)
			delete options.once;
		let key = options?.key;
		if (key)
			delete options?.key;

		let internalCallback = e => {
			let matchesSelector = !selector || e.target.matches(selector);
			let matchesKey = !key || (e instanceof KeyboardEvent && e.key === key || Input.isKey(e, key)) || (typeof key === 'function' && key(e));
			
			if (matchesSelector && matchesKey) {
				callback(e);
				if (once)
					el.removeEventListener(type, internalCallback, options);
			}
		};
		el.addEventListener(type, internalCallback, options);

		return () => el.removeEventListener(type, internalCallback, options);
	}

};


export default Util;
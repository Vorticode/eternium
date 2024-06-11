import CustomRed from "./CustomRed.js";

/**
 * TODO: The Proxy and the multiple base classes mess up 'instanceof Red'
 * @type {Node|Class<HTMLElement>|function(tagName:string):Node|Class<HTMLElement>} */
let Red = new Proxy(CustomRed(), {
	apply(self, _, args) {
		return CustomRed(...args)
	}
});


/** @type {HTMLElement|Class} */
export {Red}
export {default as r} from './r.js';
export {getArg, ArgType} from './getArg.js';
export {forEach, watchGet, watchSet} from './watch.js' // old, unfinished
export {watch} from './watch2.js'; // unfinished
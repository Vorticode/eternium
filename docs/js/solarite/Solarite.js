import createSolarite from "./createSolarite.js";

/**
 * TODO: The Proxy and the multiple base classes mess up 'instanceof Solarite'
 * @type {Node|Class<HTMLElement>|function(tagName:string):Node|Class<HTMLElement>} */
let Solarite = new Proxy(createSolarite(), {
	apply(self, _, args) {
		return createSolarite(...args)
	}
});


/** @type {HTMLElement|Class} */
export {Solarite}
export {default as r} from './r.js';
export {getArg, ArgType} from './getArg.js';

export {forEach, watchGet, watchSet} from './watch.js' // old, unfinished
export {watch} from './watch2.js'; // unfinished
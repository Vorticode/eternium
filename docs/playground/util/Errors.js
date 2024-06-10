export function assert(val) {
	if (!val)
		throw new Error('Assertion failed: ' + val);
}

var Errors = {
	getStack(ignoreTop=0, ignoreRegex) {
		var e = new Error();
		if (!e.stack) return []; // There is no stack in IE.
		return e.stack
			.split('\n')
			.slice(ignoreTop+2)
			.map(line => line.trim().replace(/^at /, ''))
			.filter(line => !ignoreRegex || !line.match(ignoreRegex));
	}
}

/**
 * stackoverflow.com/a/49311904/
 * @param promise
 * @returns {Promise<unknown | [any]>}
 *
 *
 * @example
 * const [err, data] = await to(asyncFunction(arg1, arg2));
 *
 */
export function to(promise) {
	return promise.then(data => [null, data])
		.catch(err => [err]);
}

export default Errors;
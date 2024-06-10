let lastObjectId = 1>>>0; // Is a 32-bit int faster to increment than JavaScript's Number, which is a 64-bit float?
let objectIds = new WeakMap();

/**
 * @param obj {Object|string|Node}
 * @param prefix
 * @returns {string} */
export function getObjectId(obj, prefix=null) {
	
	
	
	//#IFDEV
	// Slower but useful for debugging:
	if (!prefix) {
		if (Array.isArray(obj))
			prefix = 'Array';
		else if (typeof obj === 'function')
			prefix = 'Func';
		else if (typeof obj === 'object')
			prefix = 'Obj'
		}
	//#ENDIF
	
	prefix = prefix || '~\f';
	
	// if (typeof obj === 'function')
	// 	return obj.toString();
	
	let result = objectIds.get(obj);
	if (!result) { // convert to string, store in result, then add 1 to lastObjectId.
		result = prefix+(lastObjectId++); // We use a unique prefix to ensure it doesn't collide w/ strings not from getObjectId()
		objectIds.set(obj, result)
	}
	return result;
}

/**
 * Control how JSON.stringify() handles Nodes and Functions.
 * Normally, we'd pass a replacer() function argument to JSON.stringify() to handle Nodes and Functions.
 * But that makes JSON.stringify() take twice as long to run.
 * Adding a toJSON method globally on these object prototypes doesn't incur that performance penalty. */
let isHashing = true;
function toJSON() {
	//return (isHashing && !Array.isArray(this)) ? getObjectId(this) : this
	return isHashing ? getObjectId(this) : this
}
// Node.prototype.toJSON = toJSON;
// Function.prototype.toJSON = toJSON;


/**
 * Get a string that uniquely maps to the values of the given object.
 * If a value in obj changes, calling getObjectHash(obj) will then return a different hash.
 * This is used by NodeGroupManager to create a hash that represents the current values of a NodeGroup.
 *
 * Relies on the Node and Function prototypes being overridden above.
 *
 * @param obj {*}
 * @returns {string} */
export function getObjectHash(obj) {
	
	// Sometimes these get unassigned by Chrome and Brave 119, as well as Firefox, seemingly randomly!
	// The same tests sometimes pass, sometimes fail, even after browser and OS restarts.
	// So we check the assignments on every run of getObjectHash()
	if (Node.prototype.toJSON !== toJSON) {
		Node.prototype.toJSON = toJSON;
		if (Function.prototype.toJSON !== toJSON) // Will it only unmap one but not the other?
			Function.prototype.toJSON = toJSON;
	}
	
	let result;
	isHashing = true;
	try {
		result = JSON.stringify(obj);
	}
	catch(e){
		result = getObjectHashCircular(obj);
	}
	isHashing = false;
	return result;
}

/**
 * Having this separate might help the optimzer for getObjectHash() ?
 * @param obj
 * @returns {string} */
function getObjectHashCircular(obj) {

	//console.log('circular')
	// Slower version that handles circular references.
	// Just adding any callback at all, even one that just returns the value, makes JSON.stringify() twice as slow.
	const seen = new Set();
	return JSON.stringify(obj, (key, value) => {
		if (typeof value === 'object' && value !== null) {
			if (seen.has(value))
				return getObjectId(value);
			seen.add(value);
		}
		return value;
	});
}
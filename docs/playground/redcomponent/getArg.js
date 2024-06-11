


/**
 * There are three ways to create an instance of a Red Component:
 * 1.  new ComponentName();                                         // direct class instantiation
 * 2.  this.html = r`<div><component-name></component-name></div>;  // as a child of another RedComponent.
 * 3.  <body><component-name></component-name></body>               // in the Document html.
 *
 * When created via #3, Red has no way to pass attributes as arguments to the constructor.  So to make
 * sure we get the correct value via all three paths, we write our constructors according to the following
 * example.  Note that constructor args are embedded in an object, and must be all lower-case because
 * Browsers make all html attribute names lowercase.
 *
 * @example
 * constructor({name, userid=1}={}) {
 *     super();
 *
 *     // Get value from "name" attriute if persent, otherwise from name constructor arg.
 *     this.name = getArg(this, 'name', name);
 *
 *     // Optionally convert the value to an integer.
 *     this.userId = getArg(this, 'userid', userid, ArgType.Int);
 * }
 *
 * @param el {HTMLElement}
 * @param name {string} Attribute name.  Not case-sensitive.
 * @param val {*} Default value to use if attribute doesn't exist.
 * @param type {ArgType|function|*[]}
 *     If an array, use the value if it's in the array, otherwise return undefined.
 *     If it's a function, pass the value to the function and return the result.
 * @return {*} */
export function getArg(el, name, val=null, type=ArgType.String) {
	let attrVal = el.getAttribute(name);
	if (attrVal !== null) // If attribute doesn't exist.
		val = attrVal;
		
	if (Array.isArray(type))
		return type.includes(val) ? val : undefined;
	
	if (typeof type === 'function')
		return type(val);
	
	// If bool, it's true as long as it exists and its value isn't falsey.
	if (type===ArgType.Bool) {
		let lAttrVal = typeof val === 'string' ? val.toLowerCase() : val;
		return !['false', '0', false, 0, null, undefined].includes(lAttrVal);
	}
	
	// Attribute doesn't exist
	switch (type) {
		case ArgType.Int:
			return parseInt(val);
		case ArgType.Float:
			return parseFloat(val);
		case ArgType.String:
			return val || '';
		case ArgType.JSON:
			try {
				return JSON.parse(val);
			} catch (e) {
				return val;
			}
		case ArgType.Eval:
			try {
				return eval(`(${val})`);
			} catch (e) {
				return val;
			}
		default:
			return val;
	}
}

/**
 * @enum */
var ArgType = {
	
	/**
	 * false, 0, null, undefined, '0', and 'false' (case-insensitive) become false.
	 * Anything else, including empty string becomes true.
	 * Empty string is true because attributes with no value should be evaulated as true. */
	Bool: 'Bool',
	
	Int: 'Int',
	Float: 'Float',
	String: 'String',
	
	/**
	 * Parse the string value as JSON.
	 * If it's not parsable, return the value as a string. */
	JSON: 'JSON',
	
	/**
	 * Evaluate the string as JavaScript using the eval() function.
	 * If it can't be evaluated, return the original string. */
	Eval: 'Eval'
}
export {ArgType};
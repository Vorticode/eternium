export default class MultiValueMap {

	/** @type {Object<string, Set>} */
	data = {};

	// Set a new value for a key
	add(key, value) {
		let data = this.data;
		let set = data[key]
		if (!set) {
			set = new Set();
			data[key] = set;
		}
		set.add(value);
	}

	// Get all values for a key
	getAll(key) {
		return this.data[key] || [];
	}

	// Remove one value from a key, and return it
	delete(key, val=undefined) {
		// if (key === '["Html2",[[["Html3",["F1","A"]],["Html3",["F1","B"]]]]]')
		// 	debugger;
			
		let data = this.data;
		// The partialUpdate benchmark shows having this check first makes the function slightly faster.
		// if (!data.hasOwnProperty(key))
		// 	return undefined;

		// Delete a specific value.
		let result;
		let set = data[key];
		if (!set) // slower than pre-check.
		 	return undefined;

		if (val !== undefined) {
			set.delete(val);
			result = val;
		}

		// Delete any value.
		else {
			result = set.values().next().value;
			// [result] = set; // Does the same as above. is about the same speed?
			set.delete(result);
		}

		// TODO: Will this make it slower?
		if (set.size === 0)
			delete data[key];
		
		return result;
	}

	hasValue(val) {
		let data = this.data;
		let names = [];
		for (let name in data)
			if (data[name].has(val)) // TODO: iterate twice to pre-size array?
				names.push(name)
		return names;
	}
}
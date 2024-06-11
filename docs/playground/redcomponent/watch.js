/**
 * Tools for watch variables and performing precise renders.
 */
import {assert} from "../util/Errors.js";
import delve from "../util/delve.js";
import {getObjectHash, getObjectId} from "./hash.js";
import MultiValueMap from "./MultiValueMap.js";
import NodeGroupManager, {LoopInfo} from "./NodeGroupManager.js";
import Template from "./Template.js";


/**
 * Stores info how to transform a path to a template. */
export class TransformerInfo {
	constructor(path, transformer, hash) {
		this.path = path;
		this.transformer = transformer;
		this.hash = hash;
	}
}


/**
 * Maps an object path to the function that converts it to a Template.
 * Once it's convert to a template, we can get the hash of that Tempate.
 * Then that hash tells us what NodeGroups are affected by the object.
 *
 * We store the function to get the Template, instead of the Template itself,
 * so we can call that function again when the object has a new value.
 * @type {MultiValueMap<Object, function(...Object):Template>} */
let pathToTransformer = new MultiValueMap(); // uses a Set() for each value.
export {pathToTransformer}



/**
 * Watch the given properties on obj and call obj.render() when any of them are changed.
 * @param obj {Object}
 * @param props {string[]} */
export function renderWhenChanged(obj, ...props) {

}

/**
 *
 * @param objectPaths {(*|function)[]}
 * @returns {Template} */
export function watchGet(...objectPaths) {
	
	/** @type {function} */
	let transformer = objectPaths.at(-1);
	let paths;
	if (typeof transformer === 'function') {
		paths = objectPaths.slice(0, -1);
	}

	// No transformer provided, so we create our own.
	else if (objectPaths.length === 1) {
		paths = [objectPaths[0].slice(0, -1)];
		let prop = objectPaths[0].at(-1);
		transformer = (...args) => (args[0][prop])
	}

	
	// Save arguments used to call the template, so we can call it again when those args have their values change.
	let args = [];
	for (let path of paths) {


		let obj = delve(watchSet(path[0]), path.slice(1));
		args.push(obj);
	}
	
	let template = transformer(...args);
	
	// If the result isn't a Template, convert the function to return a Template that wraps the result.
	// This way NodeGroupManager.findAndDelete() can find a NodeGroup that matches this Template's hash.
	if (!(template instanceof Template)) {
		let oldToTemplate = transformer;
		transformer = function() {
			return new Template(['', ''], [oldToTemplate(...arguments)]);
		}
		template = transformer(...args);
	}
	
	// Map the object paths to the function that creates a template.
	let hash = getObjectHash(template);
	for (let path of paths) {
		let serializedPath = serializePath(path);
		pathToTransformer.add(serializedPath, new TransformerInfo(path, transformer, hash)); // Uses a Set() to ensure no duplicates.
	}

	return template;
}

//let proxyCache = new WeakMap();


/**
 * Set the value of a variable in a way that's watched, so later when we call .renderWatched()
 * We can find what NodeGroups to update.*/
export function watchSet(obj) {
	if (obj?.$isProxy===true)
		return obj; // It's already a Proxy.

	// This cache doesn't make things faster.
	// let result = proxyCache.get(obj);
	// if (!result) {
	// 	result = new Proxy(obj, new ProxyHandler(obj));
	// 	proxyCache.set(obj, result);
	// }
	// return result;
	return new Proxy(obj, new ProxyHandler(obj));
}

/**
 * Loop over each item and apply watchGet() to each item.
 * @param arrayPath {*[]}
 * @param callback {function(obj:Object, index:int):Template}
 * @returns {Template} */
export function forEach(arrayPath, callback) {
	let array = delve(arrayPath[0], arrayPath.slice(1));

	// This is retrieved on the 'insert' path inside renderWatched()
	let ngm = NodeGroupManager.get(arrayPath[0]);
	if (ngm.clearSubscribers) {
		ngm.clearSubscribers = false;
		ngm.pathToLoopInfo = new MultiValueMap();
	} // TODO: Move tis into NodeGroupMAnager.get() without breaking things?


	let newItems = [...array.map((item, i) => {
			// TODO: This needs to wrap callback so we can pass it the index also.
			return watchGet([...arrayPath, i], callback); // calls callback(array[i], i)
		})
	];

	// We return a template that wraps the array
	// So that NodeGroup.applyOneExpr can set the ExprPath and nextSibling on the template.
	// Then the 'insert' path in renderWatched() uses that data fora dding more nodes.
	let result = new Template(['', ''], [newItems])


	// We get a unique hash for each foreach template because the [''] array is unique each time.
	let loopInfo = new LoopInfo(result, callback);
	ngm.pathToLoopInfo.add(serializePath(arrayPath), loopInfo);
	return result;
}

export function serializePath(path) {
	// Convert any array indices to strings, so serialized comparisons work.
	return JSON.stringify([getObjectId(path[0]), ...path.slice(1).map(item => item+'')])

}


/**
 * When an object property is accessed, a new Proxy with a new instance of this handler class is created,
 * but it tracks the path from the root to the property.
 * That way when a property is set, it can report the changed path. */
class ProxyHandler {
	
	/**
	 * @param root An element managed by a NodeGroupManager.  The same as the NodeGroupManager's rootEl.
	 * @param path {string[]} Used internally. */
	constructor(root, path=[]) {
		/*#IFDEV*/assert(NodeGroupManager.get(root))/*#ENDIF*/
		this.root = root;
		this.path = path; // path from root to this Proxy.
	}

	/**
	 * @param obj {Object}
	 * @param prop {string} */
	get(obj, prop) {
		
		// Special props.  Currently unused.
		// if (prop === '$path')
		// 	return this.path;
		// if (prop === '$root')
		// 	return this.root;
		if (prop === '$isProxy')
		 	return true;
		
		
		// 1. Array.splice()
		if (prop === 'splice' && Array.isArray(obj)) {
			return (index, deleteCount, ...items) => {
				let ngm = NodeGroupManager.get(this.root)

				if (deleteCount) {

					// Get the hash of each object along the delete range.  The process to get the hash is:
					// Serialized Path -> transformer -> Template -> hash.
					let hashes = [];
					for (let i=index; i<index+deleteCount; i++) {
						let serializedPath = serializePath([this.root, ...this.path, i+'']);

						let obj = delve(this.root, [...this.path, i])
						for (let transformerInfo of pathToTransformer.getAll(serializedPath)) {
							let template = transformerInfo.transformer(obj);
							let hash = getObjectHash(template);
							hashes.push(hash); // Hashes may go to nodes in more than one loop.
						}
					}

					ngm.changes.push(new Change('delete', this.root, [...this.path, index+''], hashes));
				}

				//let oldArray = [...obj];
				let result = obj.splice(index, deleteCount);

				// Inserting
				if (items.length) {

					let beforeNgs;
					for (let loopInfo of ngm.getLoopInfo([this.root, ...this.path])) {
						let beforeObj = delve(this.root, [...this.path, index]);

						// Find where to insert before.
						if (beforeObj) {
							let beforeTemplate = loopInfo.itemTransformer(beforeObj);
							let beforeHash = getObjectHash(beforeTemplate);
							beforeNgs = ngm.nodeGroupsAvailable.data[beforeHash];

							if (beforeNgs) {
								let hash = getObjectHash(loopInfo.template)
								let loopNgs = ngm.nodeGroupsAvailable.data[hash] || [];
								for (let loopNg of loopNgs)
									for (let beforeNg of beforeNgs)
										if (beforeNg.startNode.parentNode === loopNg.startNode.parentNode)
											ngm.changes.push(new Change('insert', this.root, [...this.path, index + ''], items, beforeTemplate));
							}
						}
						if (!beforeNgs)
							ngm.changes.push(new Change('insert', this.root, [...this.path, index + ''], items));
					}
					obj.splice(index, 0, ...items);
				}
				return result;
			}
		}
		


		// 2.  Get property
		// If we're getting an object or array property, apply watch() to it recursively.
		let result = Reflect.get(obj, prop)
		if (result && typeof result === 'object') {
			let handler = new ProxyHandler(this.root, [...this.path, prop]); // same root, one level deeper on the path.
			return new Proxy(result, handler);
		}

		return result;
	}


	set(obj, prop, newValue) {
		let ngm = NodeGroupManager.get(this.root);
		ngm.changes.push(new Change('set', this.root, [...this.path, prop], newValue));
		return Reflect.set(obj, prop, newValue)
	}
}


/**
 *
 */
class Change {
	
	/**
	 * @param action {string}
	 * @param root {Object|Array}
	 * @param path {string[]}
	 * @param value
	 *	 If setting a value, this is the new value.
	 *	 If deleting from an array, this is an array of all the NodeGroups to delete.
	 *
	 * @param beforeTemplate
	 * */
	constructor(action, root, path, value, beforeTemplate=null) {
		this.action = action;

		// TODO: Store root as first item of path, to be consistent with code elsewhere.
		this.root = root;
		this.path = path;
		this.value = value;
		this.beforeTemplate = beforeTemplate;

		/** @type {TransformerInfo[]} */
		this.transformerInfo = [];

		// Traverse up the path.
		for (let i=this.path.length; i>0; i--) {
			let path = this.path.slice(0, i);
			let fullPath = [this.root, ...path];

			let serializedPath = getObjectHash(fullPath); // TODO: Why not serializedPath() ?
			this.transformerInfo.push(...pathToTransformer.getAll(serializedPath))
		}
	}
}
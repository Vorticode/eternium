import {assert} from "../util/Errors.js";
import {getObjectId} from "./hash.js";
import NodeGroupManager from "./NodeGroupManager.js";
import Template from "./Template.js";
import {serializePath} from "./watch.js";
import delve from "../util/delve.js";

let logGets = false;
let gets = [];
export {logGets, gets}

let withinSet = 0;

/**
 * Turn the props on obj into JavasCript properties that return Proxies when accessed.
 * If called more than once, return the already-converted object.
 * @param obj {Object}
 * @param props {string}
 * @returns {*|{$proxyHandler}}
 */
export function watch(obj, ...props) {
	
	if (props.length) {
		let internalProps = {};
		for (let prop of props) {
			internalProps[prop] = obj[prop];
			Object.defineProperty(obj, prop, {
				get() {
					return new Proxy(obj, new ProxyHandler(obj, [], internalProps))[prop];
				},
				set(value) {
					return watch(this)[prop] = value;
				}
			});
		}
		return;
	}
	
	
	if (obj?.$proxyHandler)
		return obj; // It's already a Proxy.
	
	// This cache doesn't make things faster.
	// But could it save memory?
	// let result = proxyCache.get(obj);
	// if (!result) {
	// 	result = new Proxy(obj, new ProxyHandler(obj));
	// 	proxyCache.set(obj, result);
	// }
	// return result;
	/*#IFDEV*/assert(!obj.$proxyHandler);/*#ENDIF*/
	return new Proxy(obj, new ProxyHandler(obj));
}

/**
 * Provides methods used when a Proxied version of a property is accessed on an object returned by watch() */
class ProxyHandler {
	
	serializedPath;
	
	/**
	 * @param root An element managed by a NodeGroupManager.  The same as the NodeGroupManager's rootEl.
	 * @param path {string[]} Used internally.
	 * @param props */
	constructor(root, path=[], props=null) {
		/*#IFDEV*/assert(NodeGroupManager.get(root))/*#ENDIF*/
		this.root = root;
		this.path = path; // path from root to this Proxy.
		this.props = props;
	}
	
	/**
	 * Get the full path to this property from the root watched object.
	 * @param atIndex
	 * @returns {string} */
	getSerializedPath(atIndex=null) {
		if (!this.serializedPath)
			this.serializedPath = JSON.stringify([getObjectId(this.root), ...this.path.map(item => item + '')])
			
		if (atIndex!== null)
			return this.serializedPath.slice(0, -1) + ',"' + atIndex + '"]';
		return this.serializedPath;
	}
	
	/**
	 * Return a ProxyHandler for a property one level deeper at pathItem.
	 * @param pathItem {string}
	 * @returns {ProxyHandler} */
	extend(pathItem) {
		pathItem += '';
		assert(!this.root.$proxyHandler)
		let result = new ProxyHandler(this.root, [...this.path, pathItem], this.props);
		if (this.serializedPath)
			result.serializedPath = this.getSerializedPath(pathItem);
		
		return result;
	}
	
	/**
	 * Called directly by JavaScript when accessing the value of a property.
	 * @param obj {Object}
	 * @param prop {string} */
	get(obj, prop) {
		
		// 1.  Special props.
		if (prop === '$proxyHandler')
			return this;
		else if (prop === '$removeProxy')
			return delve(this.props || this.root, this.path);
		
		// 2. Array functions.
		else if (prop === 'map' && Array.isArray(obj)) {
			
			let ngm = NodeGroupManager.get(this.root);
			ngm.clearSubscribersIfNeeded();
			
			return callback => {
				let loopInfo;
				
				let children = [];
				let transformer = obj => {
					let templates = [];
					
					for (let i = 0; i < obj.length; i++) {

						// Watch obj[i].
						let handler = this.extend(i);
						let item = obj[i];
						if (!item.$proxyHandler)
							item = new Proxy(item, handler);

						let template = callback(item, i, obj);
						templates.push(template);

						// If the loop is re-evaluted via Set() then we add duplicate TemplateInfo's
						//if (!withinSet) {
							let spath = this.getSerializedPath(i);
							let subscriber = new Subscriber(callback, template);
							subscriber.parent = loopInfo;
							ngm.subscribers.add(spath, subscriber);
							children.push([spath, subscriber]);
						//}
					}
					
					// A parent Template that surrounds all the items in the loop.
					// This lets us get template.nodeGroup.endNode so we can insertBefore().
					return new Template(['', ''], [templates]);
				}

				if (!withinSet)
					loopInfo = new Subscriber(transformer, null, callback);
				let wholeLoopTemplate = transformer(obj);
				if (!withinSet) {
					loopInfo.template = wholeLoopTemplate;
					loopInfo.children = children;
					ngm.subscribers.add(this.getSerializedPath(), loopInfo);
				}
				return wholeLoopTemplate;
			}
		}

		else if ((prop ==='splice' || prop === 'fastSplice') && Array.isArray(obj)) {
			let ngm = NodeGroupManager.get(this.root);
			return (index, deleteCount, ...items) => {
				let diff = items.length - deleteCount;
                let objLength = obj.length;
				
				// Delete
				if (deleteCount) {
					for (let i=index; i<index+deleteCount; i++) {
						
						// Update pathToTemplates
						let spath = this.getSerializedPath(i);
						
						// Delete nodes of associated NodeGroups.
						for (let subscriber of ngm.subscribers.data[spath] || []) {
							let ng = subscriber.template.nodeGroup;
							for (let node of ng.getNodes())
								node.remove();
							
							// Delete NodeGroup from NodeGroupManager.
							ngm.nodeGroupsAvailable.delete(ng.exactKey, ng);
						}
						
						delete ngm.subscribers.data[spath]; // Deletes templates associated with every loop where this is used.
					}
				}
				
				// Update indices of subsequent items.
				if (diff) {
					let loopPath = this.getSerializedPath();
					let loopInfo = [...ngm.subscribers.getAll(loopPath)][0]; // TODO: Handle multiple loops.
					
					let move = (oldIndex) => {
                        let newIndex = oldIndex+diff;
						let oldPath = this.getSerializedPath(oldIndex);
						let newPath = this.getSerializedPath(newIndex);

						let subscribers = ngm.subscribers.data[oldPath];
						delete ngm.subscribers.data[oldPath]; // TODO: Some can be overwritten w/o being deleted?
						ngm.subscribers.data[newPath] = subscribers;

						
						// Update associated NodeGroups by passing them newIndex.
						// This is unnecessary for most loops since they don't use the index.
						// fastSplice skips this path, it skips updating item indices.
						if (prop === 'splice') {
							let array = delve(this.root, this.path)
							for (let subscriber of subscribers) {
								let ng = subscriber.template.nodeGroup;
								
								let item = array[oldIndex];

								//assert(!item.$proxyHandler)
								let proxyItem = getProxy(item, this, this.path, newIndex); //new Proxy(item, this.extend(newIndex));
								let exprs = loopInfo.itemTransformer(proxyItem, newIndex).exprs; // TODO: Pass updated array as third argument to transformer.
								ng.applyExprs(exprs); // this is the slow part.
							}
						}
					}
					
					// Iterate in different directions depending on whether diff is positive or negative.
					if (diff > 0) // Moving items to the right, so we iterate backward from the end.
						for (let i = objLength-1; i >= index + items.length + deleteCount; i--)
							move(i);

					else // Moving items to the left, so we iterate forward.
						for (let i = index + items.length + deleteCount; i < objLength; i++)
							move(i);
				}
				
				
				// Add new items
				if (items.length) {
					let loopPath = this.getSerializedPath();
					
					let beforePath = this.getSerializedPath(index);
					let ngm = NodeGroupManager.get(this.root);
					
					for (let loopInfo of ngm.subscribers.getAll(loopPath)) {
						let beforeNodes = index < objLength - deleteCount
							? [...ngm.subscribers.getAll(beforePath)].map(t => t.template.nodeGroup.startNode)
							: [loopInfo.template.nodeGroup.endNode]
						for (let beforeNode of beforeNodes) { // TODO: Need to match the beforeNg with the loopInfo instead of iterating.
							for (let i = 0; i < items.length; i++) {
								
								// Create NodeGroup of new item.
								let itemHandler = this.extend(index + i);
								assert(!items[i].$proxyHandler)
								let proxyItem = new Proxy(items[i], itemHandler);
								let template = loopInfo.itemTransformer(proxyItem);
								let ng = ngm.getNodeGroup(template, null, true);
								
								
								for (let node of ng.getNodes()) {
									beforeNode.parentNode.insertBefore(node, beforeNode);
									//loopInfo.template.nodeGroup.endNode = node; // The loop's end node is actually an empty text node, so don't do this.
								}
								
								
								// Add new items to ngm.templateInfo
								let spath = itemHandler.getSerializedPath();
								let subscriber = new Subscriber(loopInfo.itemTransformer, template);
								subscriber.parent = loopInfo;
								ngm.subscribers.add(spath, subscriber);
							}
						}
						loopInfo.template.nodeGroup.parentPath.clearNodesCache();
						loopInfo.template.nodeGroup.nodesCache = null;
					}
				}
				
				let result = obj.splice(index, deleteCount, ...items);
				
				//this.notify(this.path);
				
				return result;
			}
		}

		// Allow these functions to use proxied objects as arguments.
		else if (prop ==='indexOf' && Array.isArray(obj)) {
			return item => {
				return obj.indexOf(item.$removeProxy || item)
			}
		}

		// 3.  Get property
		else {

			let obj2 = obj === this.root && this.props ? this.props : obj;
			let result = Reflect.get(obj2, prop);

			// This is read by watchFunction() which is called in NodeGroup.applyOneExpr().
			// It's used to see what variables contribute to an expression.
			if (logGets)
				gets.push([this.root, ...this.path, prop]);

			// If we're getting an object or array property, apply watch() to it recursively.
			if (result && typeof result === 'object') {
				let handler = this.extend(prop); // same root, one level deeper on the path.
				/*#IFDEV*/assert(!result.$proxyHandler)/*#ENDIF*/
				return new Proxy(result, handler);
			}

			return result;
		}
	}
	
	
	/**
	 * Called directly by JavaScript when setting the value of a property via equals.
	 * @param obj
	 * @param prop
	 * @param value
	 * @returns {boolean} */
	set(obj, prop, value) {
		withinSet++;

		let obj2 = obj === this.root && this.props ? this.props : obj;
		let result = Reflect.set(obj2, prop, value);
		let fullPath = [...this.path, prop+''];
		this.notify(fullPath);
		
		withinSet --;

		return result;
	}
	
	/**
	 * Find every subscriber for fullPath, and above, and call applyExprs() for it.
	 * @param fullPath {string[]}
	 * @param excluded {Set} */
	notify(fullPath, excluded = new Set()) {
		
		// Traverse upward through the path, looking for pathToTemplates.
		let ngm = NodeGroupManager.get(this.root);
		
		let rootHash = getObjectId(this.root);
	
		let len = fullPath.length;
		while (len >= 1) {
			let path = fullPath.slice(0, len);
			let val = delve(this.root, path);
			let serializedPath = JSON.stringify([rootHash, ...path]);
			for (let subscriber of ngm.subscribers.getAll(serializedPath)) {
				// We already applied expressions for a single item within this loop.
				if (excluded.has(subscriber))
					continue;
				
				
				// Delete child subscriptions so we don't have duplicate subscriptions when we call applyExprs() directly below.
				if (subscriber.children) {
					for (let [spath, childInfo] of subscriber.children)
						ngm.subscribers.delete(spath, childInfo);
					subscriber.children = undefined;
				}

				let proxyVal = getProxy(val, this, path);
				let exprs = subscriber.transformer(proxyVal).exprs; // TODO: Pass updated array as third argument to transformer.
				for (let path of subscriber.template.nodeGroup.paths)
					path.clearNodesCache();
				
				// Apply expressions.
				subscriber.template.nodeGroup.applyExprs(exprs);
				
				// Don't also process parent loop after updating a single item within it.
				if (subscriber.parent)
					excluded.add(subscriber.parent);
			}
			len--;
		}
	}
}

function getProxy(obj, ph, path, path2) {
	if (!obj || !typeof obj !== 'object')
		return obj;
	
	if (obj.$proxyHandler) {
		//#IFDEV
		if (path2)
			path = [...path, path2+''];
		//#ENDIF
		assert(obj.$proxyHandler.root === ph.root && JSON.stringify(obj.$proxyHandler.path) === JSON.stringify(path));
		return obj;
	}
	if (path2)
		path = [...path, path2+''];
	return new Proxy(obj, new ProxyHandler(ph.root, path, ph.props));
}

/**
 * Call a function and record which watched variables it accesess, storing their paths in pathToTemplates.
 * Used by NodeGroup.applyOneExpr().
 * TODO: only allow this to be called once per callback.
 * @param callback {function}
 * @param ngm {NodeGroupManager}
 * @returns {Template} */
export function watchFunction(callback, ngm) {
	ngm.clearSubscribersIfNeeded();
	
	logGets = true;
	
	let transformer = () => new Template(['', ''], [callback()])
	let template = transformer();
	for (let path of gets) {
		let subscriber = new Subscriber(transformer, template);
		ngm.subscribers.add(serializePath(path), subscriber);
	}

	gets = [];
	logGets = false;
	return template;
}

/**
 * Represents a place where nodes will be updated.
 * TODO: Merge this with Template, or ExprPath? */
class Subscriber {
	
	/** @type {Subscriber} Used only for children of a loop. */
	parent;
	
	/** @type {Subscriber[]} TemplateInfo for each child of a loop. */
	children;
	
	/**
	 * @param transformer {function} Function that turns the object at the path into a template.
	 * @param template {Template}
	 * @param itemTransformer {function} If a loop, this transforms each item in the loop. */
	constructor(transformer, template, itemTransformer=null) {
		this.transformer = transformer;
		this.template = template;
		
		// Used only for loops
		this.itemTransformer = itemTransformer;
	}
}

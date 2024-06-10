import {assert} from "../util/Errors.js";
import delve from "../util/delve.js";
import {getObjectId} from "./hash.js";
import NodeGroup from "./NodeGroup.js";
import {div, findArrayDiff, setIndent} from "./Util.js";

/**
 * Path to where an expression should be evaluated within a Shell.
 * Path is only valid until the expressions before it are evaluated.
 * TODO: Make this based on parent and node instead of path? */
export default class ExprPath {

	/**
	 * @type {PathType} */
	type;

	// Used for attributes:

	/** @type {?string} Used only if type=AttribType.Value. */
	attrName;

	/**
	 * @type {?string[]} Used only if type=AttribType.Value. If null, use one expr to set the whole attribute value. */
	attrValue;

	/**
	 * @type {Set<string>} Used for type=AttribType.Multiple to remember the attributes that were added. */
	attrNames;



	/**
	 * @type {Node} Node that occurs before this ExprPath's first Node.
	 * This is necessary because udomdiff() can steal nodes from another ExprPath.
	 * If we had a pointer to our own startNode then that node could be moved somewhere else w/o us knowing it.
	 * Used only for type='content'
	 * Will be null if ExprPath has no Nodes. */
	nodeBefore;

	/**
	 * If type is AttribType.Multiple or AttribType.Value, points to the node having the attribute.
	 * If type is 'content', points to a node that never changes that this NodeGroup should always insert its nodes before.
	 *	 An empty text node will be created to insertBefore if there's no other NodeMarker and this isn't at the last position.
	 * @type {Node|HTMLElement} */
	nodeMarker;

	/** @deprecated */
	get parentNode() {
		return this.nodeMarker.parentNode;
	}

	// These are set after an expression is assigned:


	/** @type {NodeGroup} */
	parentNg;

	/** @type {NodeGroup[]} */
	nodeGroups = [];




	// Caches to make things faster

	/**
	 * @private
	 * @type {Node[]} Cached result of getNodes() */
	nodesCache;

	// What are these?
	nodeBeforeIndex;
	nodeMarkerPath;

    // TODO: Keep this cached?
    expr;

    // for debugging
	//#IFDEV
    parentIndex;
	//#ENDIF

	/**
	 * @param nodeBefore {Node}
	 * @param nodeMarker {?Node}
	 * @param type {string}
	 * @param attrName {?string}
	 * @param attrValue {string[]} */
	constructor(nodeBefore, nodeMarker, type=PathType.Content, attrName=null, attrValue=null) {

		//#IFDEV
		/*
		Object.defineProperty(this, 'debug', {
			get() {
				return [
					`parentNode: ${this.nodeBefore.parentNode?.tagName?.toLowerCase()}`,
					'nodes:',
					...setIndent(this.getNodes().map(item => {
						if (item instanceof Node)
							return item.outerHTML || item.textContent
						else if (item instanceof NodeGroup)
							return item.debug
					}), 1).flat()
				]
			}
		})

		Object.defineProperty(this, 'debugNodes', {
			get: () =>
				this.getNodes()
		})
		*/
		//#ENDIF

		// If path is a node.
		this.nodeBefore = nodeBefore;
		this.nodeMarker = nodeMarker;
		this.type = type;
		this.attrName = attrName;
		this.attrValue = attrValue;
		if (type === PathType.Multiple)
			this.attrNames = new Set();
	}

	applyMultipleAttribs(node, expr) {
		/*#IFDEV*/assert(this.type === PathType.Multiple);/*#ENDIF*/

		if (Array.isArray(expr))
			expr = expr.flat().join(' ');  // flat and join so we can accept arrays of arrays of strings.

		// Add new attributes
		let oldNames = this.attrNames;
		this.attrNames = new Set();
		if (expr) {
			let attrs = (expr +'') // Split string into multiple attributes.
				.split(/([\w-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s]+))/g)
				.map(text => text.trim())
				.filter(text => text.length);

			for (let attr of attrs) {
				let [name, value] = attr.split(/\s*=\s*/); // split on first equals.
				value = (value || '').replace(/^(['"])(.*)\1$/, '$2'); // trim value quotes if they match.
				node.setAttribute(name, value);
				this.attrNames.add(name)
			}
		}

		// Remove old attributes.
		for (let oldName of oldNames)
			if (!this.attrNames.has(oldName))
				node.removeAttribute(oldName);
	}

	/**
	 * Handle attributes for event binding, such as:
	 * onclick=${(e, el) => this.doSomething(el, 'meow')}
	 * onclick=${[this.doSomething, 'meow']}
	 * onclick=${[this, 'doSomething', 'meow']}
	 *
	 * @param node
	 * @param expr
	 * @param root */
	applyEventAttrib(node, expr, root) {
		/*#IFDEV*/assert(this.type === PathType.Value || this.type === PathType.Component);/*#ENDIF*/

		let eventName = this.attrName.slice(2);
		let func;

		// Convert array to function.
		// TODO: This doesn't work for [this, 'doSomething', 'meow']
		let args = [];
		if (Array.isArray(expr)) {
			for (let i=0; i<expr.length; i++)
				if (typeof expr[i] === 'function') {
					func = expr[i];
					args = expr.slice(i+1);
					break;
				}

			// oninput=${[this, 'value']}
			if (!func) {
				func = setValue
				args = [expr[0], expr.slice(1), node]
				node.value = delve(expr[0], expr.slice(1))
			}
		}
		else
			func = expr;

		let eventKey = getObjectId(node) + eventName;
		let [existing, existingBound] = nodeEvents[eventKey] || [];
		nodeEventArgs[eventKey] = args; // TODO: Put this in nodeEvents[]


		if (existing !== func) {
			if (existing)
				node.removeEventListener(eventName, existingBound);

			let originalFunc = func;

			// BoundFunc sets the "this" variable to be the current Red component.
			let boundFunc = event => originalFunc.call(root, ...args, event, node);

			// Save both the original and bound functions.
			// Original so we can compare it against a newly assigned function.
			// Bound so we can use it with removeEventListner().
			nodeEvents[eventKey] = [originalFunc, boundFunc];

			node.addEventListener(eventName, boundFunc);

			// TODO: classic event attribs:
			//el[attr.name] = e => // e.g. el.onclick = ...
			//	(new Function('event', 'el', attr.value)).bind(this.manager.rootEl)(e, el) // put "event", "el", and "this" in scope for the event code.
		}
	}

	applyValueAttrib(node, exprs, exprIndex) {
		let expr = exprs[exprIndex];
		
		// Array for form element data binding.
		// TODO: This never worked, and was moved to applyEventAttrib.
		// let isArrayValue = Array.isArray(expr);
		// if (isArrayValue && expr.length >= 2 && !expr.slice(1).find(v => !['string', 'number'].includes(typeof v))) {
		// 	node.value = delve(expr[0], expr.slice(1));
		// 	node.addEventListener('input', e => {
		// 		delve(expr[0], expr.slice(1), node.value) // TODO: support other properties like checked
		// 	});
		// }

		// Values to toggle an attribute
		if (!this.attrValue && (expr === false || expr === null || expr === undefined))
			node.removeAttribute(this.attrName);
		
		else if (!this.attrValue && expr === true)
			node.setAttribute(this.attrName, '');

		// Regular attribute
		else {
			let value = [];

			// We go backward because NodeGroup.applyExprs() calls this function, and it goes backward through the exprs.
			if (this.attrValue) {
				for (let i=this.attrValue.length-1; i>=0; i--) {
					value.unshift(this.attrValue[i]);
					if (i > 0) {
						let val = exprs[exprIndex];
						if (val !== false && val !== null && val !== undefined)
							value.unshift(val);
						exprIndex--;
					}
				}

				exprIndex ++;
			}
			else
				value.unshift(expr);

			let joinedValue = value.join('')
			node.setAttribute(this.attrName, joinedValue);

			// This is needed for setting input.value, .checked, option.selected, etc.
			// But in some cases setting the attribute is enough.  such as div.setAttribute('title') updates div.title.
			// TODO: How to tell which is which?
			if (this.attrName in node)
				node[this.attrName] = joinedValue;

		}

		return exprIndex;
	}


	/**
	 *
	 * @param newRoot {HTMLElement}
	 * @return {ExprPath} */
	clone(newRoot) {
		/*#IFDEV*/this.verify();/*#ENDIF*/

        // Resolve node paths.
		let nodeMarker, nodeBefore;
        let root = newRoot;
        let path = this.nodeMarkerPath;
        for (let i=path.length-1; i>0; i--)
            root = root.childNodes[path[i]];
		let childNodes = root.childNodes;
        nodeMarker = childNodes[path[0]]
        if (this.nodeBefore)
            nodeBefore = childNodes[this.nodeBeforeIndex];

		let result = new ExprPath(nodeBefore, nodeMarker, this.type, this.attrName, this.attrValue);

		//#IFDEV
		result.verify();
		result.parentIndex = this.parentIndex; // used for debugging?
		//#ENDIF

		return result;
	}
	
	/**
	 * Clear the nodeCache of this ExprPath, as well as all parent and child ExprPaths that
	 * share the same DOM parent node.
	 *
	 * TODO: Is recursive clearing ever necessary?
	 */
	clearNodesCache() {
		let path = this;
		
		// Clear cache parent ExprPaths that have the same parentNode
		let parentNode = this.parentNode;
		while (path && path.parentNode === parentNode) {
			path.nodesCache = null;
			path = path.parentNg?.parentPath
			
			// If stuck in an infinite loop here, the problem is likely due to Template hash colisions.
			// Which cause one path to be the descendant of itself, creating a cycle.
		}
		
		function clearChildNodeCache(path) {
			
			// Clear cache of child ExprPaths that have the same parentNode
			for (let ng of path.nodeGroups) {
				if (ng) // Can be null from applyOneExpr()'s push(null) call.
					for (let path2 of ng.paths) {
						if (path2.type === PathType.Content && path2.parentNode === parentNode) {
							path2.nodesCache = null;
							clearChildNodeCache(path2);
						}
					}
			}
		}
		
		clearChildNodeCache(this);
	}


	/**
	 * Attempt to remove all of this ExprPath's nodes from the DOM, if it can be done using a special fast method.
	 * @returns {boolean} Returns false if Nodes werne't removed, and they should instead be removed manually. */
	fastClear() {
		let parent = this.nodeBefore.parentNode;
		if (this.nodeBefore === parent.firstChild && this.nodeMarker === parent.lastChild) {

			// If parent is the only child of the grandparent, replace the whole parent.
			// And if it has no siblings, it's not created by a NodeGroup/path.
			let grandparent = parent.parentNode
			if (grandparent && parent === grandparent.firstChild && parent === grandparent.lastChild && !parent.hasAttribute('id')) {
				let replacement = document.createElement(parent.tagName)
				replacement.append(this.nodeBefore, this.nodeMarker)
				for (let attrib of parent.attributes)
					replacement.setAttribute(attrib.name, attrib.value)
				parent.replaceWith(replacement)
			}
			else {
				parent.innerHTML = ''; // Faster than calling .removeChild() a thousand times.
				parent.append(this.nodeBefore, this.nodeMarker)
			}
			return true;
		}
		return false;
	}
	
	/**
	 * @return {(Node|HTMLElement)[]} */
	getNodes() {
		
		// Why doesn't this work?
		// let result2 = [];
		// for (let ng of this.nodeGroups)
		// 	result2.push(...ng.getNodes())
		// return result2;
		
		
		let result

		// This shaves about 5ms off the partialUpdate benchmark.
		/*result = this.nodesCache;
		if (result) {
			
			//#IFDEV
			this.checkNodesCache();
			//#ENDIF
			
			return result
		}*/

		result = [];
		let current = this.nodeBefore.nextSibling;
		let nodeMarker = this.nodeMarker;
		while (current && current !== nodeMarker) {
			result.push(current)
			current = current.nextSibling
		}

		this.nodesCache = result;
		return result;
	}

	getParentNode() { // Same as this.parentNode
		return this.nodeMarker.parentNode
	}
	
	removeNodeGroup(ng) {
		let idx = this.nodeGroups.indexOf(ng);
		/*#IFDEV*/assert(idx !== -1);/*#ENDIF*/
		this.nodeGroups.splice(idx);
		ng.parentPath = null;
		this.clearNodesCache();
	}

	//#IFDEV
	
	get debug() {
		return [
			`parentNode: ${this.nodeBefore.parentNode?.tagName?.toLowerCase()}`,
			'nodes:',
			...setIndent(this.getNodes().map(item => {
				if (item instanceof Node)
					return item.outerHTML || item.textContent
				else if (item instanceof NodeGroup)
					return item.debug
			}), 1).flat()
		]
	}
	
	get debugNodes() {
		// Clear nodesCache so that getNodes() manually gets the nodes.
		let nc = this.nodesCache;
		this.nodesCache = null;
		let result = this.getNodes()
		this.nodesCache = nc;
		return result;
	}
	
	verify() {
		if (!window.verify)
			return;

		assert(this.type!==PathType.Content || this.nodeBefore)
		assert(this.type!==PathType.Content || this.nodeBefore.parentNode)

		// Need either nodeMarker or parentNode
		assert(this.nodeMarker)

		// nodeMarker must be attached.
		assert(!this.nodeMarker || this.nodeMarker.parentNode)

		// nodeBefore and nodeMarker must have same parent.
		assert(this.type!==PathType.Content || this.nodeBefore.parentNode === this.nodeMarker.parentNode)

		assert(this.nodeBefore !== this.nodeMarker)
		assert(this.type!==PathType.Content|| !this.nodeBefore.parentNode || this.nodeBefore.compareDocumentPosition(this.nodeMarker) === Node.DOCUMENT_POSITION_FOLLOWING)

		// Detect cyclic parent and grandparent references.
		assert(this.parentNg?.parentPath !== this)
		assert(this.parentNg?.parentPath?.parentNg?.parentPath !== this)
		assert(this.parentNg?.parentPath?.parentNg?.parentPath?.parentNg?.parentPath !== this)

		for (let ng of this.nodeGroups)
			ng.verify();

		// Make sure the nodesCache matches the nodes.
		this.checkNodesCache();
	}
	
	checkNodesCache() {
		return;
		
		// Make sure cache is accurate.
		// If this is invalid, then perhaps another component append()'d one of our nodes to itself.
		// Or perhaps one of our nodes is used in an expression more than once.
		// TODO: Find a way to check for and warn when this happens.
		// MutationObserver is too slow since it's asynchronous.
		// My own MutationWatcher has to modify DOM prototypes, which is rather invasive.
		if (this.nodesCache) {
			let nodes = [];
			let current = this.nodeBefore.nextSibling;
			let nodeMarker = this.nodeMarker;
			while (current && current !== nodeMarker) {
				nodes.push(current)
				current = current.nextSibling
			}
			assert(findArrayDiff(this.nodesCache, nodes) === false);
		}
	}
	//#ENDIF
}



/**
 *
 * @param root
 * @param path {string[]}
 * @param node {HTMLElement}
 */
function setValue(root, path, node) {
	let val = node.value;
	if (node.type === 'number')
		val = parseFloat(val);

	delve(root, path, val)
}

/** @enum {string} */
export const PathType = {
	/** Child of a node */
	Content: 'content',
	
	/** One or more whole attributes */
	Multiple: 'attrName',
	
	/** Value of an attribute. */
	Value: 'attrValue',
	
	/** Value of an attribute being passed to a component. */
	Component: 'component',
	
	/** Expressions inside Html comments. */
	Comment: 'comment',
}


/** @return {int[]} Returns indices in reverse order, because doing it that way is faster. */
export function getNodePath(node) {
	let result = [];
	while(true) {
		let parent = node.parentNode
		if (!parent)
			break;
		result.push(Array.prototype.indexOf.call(node.parentNode.childNodes, node))
		node = parent;
	}
	return result;
}

/**
 * Note that the path is backward, with the outermost element at the end.
 * @param root {HTMLElement|Document|DocumentFragment|ParentNode}
 * @param path {int[]}
 * @returns {Node|HTMLElement} */
export function resolveNodePath(root, path) {
	for (let i=path.length-1; i>=0; i--)
		root = root.childNodes[path[i]];
	return root;
}


// TODO: Memory from this is never freed.  Use a WeakMap<Node, Object<eventName:string, function[]>>
let nodeEvents = {};
let nodeEventArgs = {};
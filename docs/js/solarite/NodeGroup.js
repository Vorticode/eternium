import {assert} from "../util/Errors.js";
import ExprPath, {PathType, resolveNodePath} from "./ExprPath.js";
import {getObjectHash} from "./hash.js";
import Shell from "./Shell.js";
import Template from "./Template.js";
import udomdiff from "./udomdiff.js";
import {watchFunction} from './watch2.js';
import Util, {div, findArrayDiff, flattenAndIndent, isEvent, nodeToArrayTree, setIndent} from "./Util.js";
import NodeGroupManager from "./NodeGroupManager.js";

/** @typedef {boolean|string|number|function|Object|Array|Date|Node} Expr */

/**
 * A group of Nodes instantiated from a Shell, with Expr's filled in.
 *
 * The range is determined by startNode and nodeMarker.
 * startNode - never null.  An empty text node is created before the first path if none exists.
 * nodeMarker - null if this Nodegroup is at the end of its parents' nodes.
 *
 *
 * */
export default class NodeGroup {

	/** @Type {NodeGroupManager} */
	manager;

	/** @type {ExprPath} */
	parentPath;

	/** @type {Node} First node of NodeGroup. Should never be null. */
	startNode;

	/** @type {Node} A node that never changes that this NodeGroup should always insert its nodes before.
	 * An empty text node will be created to insertBefore if there's no other NodeMarker and this isn't at the last position.*/
	endNode;

	/** @type {ExprPath[]} */
	paths = [];

	/** @type {string} */
	exactKey;

	/** @type {string} */
	closeKey;

	/** @type {boolean} Used by NodeGroupManager. */
	inUse;


	/**
	 * @internal
	 * @type {Node[]} Cached result of getNodes() used only for improving performance.*/
	nodesCache;

	/**
	 * @type {?Map<HTMLStyleElement, string>} */
	styles;

	/**
	 * If rendering a Template with replaceMode=true, pseudoRoot points to the element where the attributes are rendered.
	 * But pseudoRoot is outside of this.getNodes().
	 * NodeGroupManager.render() copies the attributes from pseudoRoot to the actual web component root element.
	 * @type {?HTMLElement} */
	pseudoRoot;

	currentComponentProps = {};
	

	/**
	 * Create an "instantiated" NodeGroup from a Template and add it to an element.
	 * @param template {Template}  Create it from the html strings and expressions in this template.
	 * @param manager {?NodeGroupManager}
	 * @returns {NodeGroup} */
	constructor(template, manager=null) {

		// Used for forEach()
		this.template = template;
		this.manager = manager;
		
		// new!
		template.nodeGroup = this;

		// Get a cached version of the parsed and instantiated html, and ExprPaths.
		let shell = Shell.get(template.html);

		let fragment = shell.fragment.cloneNode(true);

		// Figure out value of replaceMode option if it isn't set,
		// Assume replaceMode if there's only one child element and its tagname matches the root el.
		let replaceMode = typeof template.replaceMode === 'boolean'
			? template.replaceMode
			: fragment.children.length===1 &&
				fragment.firstElementChild?.tagName.replace(/-REDCOMPONENT-PLACEHOLDER$/, '')
				=== manager?.rootEl?.tagName
		if (replaceMode) {
			this.pseudoRoot = fragment.firstElementChild;
			// if (!manager.rootEl)
			// 	manager.rootEl = this.pseudoRoot;
			/*#IFDEV*/assert(this.pseudoRoot)/*#ENDIF*/
		}

		let childNodes = replaceMode
			? fragment.firstElementChild.childNodes
			: fragment.childNodes;


		this.startNode = childNodes[0]
		this.endNode = childNodes[childNodes.length - 1]


		// Update paths
		for (let oldPath of shell.paths) {
			let path = oldPath.clone(fragment)
			path.parentNg = this;
			this.paths.push(path);
		}
		

		// Update web component placeholders.
		// Ctrl+F "redcomponent-placeholder" in project to find all code that manages subcomponents.
		// Is this list needed at all?
		//for (let component of shell.components)
		//	this.components.push(resolveNodePath(this.startNode.parentNode, getNodePath(component)))

		/*#IFDEV*/this.verify();/*#ENDIF*/

		this.activateEmbeds(fragment, shell);
		
		/*#IFDEV*/
		assert(this.paths.length <= template.exprs.length);
		if (template.exprs.length)
			assert(this.paths.length);
		/*#ENDIF*/

		// Apply exprs
		this.applyExprs(template.exprs);

		/*#IFDEV*/this.verify();/*#ENDIF*/
	}

	activateEmbeds(root, shell) {

		// static components
		// Must happen before ids.
		for (let path of shell.staticComponents) {
			let el = resolveNodePath(root, path)

			// Shell doesn't know if a web component is the pseudoRoot so we have to detect it here.
			if (el.tagName !== this.pseudoRoot?.tagName)
				this.createNewComponent(el)
		}

		if (this.manager.rootEl) {

			// ids
			if (this.manager.options.ids !== false)
				for (let path of shell.ids) {
					let el = resolveNodePath(root, path);
					let id = el.getAttribute('data-id') || el.getAttribute('id')
					this.manager.rootEl[id] = el;
				}

			// styles
			if (this.manager.options.styles !== false) {
				if (shell.styles.length)
					this.styles = new Map();
				for (let path of shell.styles) {
					let style = resolveNodePath(root, path);
					Util.bindStyles(style, this.manager.rootEl);
					this.styles.set(style, style.textContent);
				}

			}
			// scripts
			if (this.manager.options.scripts !== false) {
				for (let path of shell.scripts) {
					let script = resolveNodePath(root, path);
					eval(script.textContent)
				}
			}
		}
	}

	updateStyles() {
		if (this.styles)
			for (let [style, oldText] of this.styles) {
				let newText = style.textContent;
				if (oldText !== newText)
					Util.bindStyles(style, this.manager.rootEl);
			}
	}

	/**
	 * Use the paths to insert the given expressions.
	 * Dispatches expression handling to other functions depending on the path type.
	 * @param exprs {(*|*[]|function|Template)[]} */
	applyExprs(exprs) {
		
		/*#IFDEV*/this.verify();/*#ENDIF*/
		// Update exprs at paths.
		let exprIndex = exprs.length-1, expr, lastNode;

		// We apply them in reverse order so that a <select> box has its options created from an expression
		// before its value attribute is set via an expression.
		for (let path of this.paths.toReversed()) {
			expr = exprs[exprIndex];

			// Nodes
			if (path.type === PathType.Content) {
				this.applyNodeExpr(path, expr);
				/*#IFDEV*/path.verify()/*#ENDIF*/
			}

			// Attributes
			else {
				let node = path.nodeMarker; // path.resolve(result);
				let node2 = (this.manager.rootEl && node === this.pseudoRoot) ? this.manager.rootEl : node;
				/*#IFDEV*/assert(node);/*#ENDIF*/

				// This is necessary both here and below.
				if (lastNode && lastNode !== this.pseudoRoot && lastNode !== node && Object.keys(this.currentComponentProps).length) {
					this.applyComponentExprs(lastNode, this.currentComponentProps);
					this.currentComponentProps = {};
				}

				if (path.type === PathType.Multiple)
					path.applyMultipleAttribs(node2, expr)

				// Capture attribute expressions to later send to the constructor of a web component.
				// Ctrl+F "redcomponent-placeholder" in project to find all code that manages subcomponents.
				else if (path.nodeMarker !== this.pseudoRoot && path.type === PathType.Component)
					this.currentComponentProps[path.attrName] = expr;
				
				else if (path.type === PathType.Comment) {
					// Expressions inside Html comments.  Deliberately empty because we won't waste time updating them.
				}
				else {

					// Event attribute value
					if (path.attrValue===null && (typeof expr === 'function' || Array.isArray(expr)) && isEvent(path.attrName)) {
						let root = this.manager.rootEl || this.startNode.parentNode;  // latter is used when constructing a whole element.
						path.applyEventAttrib(node2, expr, root);
					}

					// Regular attribute value.
					else
						exprIndex = path.applyValueAttrib(node2, exprs, exprIndex);
				}

				lastNode = path.nodeMarker;
			}

			exprIndex--;
		} // end for(path of this.paths)


		// Check again after we iterate through all paths to apply to a component.
		if (lastNode && lastNode !== this.pseudoRoot && Object.keys(this.currentComponentProps).length) {
			this.applyComponentExprs(lastNode, this.currentComponentProps);
			this.currentComponentProps = {};
		}

		this.updateStyles();

		// Invalidate the nodes cache because we just changed it.
		this.nodesCache = null;

		// If there's leftover expressions, there's probably an issue with the Shell that created this NodeGroup,
		// and the number of paths not matching.
		/*#IFDEV*/assert(exprIndex === -1);/*#ENDIF*/


		/*#IFDEV*/this.verify();/*#ENDIF*/
	}

	/**
	 * Insert/replace the nodes created by a single expression.
	 * Called by applyExprs()
	 * This function is recursive, as the functions it calls also call it.
	 * TODO: Move this to ExprPath?
	 * @param path {ExprPath}
	 * @param expr {Expr}
	 * @return {Node[]} New Nodes created. */
	applyNodeExpr(path, expr) {
		/*#IFDEV*/path.verify();/*#ENDIF*/

		/** @type {(Node|NodeGroup|Expr)[]} */
		let newNodes = [];
		let oldNodeGroups = path.nodeGroups;
		/*#IFDEV*/assert(!oldNodeGroups.includes(null))/*#ENDIF*/
		let secondPass = []; // indices

		// First Pass
		//for (let ng of path.nodeGroups) // TODO: Is this necessary?
		//	ng.parentPath = null;
		path.nodeGroups = [];
		this.applyOneExpr(expr, path, newNodes, secondPass);
		this.existingTextNodes = null;

		// TODO: Create an array of old vs Nodes and NodeGroups together.
		// If they're all the same, skip the next steps.
		// Or calculate it in the loop above as we go?  Have a path.lastNodeGroups property?

		// Second pass to find close-match NodeGroups.
		let flatten = false;
		if (secondPass.length) {
			for (let [nodesIndex, ngIndex] of secondPass) {
				let ng = this.manager.getNodeGroup(newNodes[nodesIndex], false);
				
				ng.parentPath = path;
				let ngNodes = ng.getNodes();

				/*#IFDEV*/assert(!(newNodes[nodesIndex] instanceof NodeGroup))/*#ENDIF*/
				
				if (ngNodes.length === 1)
					newNodes[nodesIndex] = ngNodes[0];
				
				else {
					newNodes[nodesIndex] = ngNodes;
					flatten = true;
				}
				path.nodeGroups[ngIndex] = ng;
			}

			if (flatten)
				newNodes = newNodes.flat(); // TODO: Only if second pass happens?
		}

		/*#IFDEV*/assert(!path.nodeGroups.includes(null))/*#ENDIF*/


	
		let oldNodes = path.getNodes();
		path.nodesCache = newNodes; // Replaces value set by path.getNodes()


		// This pre-check makes it a few percent faster?
		let diff = findArrayDiff(oldNodes, newNodes);
		if (diff !== false) {

			if (this.parentPath)
				this.parentPath.clearNodesCache();

			// Fast clear method
			let isNowEmpty = oldNodes.length && !newNodes.length;
			if (!isNowEmpty || !path.fastClear(oldNodes, newNodes))

				// Rearrange nodes.
				udomdiff(path.parentNode, oldNodes, newNodes, path.nodeMarker)

			this.saveOrphans(oldNodeGroups, oldNodes);
		}
		/*#IFDEV*/path.verify();/*#ENDIF*/
	}
	
	/**
	 * Find NodeGroups that had their nodes removed and add those nodes to a Fragment so
	 * they're not lost forever and the NodeGroup's internal structure is still consistent.
	 * Called from NodeGroup.applyNodeExpr().
	 * @param oldNodeGroups {NodeGroup[]}
	 * @param oldNodes {Node[]} */
	saveOrphans(oldNodeGroups, oldNodes) {
		let oldNgMap = new Map();
		for (let ng of oldNodeGroups) {
			oldNgMap.set(ng.startNode, ng)
			
			// TODO: Is this necessary?
			// if (ng.parentPath)
			// 	ng.parentPath.clearNodesCache();
		}

		for (let i=0, node; node = oldNodes[i]; i++) {
			let ng;
			if (!node.parentNode && (ng = oldNgMap.get(node))) {
				let fragment = document.createDocumentFragment();
				let endNode = ng.endNode;
				while (node !== endNode) {
					fragment.append(node)
					i++;
					node = oldNodes[i];
				}
				fragment.append(endNode);
			}
		}
	}

	// TODO: Move to ExprPath?
	applyOneExpr(expr, path, newNodes, secondPass) {
		
		if (expr instanceof Template) {
			expr.parentPath = path;
			expr.nodegroup = this;
			
			//if (window.debug && expr.exprs[0] === 'Banana' && path.nodeGroups.length === 0)
			//if (window.debug && expr.exprs[0] === 'Banana')
			//	debugger;
			
			let ng = this.manager.getNodeGroup(expr, true);
			
			
			if (ng) {
				//#IFDEV
				// Make sure the nodeCache of the ExprPath we took it from is sitll valid.
				if (ng.parentPath)
					ng.parentPath.verify();
				//#ENDIF
				
				
				// TODO: Track ranges of changed nodes and only pass those to udomdiff?
				// But will that break the swap benchmark?
				newNodes.push(...ng.getNodes());
				path.nodeGroups.push(ng);
			}
			
			// If expression, evaluate later to find partial match.
			else {
				secondPass.push([newNodes.length, path.nodeGroups.length])
				newNodes.push(expr)
				path.nodeGroups.push(null); // placeholder
			}
		}

		// Node created by an expression.
		else if (expr instanceof Node) {

			// DocumentFragment created by an expression.
			if (expr instanceof DocumentFragment)
				newNodes.push(...expr.childNodes);
			else
				newNodes.push(expr);
		}

		else if (Array.isArray(expr))
			for (let subExpr of expr)
				this.applyOneExpr(subExpr, path, newNodes, secondPass)

		else if (typeof expr === 'function') {
			expr = watchFunction(expr, this.manager)
			
			this.applyOneExpr(expr, path, newNodes, secondPass)
		}

		// Text
		else {
			// Convert falsy values (but not 0) to empty string.
			// Convert numbers to string so they compare the same.
			let text = (expr === undefined || expr === false || expr === null) ? '' : expr + '';

			// Fast path for updating the text of a single text node.
			let first = path.nodeBefore.nextSibling;
			if (first.nodeType === 3 && first.nextSibling === path.nodeMarker && !newNodes.includes(first)) {
				if (first.textContent !== text)
					first.textContent = text;
				
				newNodes.push(first);
			}

			else {
				// TODO: Optimize this into a Set or Map or something?
				if (!this.existingTextNodes)
					this.existingTextNodes = path.getNodes().filter(n => n.nodeType === 3);
				
				let idx = this.existingTextNodes.findIndex(n => n.textContent === text);
				if (idx !== -1)
					newNodes.push(...this.existingTextNodes.splice(idx, 1))
				else
					newNodes.push(path.parentNode.ownerDocument.createTextNode(text));
			}
		}
	}

	/**
	 * Create a nested RedComponent or call render with the new props.
	 * @param el {Solarite:HTMLElement}
	 * @param props {Object} */
	applyComponentExprs(el, props) {
		
		// TODO: Does a hash of this already exist somewhere?
		// Perhaps if Components were treated as child NodeGroups, which would need to be the child of an ExprPath,
		// then we could re-use the hash and logic from NodeManager?
		let newHash = getObjectHash(props);
		
		let isPreHtmlElement = el.tagName.endsWith('-REDCOMPONENT-PLACEHOLDER');
		let isPreIsElement = el.hasAttribute('_is')
		
		
		// Instantiate a placeholder.
		if (isPreHtmlElement || isPreIsElement)
			el = this.createNewComponent(el, isPreHtmlElement, props);
		
		// Update params of placeholder.
		else if (el.render) {
			let oldHash = componentHash.get(el);
			if (oldHash !== newHash)
				el.render(props); // Pass new values of props to render so it can decide how it wants to respond.
		}
		
		componentHash.set(el, newHash);
	}
	
	/**
	 * We swap the placeholder element for the real element so we can pass its dynamic attributes
	 * to its constructor.
	 *
	 * The logic of this function is complex and could use cleaning up.
	 *
	 * @param el
	 * @param isPreHtmlElement
	 * @param props {Object} Attributes with dynamic values.
	 * @return {HTMLElement} */
	createNewComponent(el, isPreHtmlElement=undefined, props=undefined) {
		if (isPreHtmlElement === undefined)
			isPreHtmlElement = !el.hasAttribute('_is');
		
		let tagName = (isPreHtmlElement
			? el.tagName.endsWith('-REDCOMPONENT-PLACEHOLDER')
				? el.tagName.slice(0, -25)
				: el.tagName
			: el.getAttribute('is')).toLowerCase();

		let dynamicProps = {...(props || {})}
		
		// Pass other attribs to constructor, since otherwise they're not yet set on the element,
		// and the constructor would otherwise have no way to see them.
		if (el.attributes.length) {
			if (!props)
				props = {};
			for (let attrib of el.attributes)
				if (!props.hasOwnProperty(attrib.name))
					props[attrib.name] = attrib.value;
		}
		
		// Create CustomElement and
		let Constructor = customElements.get(tagName);
		if (!Constructor)
			throw new Error(`The custom tag name ${tagName} is not registered.`)

		// We pass the childNodes to the constructor so it can know about them,
		// instead of only afterward when they're appended to the slot below.
		// This is useful for a custom selectbox, for example.
		// NodeGroupManager.pendingChildren stores the childen so the super construtor call to Solarite's constructor
		// can add them as children before the rest of the constructor code executes.
		let ch = [... el.childNodes];
		NodeGroupManager.pendingChildren.push(ch);  // pop() is called in Solarite constructor.
		let newEl = new Constructor(props, ch);

		if (!isPreHtmlElement)
			newEl.setAttribute('is', el.getAttribute('is').toLowerCase())
		el.replaceWith(newEl);
		
		// Set children / slot children
		// TODO: Match named slots.
		// TODO: This only appends to slot if render() is called in the constructor.
		//let slot = newEl.querySelector('slot') || newEl;
		//slot.append(...el.childNodes);
		
		// Copy over event attributes.
		for (let propName in props) {
			let val = props[propName];
			if (propName.startsWith('on') && typeof val === 'function')
				newEl.addEventListener(propName.slice(2), e => val(e, newEl));
		}
		
		// If an id pointed at the placeholder, update it to point to the new element.
		let id = el.getAttribute('data-id') || el.getAttribute('id');
		if (id)
			this.manager.rootEl[id] = newEl;
		
		
		// Update paths to use replaced element.
		for (let path of this.paths) {
			if (path.nodeMarker === el)
				path.nodeMarker = newEl;
			if (path.nodeBefore === el)
				path.nodeBefore = newEl;
		}
		if (this.startNode === el)
			this.startNode = newEl;
		if (this.endNode === el)
			this.endNode = newEl;
		
		
		// applyComponentExprs() is called because we're rendering.
		// So we want to render the sub-component also.
		if (newEl.renderFirstTime)
			newEl.renderFirstTime();
		
		// Copy attributes over.
		for (let attrib of el.attributes)
			if (attrib.name !== '_is')
				newEl.setAttribute(attrib.name, attrib.value);

		// Set dynamic attributes if they are primitive types.
		for (let name in dynamicProps) {
			let val = dynamicProps[name];
			if (typeof val === 'boolean') {
				if (val !== false && val !== undefined && val !== null)
					newEl.setAttribute(name, '');
			}

			// If type isn't an object or array, set the attribute.
			else if (['number', 'bigint', 'string'].includes(typeof val))
				newEl.setAttribute(name, val);
		}
		
		return newEl;
	}

	/**
	 * Get all the nodes inclusive between startNode and endNode.
	 * TODO: when not using nodesCache, could this use less memory with yield?
	 * But we'd need to save the reference to the next Node in case it's removed.
	 * @return {(Node|HTMLElement)[]} */
	getNodes() {
		// applyExprs() invalidates this cache.
		let result = this.nodesCache;
		if (result) // This does speed up the partialUpdate benchmark by 10-15%.
			return result;

		result = [];
		let current = this.startNode
		let afterLast = this.endNode?.nextSibling
		while (current && current !== afterLast) {
			result.push(current)
			current = current.nextSibling
		}

		this.nodesCache = result;
		return result;
	}

	getParentNode() {
		return this.startNode?.parentNode
	}


	//#IFDEV
	/**
	 * @deprecated
	 * An interleaved array of sets of nodes and top-level ExprPaths
	 * @type {(Node|HTMLElement|ExprPath)[]} */
	get nodes() { throw new Error('')};
	
	get debug() {
		return [
			`parentNode: ${this.parentNode?.tagName?.toLowerCase()}`,
			'nodes:',
			...setIndent(this.getNodes().map(item => {
				if (item instanceof Node) {
					
					let tree = nodeToArrayTree(item, nextNode => {
						
						let path = this.paths.find(path=>path.type === PathType.Content && path.getNodes().includes(nextNode));
						if (path)
							return [`Path[${path.parentIndex}].nodes:`]
						
						return [];
					})
					
					// TODO: How to indend nodes belonging to a path vs those that just occur after the path?
					return flattenAndIndent(tree)
				}
				else if (item instanceof ExprPath)
					return setIndent(item.debug, 1)
			}).flat(), 1)
		]
	}

	get debugNodes() { return this.getNodes() }
	
	
	get debugNodesHtml() { return this.getNodes().map(n => n.outerHTML || n.textContent) }
	
	verify() {
		if (!window.verify)
			return;

		assert(this.startNode)
		assert(this.endNode)
		//assert(this.startNode !== this.endNode) // This can be true.
		assert(this.startNode.parentNode === this.endNode.parentNode)

		// Only if connected:
		assert(!this.startNode.parentNode || this.startNode === this.endNode || this.startNode.compareDocumentPosition(this.endNode) === Node.DOCUMENT_POSITION_FOLLOWING)

		// if (this.parentPath)
		// 	assert(this.parentPath.nodeGroups.includes(this));
		
		for (let path of this.paths) {
			assert(path.parentNg === this)

			// Fails for detached NodeGroups.
			// NodeGroups get detached when their nodes are removed by udomdiff()
			let parentNode = this.getParentNode();
			if (parentNode)
				assert(this.getParentNode().contains(path.getParentNode()))
			path.verify();
			// TODO: Make sure path nodes are all within our own node range.
		}
		return true;
	}
	//#ENDIF
}


let componentHash = new WeakMap()

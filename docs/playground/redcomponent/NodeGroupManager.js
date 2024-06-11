import MultiValueMap from "./MultiValueMap.js";
import NodeGroup from "./NodeGroup.js";
import {getObjectHash} from "./hash.js";
import {serializePath} from "./watch.js";

import {assert} from "../util/Errors.js";


/**
 * @typedef {Object} RenderOptions
 * @property {boolean=} styles - Indicates whether the Courage component is present.
 * @property {boolean=} scripts - Indicates whether the Power component is present.
 * @property {boolean=} ids
 *
 * @property {?boolean} render
 * 	   Used only when options are given to a class super constructor inheriting from Red.
 *     True to call render() immediately in super constructor.
 *     False to automatically call render() at all.
 *     Undefined (default) to call render() when added to the DOM, unless already rendered.
 */


/**
 * Manage all the NodeGroups for a single WebComponent or root HTMLElement
 * There's one NodeGroup for the root of the WebComponent, and one for every ${...} expression that creates Node children.
 * And each NodeGroup manages the one or more nodes created by the expression.
 *
 * An instance of this class exists for each element that r() renders to. */
export default class NodeGroupManager {

	/** @type {HTMLElement|DocumentFragment} */
	rootEl;

	/** @type {NodeGroup} */
	rootNg;
	
	/** @type {Change[]} */
	changes = [];
	
	

	//#IFDEV
	modifications;
	logDepth=0
	//#ENDIF

	/**
	 * A map from the html strings and exprs that created a node group, to the NodeGroup.
	 * Also stores a map from just the html strings to the NodeGroup, so we can still find a similar match if the exprs changed.
	 *
	 * @type {MultiValueMap<string, (string|Template)[], NodeGroup>} */
	nodeGroupsAvailable = new MultiValueMap();
	nodeGroupsInUse = [];


	/** @type {RenderOptions} */
	options = {};

	
	//#IFDEV
	mutationWatcher;
	mutationWatcherEnabled = true;
	//#ENDIF

	/**
	 * @param rootEl {HTMLElement|DocumentFragment} If not specified, the first element of the html will be the rootEl. */
	constructor(rootEl=null) {
		this.rootEl = rootEl;
		/*
		//#IFDEV
		
		function closestCustomElement(node) {
			do {
				if (node.tagName && node.tagName.includes('-'))
					return node;
			} while (node = node.parentNode);
		}
		
		// TODO: Only trigger if we modify nodes inside an ExprPath.
		// TODO: Enable this even when not in dev mode, because it's so useful for debugging?
		// But it modifies the top level prototypes.
		// TODO: Remove the onBeforeMutation callback when this.rootEl is not in the document.
		// Because we won't get notified of document changes then anyway.
		if (this.rootEl && this.rootEl.ownerDocument?.defaultView) { // TODO: Bind whenever we have rootEl.
			this.mutationWatcher = MutationWatcher.getFromDocument(this.rootEl.ownerDocument);
			this.mutationWatcher.onBeforeMutation.push((node, action, args) => {
				
				// If a modification was made
				if (this.mutationWatcherEnabled) {
					if (this.rootEl.contains(node) && closestCustomElement(node) === this.rootEl) {
						//console.log(node, action, args);
						//throw new Error('DOM modification');
					}
					
					// If another DOM node steals one of ours by adding it to itself.
					// TODO: append can use multiple arguments.
					if (['insertBefore', 'append', 'appendChild'].includes(action)
						&& this.rootEl.contains(args[0]) && closestCustomElement(args[0]) === this.rootEl) {
						
						//console.log(node, action, args);
						//throw new Error('Another element attempted to steal one of our nodes.');
					}
				}
			});
		}
		//#ENDIF
		*/
	}

	/**
	 * Render the main template, which may indirectly call renderTemplate() to create children.
	 * @param template {Template}
	 * @param options {RenderOptions}
	 * @return {?DocumentFragment} */
	render(template, options={}) {
		this.mutationWatcherEnabled = false;
		this.options = options;
		this.clearSubscribers = false;
		
		//#IFDEV
		this.modifications = {
			created: [],
			updated: [],
			moved: [],
			deleted: []
		};
		//#ENDIF
		
		if (!template && template !== '') {
			this.rootEl.outerHTML = '';
			this.mutationWatcherEnabled = true;
			return null;
		}
		
		// Fast path for empty component.
		if (template.html?.length === 1 && !template.html[0]) {
			this.rootEl.innerHTML = '';
		}
		else {

			// Find or create a NodeGroup for the template.
			// This updates all nodes from the template.
			let close;
			let exact = this.getNodeGroup(template, true);
			if (!exact) {
				close = this.getNodeGroup(template, false);
			}
			
			
			let firstTime = !this.rootNg;
			this.rootNg = exact || close;

			// Reparent NodeGroup
			// TODO: Move this to NodeGroup?
			let parent = this.rootNg.getParentNode()
			if (!this.rootEl)
				this.rootEl = parent;

			// If this is the first time rendering this element.
			else if (firstTime) {

				// Save slot children
				let fragment;
				if (this.rootEl.childNodes.length) {
					fragment = document.createDocumentFragment();
					fragment.append(...this.rootEl.childNodes);
				}

				// Add rendered elements.
				if (parent instanceof DocumentFragment)
					this.rootEl.append(parent);
				else if (parent)
					this.rootEl.append(...parent.childNodes)

				// Apply slot children
				if (fragment) {
					for (let slot of this.rootEl.querySelectorAll('slot[name]')) {
						let name = slot.getAttribute('name')
						if (name)
							slot.append(...fragment.querySelectorAll(`[slot='${name}']`))
					}
					let unamedSlot = this.rootEl.querySelector('slot:not([name])')
					if (unamedSlot)
						unamedSlot.append(fragment)
				}

			}

			// this.rootNg was rendered as childrenOnly=true
			// Apply attributes from a root element to the real root element.
			let ng = this.rootNg;
			if (ng.pseudoRoot && ng.pseudoRoot !== this.rootEl) {
				/*#IFDEV*/assert(this.rootEl)/*#ENDIF*/

				// Remove old attributes
				// for (let attrib of this.rootEl.attributes)
				// 	if (attrib.name !== 'is' && attrib.name !== 'data-style' && !ng.pseudoRoot.hasAttribute(attrib.name))
				// 		this.rootEl.removeAttribute(attrib.name)

				// Add/set new attributes
				if (firstTime)
                    for (let attrib of ng.pseudoRoot.attributes)
                        if (!this.rootEl.hasAttribute(attrib.name))
                            this.rootEl.setAttribute(attrib.name, attrib.value);

				// ng.startNode = ng.endNode = this.rootEl;
				// ng.nodesCache = [ng.startNode]
				// for (let path of ng.paths) {
				// 	if (path.nodeMarker === ng.rootEl)
				// 		path.nodeMarker = this.rootEl;
				// 	path.nodesCache = null;
				// 	/*#IFDEV*/assert(path.nodeBefore !== ng.rootEl)/*#ENDIF*/
				// }
				//
				// ng.rootEl = this.rootEl;
			}

			/*#IFDEV*/this.rootNg.verify();/*#ENDIF*/
			this.reset();
			/*#IFDEV*/this.rootNg.verify();/*#ENDIF*/
		}

		this.mutationWatcherEnabled = true;
		return this.rootEl;
		//#IFDEV
		//return this.modifications;
		//#ENDIF
	}


	/**
	 *
	 * 1.  Delete a NodeGroup from this.nodeGroupsAvailable that matches this exactKey.
	 * 2.  Then delete all of that NodeGroup's parents' exactKey entries
	 *     We don't move them to in-use because we plucked the NodeGroup from them, they no longer match their exactKeys.
	 * 3.  Then we move all the NodeGroup's exact+close keyed children to inUse because we don't want future calls
	 *     to getNodeGroup() to borrow the children now that the whole NodeGroup is in-use.
	 *
	 * TODO: Have NodeGroups keep track of whether they're inUse.
	 * That way when we go up or down we don't have to remove those with .inUse===true
	 *
	 * @param exactKey
	 * @param goUp
	 * @param child
	 * @returns {?NodeGroup} */
	findAndDeleteExact(exactKey, goUp=true, child=undefined) {

		let ng = this.nodeGroupsAvailable.delete(exactKey, child);
		if (ng) {
			/*#IFDEV*/assert(ng.exactKey === exactKey);/*#ENDIF*/
			
			// Mark close-key version as in-use.
			let closeNg = this.nodeGroupsAvailable.delete(ng.closeKey, ng);
			/*#IFDEV*/assert(closeNg);/*#ENDIF*/

			// Mark our self as in-use.
			this.nodeGroupsInUse.push(ng)

			ng.inUse = true;
			closeNg.inUse = true;

			// Mark all parents that have this NodeGroup as a child as in-use.
			// So that way we don't use this parent again
			if (goUp) {
				let ng2 = ng;
				while (ng2 = ng2?.parentPath?.parentNg) {
					if (!ng2.inUse) {
						ng2.inUse = true;
						let success = this.nodeGroupsAvailable.delete(ng2.exactKey, ng2);
						// assert(success);
						let success2 = this.nodeGroupsAvailable.delete(ng2.closeKey, ng2);
						// assert(success);
						/*#IFDEV*/assert(success === success2)/*#ENDIF*/

						// console.log(getHtml(ng2))
						if (success) {
							this.nodeGroupsInUse.push(ng2)
						}
					}
				}
			}

			// Recurse to mark all child NodeGroups as in-use.
			for (let path of ng.paths)
				for (let childNg of path.nodeGroups) {
					if (!childNg.inUse)
						this.findAndDeleteExact(childNg.exactKey, false, childNg);
					childNg.inUse = true;
				}
			
			if (ng.parentPath) {
				//ng.parentPath.clearNodesCache();
				// ng.parentPath = null;
				//ng.parentPath.removeNodeGroup(ng);
			}

			return ng;
		}
		return null;
	}
	
	/**
	 * @param closeKey {string}
	 * @param exactKey {string}
	 * @param goUp {boolean}
	 * @returns {NodeGroup} */
	findAndDeleteClose(closeKey, exactKey, goUp=true) {
		let ng = this.nodeGroupsAvailable.delete(closeKey);
		if (ng) {
			
			// We matched on a new key, so delete the old exactKey.
			let exactNg = this.nodeGroupsAvailable.delete(ng.exactKey, ng);
			
			/*#IFDEV*/assert(exactNg);/*#ENDIF*/
			/*#IFDEV*/assert(ng === exactNg)/*#ENDIF*/
			
			
			ng.inUse = true;
			if (goUp) {
				let ng2 = ng;

				// We borrowed a node from another node group so make sure its parent isn't still an exact match.
				while (ng2 = ng2?.parentPath?.parentNg) {
					if (!ng2.inUse) {
						ng2.inUse = true; // Might speed it up slightly?
						let success = this.nodeGroupsAvailable.delete(ng2.exactKey, ng2);
						/*#IFDEV*/assert(success);/*#ENDIF*/

						// But it can still be a close match, so we don't use this code.
						success = this.nodeGroupsAvailable.delete(ng2.closeKey, ng2);
						/*#IFDEV*/assert(success);/*#ENDIF*/
					}
				}
			}

			// Recursively mark all child NodeGroups as in-use.
			// We actually DON't want to do this becuse applyExprs is going to swap out the child NodeGroups
			// and mark them as in-use as it goes.
			// that's probably why uncommenting this causes tests to fail.
			// for (let path of ng.paths)
			// 	for (let childNg of path.nodeGroups)
			// 		this.findAndDeleteExact(childNg.exactKey, false, childNg);


			ng.exactKey = exactKey;
			ng.closeKey = closeKey;
			this.nodeGroupsInUse.push(ng)
			
			
			if (ng.parentPath) {
				//ng.parentPath.clearNodesCache();
				//ng.parentPath = null;
				//ng.parentPath.removeNodeGroup(ng);
			}
		}
		
		
		return ng;
	}

	/**
	 * Get an existing or create a new NodeGroup that matches the template,
	 * but don't reparent it if it's somewhere else.
	 * @param template {Template}
	 * @param exact {?boolean}
	 * @param createForWatch
	 * @return {?NodeGroup} */
	getNodeGroup(template, exact=null, createForWatch=false) {

		let exactKey = getObjectHash(template)

		/*#IFDEV*/if(NodeGroupManager.logEnabled) this.log(`Looking for ${exact ? 'exact' : 'close'} match: ` + template.debug)/*#ENDIF*/

		// 1. Try to find an exact match.
		let ng;
		if (exact === true) {
			ng = this.findAndDeleteExact(exactKey);

			if (!ng) {
				/*#IFDEV*/this.log(`Not found.`)/*#ENDIF*/
				return null;
			}
			/*#IFDEV*/if(NodeGroupManager.logEnabled) this.log(`Found exact: ` + ng.debug)/*#ENDIF*/
		}

		// 2.  Try to find a close match.
		else {
			// We don't need to delete the exact match bc it's already been deleted in the prev pass.
			let closeKey = template.getCloseKey();
			ng = createForWatch ? null : this.findAndDeleteClose(closeKey, exactKey);

			// 2. Update expression values if they've changed.
			if (ng) {
				
				// Temporary for debugging:
				if (window.debug && !window.ng)
					window.ng = ng;

				/*#IFDEV*/if(NodeGroupManager.logEnabled) this.log(`Found close: ` + closeKey + '   ' + ng.debug)/*#ENDIF*/
				/*#IFDEV*/this.incrementLogDepth(1);/*#ENDIF*/
				/*#IFDEV*/ng.verify();/*#ENDIF*/
				ng.applyExprs(template.exprs);

				/*#IFDEV*/ng.verify()/*#ENDIF*/
				/*#IFDEV*/this.incrementLogDepth(-1);/*#ENDIF*/
				/*#IFDEV*/if(NodeGroupManager.logEnabled) this.log(`Updated close to: ` + ng.debug)/*#ENDIF*/
			}

			// 3. Or if not found, create a new NodeGroup
			else {
				/*#IFDEV*/this.incrementLogDepth(1);/*#ENDIF*/
				ng = new NodeGroup(template, this);
				/*#IFDEV*/this.incrementLogDepth(-1);/*#ENDIF*/

				//#IFDEV
				this.modifications.created.push(...ng.getNodes())
				//#ENDIF


				// 4. Mark NodeGroup as being in-use.
				// TODO: Moving from one group to another thrashes the gc.  Is there a faster way?
				// Could I have just a single WeakSet of those in use?
				// Perhaps also result could cache its last exprKey and then we'd use only one map?
				ng.exactKey = exactKey;
				ng.closeKey = closeKey;
				if (createForWatch) // TODO: Have this path be a separate function?
					this.nodeGroupsAvailable.add(ng.exactKey, ng);
				else
					this.nodeGroupsInUse.push(ng)

				/*#IFDEV*/if(NodeGroupManager.logEnabled) this.log(`Created new ` + ng.debug)/*#ENDIF*/
			}
		}
		
		// New!
		// We clear the parent PathExpr's nodesCache when we remove ourselves from it.
		// Benchmarking shows this doesn't slow down the partialUpdate benchmark.
		if (ng.parentPath) {
			// ng.parentPath.clearNodesCache(); // Makes partialUpdate benchmark 10x slower!
		 	ng.parentPath = null;
		}


		/*#IFDEV*/ng.verify()/*#ENDIF*/
		
		return ng;
	}

	reset() {
		//this.changes = [];
		let available = this.nodeGroupsAvailable
		for (let ng of this.nodeGroupsInUse) {
			ng.inUse = false;
			available.add(ng.exactKey, ng)
			available.add(ng.closeKey, ng)
		}
		this.nodeGroupsInUse = [];

		// Used for watches
		this.changes = [];

		/*#IFDEV*/this.log('----------------------')/*#ENDIF*/
		// TODO: free the memory from any nodeGroupsAvailable() after render is done, since they weren't used?
	}


	// deprecated
	//pathToLoopInfo = new MultiValueMap(); // uses a Set() for each value.
	clearSubscribers = false;

	/**
	 * One path may be used to loop in more than one place, so we use this to get every anchor from each loop.
	 * @param path {Array}
	 * @return {LoopInfo[]} A function that gets the loop anchor NodeGroup */
	getLoopInfo(path) {
		let serializedArrayPath = serializePath(path);
		return [...this.pathToLoopInfo.getAll(serializedArrayPath)]; // This is set inside forEach()
	}

	
	/**
	 * @deprecated
	 * Store the functions used to create items for each loop.
	 * TODO: Can this be combined with pathToTemplates?
	 * @type {MultiValueMap<string, Subscriber>} */
	pathToLoopInfo = new MultiValueMap();
	
	/**
	 * Maps variable paths to the templates used to create NodeGroups
	 * @type {MultiValueMap<string, Subscriber>} */
	subscribers = new MultiValueMap();
	
	clearSubscribersIfNeeded() {
		if (this.clearSubscribers) {
			this.pathToLoopInfo = new MultiValueMap();
			this.subscribers = new MultiValueMap();
			this.clearSubscribers = false;
		}
	}
	

	/**
	 * Get the NodeGroupManager for a Web Component.
	 * @param rootEl {Red|HTMLElement}
	 * @return {NodeGroupManager} */
	static get(rootEl) {
		let ngm = nodeGroupManagers.get(rootEl);
		if (!ngm) {
			ngm = new NodeGroupManager(rootEl);
			nodeGroupManagers.set(rootEl, ngm);
		}

		return ngm;
	}


	//#IFDEV
	static logEnabled = false;
	incrementLogDepth(level) {
		this.logDepth += level;
	}
	log(msg, level=0) {
		this.logDepth += level;
		if (NodeGroupManager.logEnabled) {
			let indent = '	'.repeat(this.logDepth);
			console.log(indent + msg);
		}
	}

	/**
	 * @returns {NodeGroup[]} */
	getAllAvailableGroups() {
		let result = new Set();
		for (let values of Object.values(this.nodeGroupsAvailable.data))
			result.add(...values)
		return [...result];
	}

	verify() {
		if (!window.verify)
			return;

		
		let findCloseMatch = item => {
			let names = this.nodeGroupsAvailable.hasValue(item);
			for (let name of names)
				if (name.startsWith('@'))
					return true;
			return false;
		}

		// Check to make sure every exact match is also in close matches.
		for (let name in this.nodeGroupsAvailable)
			if (!name.startsWith('@)'))
				for (let item of this.nodeGroupsAvailable.getAll(name))
					assert(findCloseMatch(item))

		// Recursively traverse through all node Groups
		if (this.rootNg)
			this.rootNg.verify();

		for (let ng of this.getAllAvailableGroups())
			ng.verify();
	}
	//#ENDIF
}

NodeGroupManager.pendingChildren = [];

/**
 * Each Element that has Expr children has an associated NodeGroupManager here.
 * @type {WeakMap<HTMLElement, NodeGroupManager>} */
let nodeGroupManagers = new WeakMap();



export class LoopInfo {
	constructor(loopTemplate, itemTransformer) {
		this.template = loopTemplate
		this.itemTransformer = itemTransformer;
	}
}

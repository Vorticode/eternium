import Util from "../util/Util.js";
import {assert} from "../util/Errors.js";
import delve from "../util/delve.js";
import {getArg, ArgType} from "./getArg.js";
import {getObjectHash} from "./hash.js";
import NodeGroupManager from "./NodeGroupManager.js";
import r, {rendered} from "./r.js";
import {camelToDashes} from "./Util.js";
import {watchGet, watchSet} from "./watch.js";


function defineClass(Class, tagName, extendsTag) {
	if (!customElements.getName(Class)) { // If not previously defined.
		tagName = tagName || camelToDashes(Class.name)
		if (!tagName.includes('-'))
			tagName += '-element';

		let options = null;
		if (extendsTag)
			options = {extends: extendsTag}

		customElements.define(tagName, Class, options)
	}
}

/**
 * @type {Object<string, Class<Node>>} A map from built-in tag names to the constructors that create them. */
let elementClasses = {};

/**
 * Store which instances of Red have already been added to the DOM. * @type {WeakSet<HTMLElement>}
 */
let connected = new WeakSet();

/**
 * Create a version of the Red class that extends from the given tag name.
 * Reasons to inherit from this instead of HTMLElement.  None of these are all that useful.
 * 1.  customElements.define() is called automatically when you create the first instance.
 * 2.  Calls render() when added to the DOM, if it hasn't been called already.
 * 3.  Child elements are added before constructor is called.  But they're also passed to the constructor.
 * 4.  We can use this.html = r`...` to set html.
 * 5.  We have the onConnect, onFirstConnect, and onDisconnect methods.  These could be standalone though.
 *
 * @param extendsTag {?string}
 * @return {Class} */
export default function CustomRed(extendsTag=null) {

	let BaseClass = HTMLElement;
	if (extendsTag && !extendsTag.includes('-')) {
		extendsTag = extendsTag.toLowerCase();

		BaseClass = elementClasses[extendsTag];
		if (!BaseClass) { // TODO: Use Cache
			BaseClass = document.createElement(extendsTag).constructor;
			elementClasses[extendsTag] = BaseClass
		}
	}

	/**
	 * Intercept the construct call to auto-define the class before the constructor is called.
	 * @type {HTMLElement} */
	let HTMLElementAutoDefine = new Proxy(BaseClass, {
		construct(Parent, args, Class) {
			defineClass(Class, null, extendsTag)

			// This is a good place to manipulate any args before they're sent to the constructor.
			// Such as loading them from attributes, if I could find a way to do so.

			// This line is equivalent the to super() call.
			return Reflect.construct(Parent, args, Class);
		}
	});

	return class Red extends HTMLElementAutoDefine {
		
		
		/**
		 * Callbacks.
		 * Use onConnect.push(() => ...); to add new callbacks. */
		onConnect = Util.callback();
		
		onFirstConnect = Util.callback();
		onDisconnect = Util.callback();

		/**
		 * @param options {RenderOptions} */
		constructor(options={}) {
			super();



			// TODO: Is options.render ever used?
			if (options.render===true)
				this.render();

			else if (options.render===false)
				rendered.add(this); // Don't render on connectedCallback()

			// Add children before constructor code executes.
			// PendingChildren is setup in NodeGroup.createNewComponent()
			// TODO: Match named slots.
			let ch = NodeGroupManager.pendingChildren.pop();
			if (ch)
				(this.querySelector('slot') || this).append(...ch);


			Object.defineProperty(this, 'html', {
				set(html) {
					rendered.add(this);
					if (typeof html === 'string') {
						console.warn("Assigning to this.html without the r template prefix.")
						this.innerHTML = html;
					}
					else
						this.modifications = r(this, html, options);
				}
			})

			/*
			let pthis = new Proxy(this, {
				get(obj, prop) {
					return Reflect.get(obj, prop)
				}
			});
			this.render = this.render.bind(pthis);
			*/
		}

		/**
		 * Call render() only if it hasn't already been called.	 */
		renderFirstTime() {
			if (!rendered.has(this) && this.render)
				this.render();
		}
		
		/**
		 * Called automatically by the browser. */
		connectedCallback() {
			this.renderFirstTime();
			if (!connected.has(this)) {
				connected.add(this);
				this.onFirstConnect();
			}
			this.onConnect();
		}
		
		disconnectedCallback() {
			this.onDisconnect();
		}


		static define(tagName=null) {
			defineClass(this, tagName, extendsTag)
		}


		renderWatched() {
			let ngm = NodeGroupManager.get(this);

			let nodeGroupUpdates = [];

			for (let change of ngm.changes) {
				if (change.action === 'set') {
					for (let transformerInfo of change.transformerInfo) {

						let oldHash = transformerInfo.hash;

						let newObj = delve(watchSet(transformerInfo.path[0]), transformerInfo.path.slice(1));
						let newTemplate = transformerInfo.transformer(newObj);
						let newHash = getObjectHash(newTemplate);
						let ngs = [...ngm.nodeGroupsAvailable.data[oldHash]];
						for (let ng of ngs) {
							nodeGroupUpdates.push([ng, oldHash, newHash, newTemplate.exprs, transformerInfo]);
						}
					}
				}

				else if (change.action === 'delete') {
					for (let hash of change.value) {
						let ngs = [...ngm.nodeGroupsAvailable.getAll(hash)]; // deletes from nodeGroupsAvailable.

						for (let ng of ngs) {
							if (ng.parentPath)
								ng.parentPath.clearNodesCache();

							for (let node of ng.getNodes())
								node.remove();

							// TODO: Update ancestor NodeGroup exactKeys
						}
					}
				}
				else if (change.action === 'insert') {

					let beforeNg = change.beforeTemplate ? ngm.getNodeGroup(change.beforeTemplate, true) : null;
					let arrayPath = [change.root, ...change.path];

					// Get anchor so we can use it to get the parent
					// TODO: Should this be watchGet(change.root) ?
					for (let loopInfo of ngm.getLoopInfo([change.root, ...change.path.slice(0, -1)])) {

						// Change.extra is aTemplate telling us where to insert before.
						let beforeNode = beforeNg?.startNode || loopInfo.template.parentPath.nodeMarker;

						// Loop over every item added to the array.
						let i = 0; // TODO: How to get real insert index.
						for (let obj of change.value) {

							// Same logic as forEach() function.

							let callback = loopInfo.itemTransformer;
							let path = [...arrayPath.slice(0, -1), (arrayPath.at(-1) * 1 + i) + ''];

							// Shortened logic found in watchGet(), but not any faster?
							// the watchSet() is what makes this slower!
							// let obj = delve(watchSet(path[0]), path.slice(1));
							// let template = callback(obj);
							// let serializedPath = serializePath(path);
							// pathToTransformer.add(serializedPath, new TransformerInfo(path, callback, template)); // Uses a Set() to ensure no duplicates.

							let template = watchGet(path, callback);
							i++;


							//let template = loopInfo.itemTransformer(obj); // What if it takes more than one obj argument?

							// Create new NodeGroup
							let ng = ngm.getNodeGroup(template, false, true);
							ng.parentPath = beforeNg?.parentPath || loopInfo.template.parentPath;
							/*#IFDEV*/
							assert(ng.parentPath);/*#ENDIF*/
							for (let node of ng.getNodes())
								beforeNode.parentNode.insertBefore(node, beforeNode);

							if (ng.parentPath) // This check is needed for the forEachSpliceInsert test, but why?
								ng.parentPath.clearNodesCache();
						}

						// TODO: Update ancestor NodeGroup exactKeys
					}
				}
			}

			// Update them all at once, that way we can reassign the same value twice.
			for (let [ng, oldHash, newHash, exprs, ti] of nodeGroupUpdates) {
				ng.applyExprs(exprs);
				ngm.nodeGroupsAvailable.data[oldHash].delete(ng);
				ng.exactKey = ti.hash = newHash;
				ngm.nodeGroupsAvailable.add(ng.exactKey, ng); // Add back to Map with new key.
			}


			ngm.changes = [];

			return []; // TODO
		}
		
		/**
		 * @deprecated Use the getArg() function instead. */
		getArg(name, val=null, type=ArgType.String) {
			return getArg(this, name, val, type);
		}
	}
}


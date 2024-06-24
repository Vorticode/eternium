import {assert} from "../util/Errors.js";
import {getObjectId} from "./hash.js";
import NodeGroupManager from "./NodeGroupManager.js";


/**
 * The html strings and evaluated expressions from an html tagged template.
 * A unique Template is created for each item in a loop.
 * Although the reference to the html strings is shared among templates. */
export default class Template {

	/** @type {(Template|string|function)|(Template|string|function)[]} Evaulated expressions.  */
	exprs = []

	/** @type {string[]} */
	html = [];

	/**
	 * If true, use this template to replace an existing element, instead of appending children to it.
	 * @type {?boolean} */
	replaceMode;

	/** Used for toJSON() and getObjectHash().  Stores values used to quickly create a string hash of this template. */
	hashedFields;

    /**
     * @deprecated
     * @type {ExprPath} Used with forEach() from watch.js
   	 * Set in NodeGroup.applyOneExpr() */
    parentPath;
	
	/** @type {NodeGroup} */
	nodeGroup;
	
	/**
	 * @type {string[][]} */
	paths = [];

	/**
	 *
	 * @param htmlStrings {string[]}
	 * @param exprs {*[]} */
	constructor(htmlStrings, exprs) {
		this.html = htmlStrings;
		this.exprs = exprs;
		
		//this.trace = new Error().stack.split(/\n/g)

		// Multiple templates can share the same htmlStrings array.
		//this.hashedFields = [getObjectId(htmlStrings), exprs]

		//#IFDEV
		assert(Array.isArray(htmlStrings))
		assert(Array.isArray(exprs))
		
		Object.defineProperty(this, 'debug', {
			get() {
				return JSON.stringify([this.html, this.exprs]);
			}
		})
		//#ENDIF
	}

	/**
	 * Called by JSON.serialize when it encounters a Template.
	 * This prevents the hashed version from being too large. */
	toJSON() {
		if (!this.hashedFields)
			this.hashedFields = [getObjectId(this.html, 'Html'), this.exprs];
		
		return this.hashedFields
	}

	toNode() {
		let ngm = new NodeGroupManager();
		return ngm.render(this);
	}

	getCloseKey() {
		// Use the joined html when debugging?
		//return '@'+this.html.join('|')

		return '@'+this.hashedFields[0];
	}
}

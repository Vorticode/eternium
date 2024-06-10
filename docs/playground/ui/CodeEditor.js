import {
	autocompletion,
	bracketMatching,
	closeBrackets,
	closeBracketsKeymap,
	closeSearchPanel,
	Compartment,
	completionKeymap,
	crosshairCursor,
	css,
	cssParser,
	defaultHighlightStyle,
	defaultKeymap,
	drawSelection,
	EditorState,
	EditorView,
	foldKeymap,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSelectionMatches,
	highlightSpecialChars,
	history,
	historyKeymap,
	html,
	htmlParser,
	indentOnInput,
	indentUnit,
	indentWithTab,
	javascript,
	json,
	jsParser,
	keymap,
	lineNumbers,
	LRLanguage,
	markdown,
	openSearchPanel,
	parseMixed,
	php,
	phpParser,
	python,
	rectangularSelection,
	redo,
	redoDepth,
	searchKeymap,
	searchPanelOpen,
	sql,
	StateEffect,
	StateField,
	syntaxHighlighting,
	undo,
	undoDepth
} from '../codemirror/codemirror6.js';
import themeSolarIce from "../codemirror/themeSolarIce.js";
import {r, Red, getArg, ArgType} from "../redcomponent/RedComponent.js";
import Icons from "../util/Icons.js";
import Util from "../util/Util.js";



/**
 * Wraps CodeMirror into a web component and provides some useful functions and default settings.
 * TODO: Emmet support for html:  https://discuss.codemirror.net/t/is-it-able-to-use-tab-to-generate-code-snippets-for-html-tag/5502
 *
 * @example
 * new CodeEditor('sql', 'SELECT * FROM users', {}, 'undo redo | run'); */
export default class CodeEditor extends Red {
	
	/** @type {EditorView} */
	view;
	
	extensions = [];

	/**
	 * @type {Callbacks|function}
	 *
	 * @example
	 * codeEditor.onChange.push(update => {
	 *     console.log(update.state.doc.toString();
	 * });
	 * */
	onChange = Util.callback();
	
	/**
	 * Called every time CodeMirror selection or content changes.
	 * @type {Callbacks|function} */
	onInternalChange = Util.callback();
	
	/** @type {Callbacks|function(range:{start: {line:int, column:int}, end: {line:int, column:int}})} */
	onSelectionChange = Util.callback();
	
	/** @type {Callbacks|function} */
	onOptionChange = Util.callback();

	allowChanges = true;
	
	/**
	 * Serialized selection range.  Line numbers start at 0.
	 * @type {string} */
	lastSelection = '0-0';

	/** @type {HTMLElement} */
	editor;

	/** @type {?CodeEditorToolbar} */
	toolbar;
	
	/** @type {string} */
	language;
	
	/**
	 * Compartments wrap extensions and allow changing thier settings after init. */
	compartments = {
		lineWrapping: new Compartment(),
		language: new Compartment(),
		tabSize: new Compartment(),
		theme: new Compartment()
	};
	
	wordWrap = false;

	/**
	 * Example languageConfig for SQL:
	 * https://github.com/codemirror/lang-sql#----interface----sqlconfig
	 * {
	 *      upperCaseKeywords: true,
	 * 	    schema: { // Define tables and their columns for auto-complete.
	 * 	    	users: ['email', 'passwordHash'],
	 * 			stats: ['id', 'created']
	 * 		}
	 *  }
	 *
	 * @param value {string}
	 * @param language {?string} Can be the name of the language or one of the file extensions.
	 *     Supported languages: php, php-plain, javascript, html, markdown, sql, css
	 * @param languageconfig {?Object} Options for CodeMirror.
	 * @param toolbar {string|Object<html:Template, update:function>[]} Names of buttons from CodeEditiorToolbar.buttonTemplates or an array of HTMLElements to use as buttons.
	 * @param options {object}
	 * @param options.wordWrap {boolean} */
	constructor({value='', language=null, languageconfig=null, toolbar='', options={}}={}) {
		super();
		
		value = getArg(this, 'value', value, ArgType.String);
		this.language = (language||'php').toLowerCase();
		this.languageConfig = languageconfig || {};
		this.wordWrap = options.wordWrap || false;
		
		

		// https://github.com/codemirror/lang-php
		if (this.language === 'php-plain')
			this.languageConfig.plain = true;

		// TODO: Use this to specify markdown code block languages:
		// And add keybindings for ctrl+1 headers, etc.
		// https://github.com/codemirror/lang-markdown
		
		this.render();
		
		let state = EditorState.create({
			doc: value,
			extensions: this.getExtensions(options.wordWrap)
		})
		this.view = new EditorView({
			state,
			parent: this.editor
		});
		
		// Create the toolbar
		if (toolbar) {
			this.toolbar = new CodeEditorToolbar({ed: this, buttons: toolbar});
			this.insertBefore(this.toolbar, this.editor);
		}
		
		
		// Watch for dark attribute change on <html> element.
		// So we can update our own theme in response.
		this.onConnect.push(() => {
			if (this.ownerDocument.documentElement) {
				const observer = new MutationObserver((mutations) => {
					mutations.forEach((mutation) => {
						if (mutation.type === 'attributes' && mutation.attributeName === 'dark') {
							let state = mutation.target.hasAttribute('dark');
							this.setTheme(themeSolarIce(this.language, state));
						}
					});
				});
				
				observer.observe(this.ownerDocument.documentElement, {attributes: true});
			}
		});
		
		this.onInternalChange.push((update, codeEditor) => {
			let sel = update.state.selection.main;
			let lineObj = update.state.doc.lineAt(sel.head);
			
			let newSelection = lineObj.number + '-' + (sel.head - lineObj.from);
			
			if (newSelection !== codeEditor.lastSelection) {
				if (codeEditor.allowChanges && codeEditor.onSelectionChange.length) {
					let range = {
						start: {
							line: lineObj.number - 1,
							column: sel.head - lineObj.from
						},
						end: {}
					};
					
					lineObj = sel.head === sel.anchor ? lineObj : update.state.doc.lineAt(sel.anchor);
					range.end.line = lineObj.number - 1;
					range.end.column = sel.anchor - lineObj.from
					
					codeEditor.onSelectionChange(range, update);
				}
				this.lastSelection = newSelection;
				if (this.toolbar)
					this.toolbar.update(update);
			}
			// console.log(startLine, startColumn, endLine, endColumn, update)
			if (this.allowChanges && update.changedRanges.length && this.onChange.length) {
				let codeChange = {
					beforeStart: update.changedRanges[0].fromA,
					beforeEnd: update.changedRanges[0].toA,
					afterStart: update.changedRanges[0].fromB,
					afterEnd: update.changedRanges[0].toB,
					text: update.state.doc.sliceString(update.changedRanges[0].fromB, update.changedRanges[0].toB)
				};
				this.onChange(codeChange, update);
			}
		});


		Object.defineProperty(this, 'value', {
			get() {
				return this.getValue();
			},
			set(val) {
				this.setValue(val, false);
			}
		});
	}
	
	getExtensions(wordWrap=false, isDark=undefined) {
		let doc = this.ownerDocument || window.top.document;
		if (isDark === undefined)
			isDark = doc.documentElement.hasAttribute('dark');
		
		let languageExtensions = this.getLanguageExtension(this.language, this.languageConfig)
		return [
			//basicSetup,
			
			lineNumbers(),
			highlightActiveLineGutter(),
			highlightSpecialChars(),
			history(),
			//foldGutter(),
			drawSelection(),
			indentUnit.of("\t"),
			this.compartments.tabSize.of(EditorState.tabSize.of(4)),
			this.compartments.lineWrapping.of(wordWrap ? EditorView.lineWrapping : []),
			EditorState.allowMultipleSelections.of(true),
			indentOnInput(),
			bracketMatching(),
			closeBrackets(),
			autocompletion(),
			rectangularSelection(),
			crosshairCursor(),
			highlightActiveLine(),
			highlightSelectionMatches(),
			keymap.of([
				indentWithTab,
				...closeBracketsKeymap,
				{
					key: 'Tab', // TODO: What does this do?
					//run: target => acceptCompletion(target),
				},
				...defaultKeymap,
				...historyKeymap,
				...foldKeymap,
				...completionKeymap,
				...searchKeymap
			]),
			
			Extensions.changeDetection(this),
			Extensions.asyncField,
			
			this.compartments.theme.of(themeSolarIce(this.language, isDark)),
			
			syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
			
			this.compartments.language.of(languageExtensions)
		];
	}

	focus() {
		this.view.focus();
	}
	
	/**
	 * Set the colors, fonts, and sizes.
	 * @param theme
	 * @returns {Promise<void>} */
	async setTheme(theme) {
		this.view.dispatch({
			effects: this.compartments.theme.reconfigure(theme)
		})
	}

	getValue() {
		return this.view.viewState.state.doc.toString()
	}

	undo() {
		undo(this.view);
	}

	redo() {
		redo(this.view);
	}
	
	
	toggleWordWrap(status=undefined) {
		if (status===undefined)
			status = !this.isWordWrapped();
		
		this.view.dispatch({ // Update codemirror.
			effects: this.compartments.lineWrapping.reconfigure(status ? EditorView.lineWrapping : [])
		});
		this.wordWrap = status;
		
		if (this.toolbar)
			this.toolbar.update();
		
		this.onOptionChange();
	}
	
	isWordWrapped() {
		return this.wordWrap;
	}

	toggleSearchPanel(status=undefined) {
		if (status===undefined)
			status = !searchPanelOpen(this.view.state);

		if (status) {
			openSearchPanel(this.view)

			// Make search panel styles a little closer to SiteCrafter styles.
			for (let btn of this.querySelectorAll('.cm-search .cm-button'))
				btn.classList.replace('cm-button', 'button')
		}
		else
			closeSearchPanel(this.view)
		if (this.toolbar)
			this.toolbar.update();
	}

	isSearchPanelOpen() {
		return this.view && searchPanelOpen(this.view.state);
	}

	/**
	 * Used internally.  Use setValue() to change the language. */
	getLanguageExtension(language, languageConfig) {
		this.language = language;

		// TODO: It may be possible to provide additional style overrides, e.g. for css tag selectors:
		// https://discuss.codemirror.net/t/highlighting-markdown-mark-only/3964/3

		let langExt;
		if (['css', 'scss', 'less'].includes(language))
			langExt = css;
		else if (['htm', 'html'].includes(language))
			langExt = ParseUtil.htmlWithJavaScript;
		else if (['js', 'ts', 'jsx', 'tsx', 'jscript', 'javascript'].includes(language))
			langExt = ParseUtil.javascriptWithHtml;  // TODO: Support it inside html and php
		else if (language === 'json')
			langExt = json;
			// else if (language === 'ts') // TODO: jsx, tsx, python
		// 	langExt = typescript();
		else if (['md', 'markdown'].includes(language))
			langExt = markdown;
		else if (language === 'php')
			langExt = ParseUtil.phpWithHtmlWithJavaScript;
		else if (language === 'php-plain')
			langExt = php; // Use this to default into php mode without an opening <? tag.
		else if (language === 'sql')
			langExt = sql;
		else if (['py', 'python'].includes(language))
			langExt = python;
		if (!langExt)
			return []; // plain text.

		return [
			langExt(languageConfig)
		];
	}
	
	/**
	 *
	 * @param range {CodeRange}*/
	async selectRange(range) {
		range = range.clone();
		if (range.start.line === null) {
			await asyncDispatch(this.view, {
				selection: { // Deselect all.
					head: 0,
					anchor: 0
				}
			});
			return;
		}
		
		
		let doc = this.view.state.doc;
		
		// Keep within bounds.
		if (doc.lines < range.start.line)
			range.start.line = doc.lines-1;
		if (doc.lines < range.end.line)
			range.end.line = doc.lines-1;
		if (range.end.line === null)
			range.end.line = range.start.line;
		
		// Sometimes these can be out of bounds if the line is pair of comments for a php print.
		// In that case we just select the whole line for now.
		if (doc.line(range.start.line+1).length < range.start.column)
			range.start.column = 0; //doc.text[range.start.line].length
		if (doc.line(range.end.line+1).length < range.end.column)
			range.end.column = doc.line(range.end.line+1).length;

		const startLineObj = doc.line(range.start.line+1);
		const endLineObj = doc.line(range.end.line+1);
		
		this.allowChanges = false; // Don't call onSelectionChange()

		await asyncDispatch(this.view, {
			// Set selection to that entire line.
			selection: {
				head: startLineObj.from + range.start.column,
				anchor: range.end.column === null
					? endLineObj.to // If no end column, select until end of line.
					: endLineObj.from + range.end.column
			},
			// Ensure the selection is shown in viewport
			scrollIntoView: true
		});

		this.allowChanges = true;
	}
	
	setLanguage(language=null, languageConfig=null) {
		languageConfig = languageConfig || {};
		this.view.dispatch({ // Update codemirror.
			effects: this.compartments.language.reconfigure(this.getLanguageExtension(language, languageConfig))
		});
	}

	/**
	 * TODO: Can't change language if createHistory=false */
	async setValue(value, createHistory=true) {
		let scroller = this.querySelector('.cm-editor > .cm-scroller');
		let scroll = {x: scroller?.scrollLeft||0, y: scroller?.scrollTop||0};
		
		// Don't trigger the onChange function
		this.allowChanges = false;

		// https://codemirror.net/docs/migration/
		if (createHistory)
			await asyncDispatch(this.view, { // Also triggers the change event.
				changes: {from: 0, to: this.view.state.doc.length, insert: value}
			})

		// https://discuss.codemirror.net/t/codemirror-6-cm-clearhistory-equivalent/2851/2
		else {
			this.view.setState(EditorState.create({
				doc: value,
				extensions: this.getExtensions(this.wordWrap)
			}));
		}
		
		this.allowChanges = true;

		// if (!triggerChange)
		// 	this.allowChanges = true;
		
		// Not sure why both of these are necessary, but in my testing they were.
		if (scroller) {
			scroller.scrollTop = scroll.y;
			scroller.scrollLeft = scroll.x;
			requestAnimationFrame(() => {
				scroller.scrollTop = scroll.y;
				scroller.scrollLeft = scroll.x;
			});
		}
	}
	
	getUndoDepth() {
		if (this.view)
		return undoDepth(this.view.state);
	}
	
	getRedoDepth() {
		if (this.view)
		return redoDepth(this.view.state);
	}


	render() {
		this.html = r`
		<code-editor>
			<style>
				:host { position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 0 }
				:host [data-id=editor] { height: 100%; width: 100%; min-height: 0 }
				:host [data-id=editor] .cm-editor { height: 100%; width: 100%; min-height: 0 }
				:host .cm-scroller { overflow: auto; min-height: 10px; height: 100%; width: 100%; font: 13px Hack, monospace !important  }
				
				/* Remove outline added by CodeMirror on focus. */
				:host [data-id=editor] .cm-editor.cm-focused { outline: none }
				:host .cm-activeLineGutter { background: transparent} /* Only highlight on focus, set in the theme.js file */
				
				/* Search Panel styles */
				:host .cm-panels.cm-panels-bottom { border-top: var(--border, 1px solid #cbcfd7) }
				:host .cm-panels { background-color: var(--background, white) !important; color: var(--text, #333) !important }
				:host .cm-panels label { display: inline-flex; align-items: center; user-select: none }
				:host .cm-textfield { font-size: inherit }
			</style>
			<div data-id="editor" class="col"></div>
		</code-editor>`
	}
}
CodeEditor.define();





// Define a unique effect to listen for
const asyncEffect = StateEffect.define();



/**
 * Use this function to allow awaiting a CodeMirror state.dispatch() call.
 * @param view
 * @param options
 * @returns {Promise<unknown>}
 *
 * @example
 * await asyncDispatch(this.view, dispatchArgs);  */
async function asyncDispatch(view, options) {
	//view.dispatch(options); // non-async version
	return new Promise(resolve => {
		options.effects = asyncEffect.of(resolve);
		view.dispatch(options);
	});
}


var Extensions = {
	
	// Create a state field that listens for your effect
	asyncField: StateField.define({
		create() {
			return {}; // Initial state (can be anything relevant)
		},
		update(value, tr, a) {
			if (tr.effects.some(e => e.is(asyncEffect))) {
				// Supposedly called after dispatched event is done, but doesn't seem to be?
				let resolve = tr.effects[0].value; // arg sent to asncEffect.of() in asyncDispatch()
				resolve();
			}
			return value; // Return the updated state
		}
	}),
	
	// Call onChange() when the document changes.
	// https://discuss.codemirror.net/t/how-to-listen-to-changes-for-react-controlled-component/4506/4
	changeDetection(codeEditor) {
		return EditorView.updateListener.of(update => {
			if (update.docChanged || update.selectionSet)
				codeEditor.onInternalChange(update, codeEditor);
		})
	}
}

var ParseUtil = {
	
	/**
	 * A langauge extension for CodeMirror to support highlighting nested javascript/html inside javascript templates.
	 * https://codemirror.net/examples/mixed-language/
	 * @return {LRLanguage} */
	javascriptWithHtml: () => LRLanguage.define({parser: ParseUtil.jsParser}),
	htmlWithJavaScript: () => LRLanguage.define({parser: ParseUtil.htmlParser}),
	phpWithHtmlWithJavaScript: () => LRLanguage.define({parser: ParseUtil.phpParser}),
	
	/**
	 * Used by javascriptWithHtml() */
	htmlParser: htmlParser.configure({
		wrap: parseMixed((node, docInput) => {
			if (node.name == "StyleText")
				return {parser: cssParser}
			if (node.name == "ScriptText")
				return {parser: ParseUtil.jsParser}
			
			// Use javascript parser for template expressions
			if (node.type.name === 'Document' && docInput.doc) {
				let code = docInput.doc.sliceString(node.from, node.to);
				let overlay = [];
				code.replace(/\${/g, (a, startIndex, c) => {
					let endIndex = ParseUtil.findMatchingBrace(code, startIndex+2);
					if (endIndex !== -1)
						overlay.push({from: node.from + startIndex, to: node.from + endIndex + 1});
				})
				return {
					parser: ParseUtil.jsParser,
					overlay
				}
			}
		})
	}),
	
	/**
	 * Used by javascriptWithHtml() */
	jsParser: jsParser.configure({
		wrap: parseMixed((node, docInput) => {
			if (node.name == "TemplateString") {
				let code = docInput.doc.sliceString(node.from, node.to);
				
				// Only if node text starts and ends with tags, allowing for spaces.
				if (code.match(/^`\s*</) && code.match(/>\s*`$/))
					return {parser: ParseUtil.htmlParser}
			}
			return null;
		})
	}),
	
	/**
	 * Replaces CodeMirror's php() function with one that uses the htmlParser above.
	 * This lets us syntax highlight html in javascript template tags.
	 * Search codemirror6.js for "PHP language support"
	 * to find the original function this is copied from. */
	phpParser: phpParser.configure({
		wrap: parseMixed(node => {
			if (!node.type.isTop)
				return null;
			return {
				parser: ParseUtil.htmlParser,
				overlay: node => node.name == "Text"
			};
		}),
		top: "Template"
	
	}),
	
	
	/**
	 * Used by javascriptWithHtml()
	 * @param str {string}
	 * @param startIndex {int}
	 * @returns {int} -1 if no match. */
	findMatchingBrace(str, startIndex) {
		let stack = 0;
		let inString = null;
		let inComment = null;
		
		for (let i=startIndex; i<str.length; i++) {
			let char = str[i];
			if (inString && char === '\\') { // Skip escaped characters in strings.
				i++;
				continue;
			}
			let nextChar = i + 1 < str.length ? str[i+1] : '';
			
			// String start/end
			if (char === '`' && !inComment)
				inString = inString ? null : '`';
			else if ((char === '"' || char === "'") && !inComment)
				inString = inString === char ? null : char;
			
			// Comment start/end
			if (!inString && char === '/' && (nextChar === '*' || nextChar === '/')) {
				inComment = nextChar === '*' ? 'block' : 'line';
				i++; // Skip the next character as it's part of the comment syntax
			}
			else if (inComment === 'block' && char === '*' && nextChar === '/') {
				inComment = null;
				i++; // Skip the '/' character
			}
			else if (inComment === 'line' && char === '\n')
				inComment = null;
			
			// Template literal boundaries
			if (!inString && !inComment) {
				if (char === '$' && nextChar === '{') {
					stack++;
					i++; // Skip the '{' character
				} else if (char === '}') {
					if (stack === 0)
						return i; // Matching closing brace found
					stack--;
				}
			}
		}
		
		return -1;
	}
};


/**
 * @typedef ToolbarButton
 * @property {string} html
 * @property {function(el:Node|HTMLElement)} update */
export class CodeEditorToolbar extends Red {

	/** @type {object} Should have functions for everything the buttons array uses. */
	ed;
	
	/**
	 * Internal representation of buttons.
	 * @type {{html:string, update:function}[]} */
	buttons = [];

	buttonTemplates

	/** @type {HTMLElement} */
	buttonEls;

	/**
	 * @param ed {CodeEditor}
	 * @param buttons {(string|ToolbarButton)[]} Names of built-in buttons to use, or objects to define new buttons */
	constructor({ed, buttons=[]}={}) {
		super();
		this.ed = ed;
		
		this.buttonTemplates = {
			'|': {
				html: r`<span>|</span>`
			},
			undo: {
				html: r`<button onclick="${e => this.ed.undo()}" class="flat" title="Undo">${r(Icons.undo)}</button>`,
				update: (el, sel) => el.toggleAttribute('disabled', this.ed.getUndoDepth() === 0)
			},
			redo: {
				html: r`<button onclick="${e => this.ed.redo()}" class="flat" title="Redo">${r(Icons.redo)}</button>`,
				update: (el, sel) => el.toggleAttribute('disabled', this.ed.getRedoDepth() === 0)
			},
			wordWrap: {
				html: r`<button onclick="${e => this.ed.toggleWordWrap()}" class="flat ${ed.isWordWrapped() && 'selected'}" title="Word Wrap">${r(Icons.wordWrap)}</button>`,
				update: (el, sel) => el.classList.toggle('selected', this.ed.isWordWrapped())
			},
			run: {
				html: r`<button onclick="${e => this.ed.run()}" data-id="btnRun" title="Ctrl+Enter" class="flat">${r(Icons.triangleRight)}Run</button>`
			},
			findReplace: {
				html: r`<button onclick="${e => this.ed.toggleSearchPanel()}" class="flat" title="Find and replace (ctrl+f)">${r(Icons.findReplace)}</button>`,
				update: (el, sel) => el.classList.toggle('selected', this.ed.isSearchPanelOpen())
			}
		};
		
		if (typeof buttons === 'string')
			buttons = buttons.split(/[,\s]+/g);
		
		for (let button of buttons||[]) {
			let item = typeof button === 'string'
				? this.buttonTemplates[button]
				: button;
			if (!item)
				throw new Error('Invalid button ' + button);
			this.buttons.push(item);
		}

		this.render();
		
		Util.on(this, 'mousedown', '[data-id=buttonEls] .icon', e => {
			let btn = e.target.closest('.icon');
			
			if (btn.hasAttribute('disabled')) {
				e.stopPropagation();
				e.stopImmediatePropagation();
				e.preventDefault();
				return false;
			}
		});
		
		this.update();
	}

	command(e, func) {
		e.preventDefault(); // Don't lose focus
		this.ed[func]();
	}

	/**
	 * Update toolbar buttons depending on the editor state*/
	update() {
		for (let i in this.buttons) {
			let button = this.buttons[i];
			if (button.update)
				button.update(this.buttonEls.children[i], this);
		}
	}

	render() {
		this.html = r`
		<code-editor-toolbar>
			<style>
				:host { display: block }
				:host [data-id='buttonEls'] span { user-select: none }
				:host .blockSelect [data-id='dropdown'] > div span { opacity: .5 } /* Hotkey text */
			</style>
		
			<div data-id="buttonEls" class="row wrap center-v toolbar">
				${this.buttons.map(button => button.html || button)}
			</div>
		
			<!--
			Run
			Word wrap
			format
			find/replace
			undo/redo
			show line numbers
			-->		
		</code-editor-toolbar>`
	}

}
CodeEditorToolbar.define();


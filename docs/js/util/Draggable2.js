/**
 * Add events for drag start, drag, and drag stop to an element.
 * When callback functions are called, the "this" variable will be the HTMLElement being dragged, when mouseDown first occurred.
 *
 * @param options {object}
 * @param options.onStart {function(e:MouseEvent, draggable:Draggable):bool} Called on mousedown.
 *     If this function returns false, dragging will be canceled.
 * @param options.onMove {function(e:MouseEvent, draggable:Draggable)}  Called with the distance the mouse has moved while dragging.
 * @param options.onStop {function(e:MouseEvent, draggable:Draggable)} Called when dragging stops.
 *
 * @param options.selector {string=} If set, apply drag events to children that match this selector,
 *     instead of the element itself.
 *
 * @example
 * new Draggable(th, {
 *     onMove: (draggable, e) => {
 *         console.log(draggable.totalDist)
 * 	   }
 * });
 */
export default class Draggable {

	/** @type {HTMLElement} */
	el;
	options = {};

	startPosition;
	clientStart;
	
	/** @type {{x:int, y:int}} Distance the mouse moved since the last onMove() call. */
	dist;
	
	/** @type {{x:int, y:int}} Total distance the mouse moved since dragging started. */
	totalDist;


	/** @type {HTMLElement} The node clicked when dragging starts.  Can be el or a child of el.*/
	target;

	/** @type {boolean} */
	moved;

	/** @type {HTMLElement} */
	mask;

	constructor(el, options) {
		this.el = el;
		this.options = options;

		// Mask is needed to still grab move events when over iframe.
		let div = document.createElement('div');
		div.innerHTML = `
			<div class="mask" style="position: absolute; inset: 0;  z-index: 32767; user-select: none; pointer-events: none"></div>`;
		this.mask = div.children[0];
		//this.mask.style.height = document.body.scrollHeight + 'px';
		this.mask.remove(); // so it will be appended on the next move.

		// Make sure the "this" object is always the Draggable and not the event target.
		this.mousedown = this.mousedown.bind(this);
		this.mousemove = this.mousemove.bind(this);
		this.mouseup = this.mouseup.bind(this);
		this.scroll = this.scroll.bind(this);

		this.el.addEventListener('mousedown', this.mousedown);

		// this.trace = new Error().stack
	}

	mousedown(e) {
		// Prevent selecting text when dragging.
		this.moved = false;
		this.startPosition = {x: e.pageX, y: e.pageY};
		this.clientStart = {x: e.clientX, y: e.clientY};
		this.totalDist = {x:0, y:0};

		this.lastScroll = {x: document.documentElement.scrollLeft, y: document.documentElement.scrollTop};

		if (!this.options.onStart || this.options.onStart(e, this) !== false) {
			e.preventDefault(); // Required after Chromium 124.

			this.target = this.options.selector ? e.target.closest(this.options.selector) : this.el.contains(e.target) ? this.el : null;
			if (this.target) {
				this.mask.style.cursor = getComputedStyle(e.target).cursor;
				document.addEventListener('mousemove', this.mousemove);
				document.addEventListener('mouseup', this.mouseup);
				document.addEventListener('scroll', this.scroll, true);
			}
		}

	}

	mousemove(e=null) {
		if (e) {
			this.dist = {
				x: e.pageX - this.startPosition.x - this.totalDist.x,
				y: e.pageY - this.startPosition.y - this.totalDist.y
			};
			this.totalDist = {
				x: e.pageX - this.startPosition.x,
				y: e.pageY - this.startPosition.y
			};
		}
		this.moved = this.moved || this.totalDist.x !== 0 || this.totalDist.y !== 0;
		if (this.moved && this.options.onMove)
			this.options.onMove(e||{}, this); // TODO: reorder or only pass mouseDown?

		if (!this.mask.parentNode)
			document.body.append(this.mask);
		if (e)
			e.preventDefault();
	}

	mouseup(e) {
		this.cleanup();

		// TODO: Capture the drop target, instead of it being the mask.
		if (this.moved && this.options.onStop)
			this.options.onStop(e, this);
	}

	scroll(e) {
		let newScroll = {x: document.documentElement.scrollLeft, y: document.documentElement.scrollTop};
		this.dist = {
			x: newScroll.x - this.lastScroll.x,
			y: newScroll.y - this.lastScroll.y
		}

		this.totalDist.x += newScroll.x - this.lastScroll.x;
		this.totalDist.y += newScroll.y - this.lastScroll.y;
		this.mousemove();

		this.lastScroll = newScroll;
	}

	cleanup() {
		document.removeEventListener('mousemove', this.mousemove);
		document.removeEventListener('mouseup', this.mouseup);
		document.removeEventListener('scroll', this.scroll, true);
		this.mask.remove();
		this.target = null;
	}
}

/** @deprecated */
function pauseEvent(e){ // stackoverflow.com/a/5432363
	if(e.stopPropagation) e.stopPropagation();
	if(e.preventDefault) e.preventDefault();
	e.cancelBubble=true; // deprecated?
	e.returnValue=false; // deprecated?
	return false;
}

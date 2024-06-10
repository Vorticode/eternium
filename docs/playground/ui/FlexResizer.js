import {Red, r, getArg} from "../redcomponent/RedComponent.js";
import Draggable2 from "../util/Draggable2.js";
import Util from "../util/Util.js";

/**
 * Put this element between flex children to allow resizing them.
 * TODO: Allow vertical resizing. */
export default class FlexResizer extends Red {

	onStart = Util.callback();
	onMove = Util.callback();
	onStop = Util.callback();
	
	/**
	 * @param unit {string} Can be 'px' or '%'
	 * @param thickness {int} Width of the resize drag area.*/
	constructor({unit='px', thickness=10}={}) {
		super();
		this.thickness = parseFloat(getArg(this, 'thickness', thickness));
		this.unit =  getArg(this, 'unit', unit, ['px', '%']) || 'px';

		let prevEl, startSize, isVertical;
		let iframePointerEvents = new WeakMap(); // Store values of iframe pointer events.
		let draggable = new Draggable2(this, {
			onStart: e => {
				isVertical = this.isVertical();
				prevEl = this.previousElementSibling;
				startSize =  isVertical ? prevEl.offsetWidth : prevEl.offsetHeight;
				
				// Disable iframes
				for (let iframe of this.ownerDocument.querySelectorAll('iframe')) {
					iframePointerEvents.set(iframe, iframe.style.pointerEvents);
					iframe.style.pointerEvents = 'none';
				}
				
				this.onStart(draggable, e);
			},
			onMove: e => {
				let parentSizePx = isVertical
					? this.parentNode.offsetWidth
					: this.parentNode.offsetHeight;
				let dragDist = isVertical
					? draggable.totalDist.x
					: draggable.totalDist.y;
				let parentSize = this.unit==='%' ? 100 : parentSizePx;
				let newSize = this.unit==='%'
					? (startSize + dragDist) / parentSizePx * 100
					: (startSize + dragDist);
				if (newSize > parentSize)
					newSize = parentSize;
				this.setSize(newSize);
				this.onMove(draggable, e);
			},
			onStop: e => {
				
				// Re-enable iframes.
				for (let iframe of this.ownerDocument.querySelectorAll('iframe'))
					iframe.style.pointerEvents = iframePointerEvents.get(iframe); // restore prev value
				
				this.onStop(draggable, e);
			}
		});
	}
	
	isVertical() {
		return getComputedStyle(this.parentNode).flexDirection !== 'column';
	}

	/** @return {Number} */
	getSize() {
		let prev;
		let prev2 = this;
		while (prev2 = prev2.previousElementSibling) {
			if (prev2.style.display !== 'none' && prev2.tagName !== 'flex-resizer') {
				prev = prev2;
				break;
			}
		}

		return (this.isVertical() ? prev?.offsetWidth : prev?.offsetHeight) || 0;
	}

	/**
	 * @param size {Number} Width in pixels or percent. */
	setSize(size) {
		let prevEl = this.previousElementSibling;
		let nextEl = this.nextElementSibling;
        if (size < 0)
            size = 0;
		
		if (prevEl) {
			if (this.isVertical()) {
				if (nextEl) {
					let totalWidth = this.unit === '%'
						? (prevEl.offsetWidth + nextEl.offsetWidth) / this.parentNode.offsetWidth * 100
						: (prevEl.offsetWidth + nextEl.offsetWidth);
                    if (totalWidth - size < 0)
                        size = totalWidth;

					nextEl.style.minWidth = (totalWidth - size) + this.unit;
					nextEl.style.maxWidth = (totalWidth - size) + this.unit;
				}
				prevEl.style.minWidth = size + this.unit;
				prevEl.style.maxWidth = size + this.unit;
			}
			else {
				if (nextEl) {
					let totalHeight = this.unit === '%'
						? (prevEl.offsetHeight + nextEl.offsetHeight) / this.parentNode.offsetHeight * 100
						: (prevEl.offsetHeight + nextEl.offsetHeight);
                    if (totalHeight - size < 0)
                        size = totalHeight;
					nextEl.style.minHeight = (totalHeight - size) + this.unit;
					nextEl.style.maxHeight = (totalHeight - size) + this.unit;
				}
				
				prevEl.style.minHeight = size + this.unit;
				prevEl.style.maxHeight = size + this.unit;
			}
		}
	}

	render() {
		r(this)`
		<flex-resizer>
			<style>
				:host {
					display: block; z-index: 1;
				
					/* We put the resize region (the margin thickness) all to the right / top bc vertical scrollbars are often to the left, and tab bars below the top. */
					${this.isVertical()
						? `min-width: ${this.thickness-1}px !important; max-width: ${this.thickness-1}px !important;
							margin-left: -1px; margin-right: -${this.thickness-1}px; cursor: ew-resize`
						: `min-height: ${this.thickness}px !important; max-height: ${this.thickness}px !important;
							margin-top: -${this.thickness/2}px; margin-bottom: -${this.thickness/2}px; cursor: ns-resize`
					};
				}
			</style>
		</flex-resizer>
	`}
}
customElements.define('flex-resizer', FlexResizer);
//#IFDEV
/*@__NO_SIDE_EFFECTS__*/
export function assert(val) {
	if (!val) {
		debugger;
		throw new Error('Assertion failed: ' + val);
	}
}
//#ENDIF
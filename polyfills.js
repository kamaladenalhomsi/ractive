(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

// TODO: remove this once 1.0 lands because it might be referenced in the wild for 0.9
// eslint-disable-next-line no-console
console.log(
  'You no longer need to include the Ractive polyfills, as everything for IE9+ is now included in the main build.'
);

})));
//# sourceMappingURL=polyfills.js.map
import { removeFromArray } from 'utils/array';
import { handleChange } from 'shared/methodCallers';

export default class IndexReferenceResolver {
	constructor ( fragment, indexRef, callback ) {
		this.callback = callback;

		this.deps = [];
		this.value = indexRef === '@index' ? fragment.index : fragment.indexRefs[ indexRef ];

		callback( this );

		// we need to attach this to the repeated fragment that this is
		// an index of, so that we get notified on changes
		if ( indexRef !== '@index' ) {
			while ( fragment ) {
				if ( fragment.indexRef === indexRef ) break;
				fragment = fragment.parent || fragment.componentParent;
			}
		}

		// with @index, we just need to find the closest repeated fragment
		else {
			while ( fragment ) {
				if ( fragment.indexRefResolvers ) break;
				fragment = fragment.parent || fragment.componentParent;
			}
		}

		this.fragment = fragment;

		( fragment.indexRefResolvers[ this.value ] || ( fragment.indexRefResolvers[ this.value ] = [] ) ).push( this );
		this.resolved = true;
	}

	getKeypath () {
		return '@index';
	}

	register ( dep ) {
		this.deps.push( dep );
	}

	unbind () {
		// TODO is this correct?
		removeFromArray( this.fragment.indexRefResolvers[ this.value ], this );
	}

	unregister ( dep ) {
		removeFromArray( this.deps, dep );
	}

	update ( newValue ) {
		this.value = newValue;
		this.deps.forEach( handleChange );
	}
}

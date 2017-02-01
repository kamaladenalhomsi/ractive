import { initModule } from '../../helpers/test-config';

export default function() {
	initModule( 'methods/findContainer.js' );

	QUnit.test( '.findContainer() finds container component', t => {
		const ractive = new Ractive({
			template: '<Outer><Mid><Inner/></Mid></Outer>',
			components: {
				Outer: Ractive.extend({ template: '{{yield}}' }),
				Mid: Ractive.extend({ template: '{{yield}}' }),
				Inner: Ractive.extend()
			}
		});

		t.strictEqual( ractive.findComponent( 'Inner' ).findContainer( 'Mid' ), ractive.findComponent( 'Mid' ) );
		t.strictEqual( ractive.findComponent( 'Inner' ).findContainer( 'Outer' ), ractive.findComponent( 'Outer' ) );
		t.strictEqual( ractive.findComponent( 'Inner' ).findContainer( 'nope' ), null );
	});
}

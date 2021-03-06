import { fatal, warnIfDebug, welcome } from 'utils/log';
import { missingPlugin } from 'config/errors';
import { ensureArray, combine } from 'utils/array';
import { findInViewHierarchy } from 'shared/registry';
import dataConfigurator from './config/custom/data';
import RootModel from 'src/model/RootModel';
import hooks from 'src/events/Hook';
import subscribe from './helpers/subscribe';
import Ractive from '../Ractive';
import { ATTRIBUTE, BINDING_FLAG, DECORATOR, INTERPOLATOR, TRANSITION } from 'config/types';
import { assign, create, hasOwn } from 'utils/object';
import { isArray, isString } from 'utils/is';
import { compute } from 'src/Ractive/prototype/compute';
import getRactiveContext from '../shared/getRactiveContext';

const registryNames = [
  'adaptors',
  'components',
  'decorators',
  'easing',
  'events',
  'interpolators',
  'partials',
  'transitions'
];

const protoRegistries = ['computed', 'helpers'];

let uid = 0;

export default function construct(ractive, options) {
  if (Ractive.DEBUG) welcome();

  initialiseProperties(ractive);
  handleAttributes(ractive);

  // set up event subscribers
  subscribe(ractive, options, 'on');

  // if there's not a delegation setting, inherit from parent if it's not default
  if (
    !hasOwn(options, 'delegate') &&
    ractive.parent &&
    ractive.parent.delegate !== ractive.delegate
  ) {
    ractive.delegate = false;
  }

  // plugins that need to run at construct
  if (isArray(options.use)) {
    ractive.use.apply(ractive, options.use.filter(p => p.construct));
  }

  hooks.construct.fire(ractive, options);
  if (options.onconstruct) options.onconstruct.call(ractive, getRactiveContext(ractive), options);

  // Add registries
  let i = registryNames.length;
  while (i--) {
    const name = registryNames[i];
    ractive[name] = assign(create(ractive.constructor[name] || null), options[name]);
  }

  i = protoRegistries.length;
  while (i--) {
    const name = protoRegistries[i];
    ractive[name] = assign(create(ractive.constructor.prototype[name]), options[name]);
  }

  if (ractive._attributePartial) {
    ractive.partials['extra-attributes'] = ractive._attributePartial;
    delete ractive._attributePartial;
  }

  // Create a viewmodel
  const viewmodel = new RootModel({
    adapt: getAdaptors(ractive, ractive.adapt, options),
    data: dataConfigurator.init(ractive.constructor, ractive, options),
    ractive
  });

  // once resolved, share the adaptors array between the root model and instance
  ractive.adapt = viewmodel.adaptors;

  ractive.viewmodel = viewmodel;

  for (const k in ractive.computed) {
    compute.call(ractive, k, ractive.computed[k]);
  }
}

function getAdaptors(ractive, protoAdapt, options) {
  protoAdapt = protoAdapt.map(lookup);
  const adapt = ensureArray(options.adapt).map(lookup);

  const srcs = [protoAdapt, adapt];
  if (ractive.parent && !ractive.isolated) {
    srcs.push(ractive.parent.viewmodel.adaptors);
  }

  return combine.apply(null, srcs);

  function lookup(adaptor) {
    if (isString(adaptor)) {
      adaptor = findInViewHierarchy('adaptors', ractive, adaptor);

      if (!adaptor) {
        fatal(missingPlugin(adaptor, 'adaptor'));
      }
    }

    return adaptor;
  }
}

function initialiseProperties(ractive) {
  // Generate a unique identifier, for places where you'd use a weak map if it
  // existed
  ractive._guid = 'r-' + uid++;

  // events
  ractive._subs = create(null);
  ractive._nsSubs = 0;

  // storage for item configuration from instantiation to reset,
  // like dynamic functions or original values
  ractive._config = {};

  // events
  ractive.event = null;
  ractive._eventQueue = [];

  // observers
  ractive._observers = [];

  // external children
  ractive._children = [];
  ractive._children.byName = {};
  ractive.children = ractive._children;

  if (!ractive.component) {
    ractive.root = ractive;
    ractive.parent = ractive.container = null; // TODO container still applicable?
  }
}

function handleAttributes(ractive) {
  const component = ractive.component;
  const attributes = ractive.constructor.attributes;

  if (attributes && component) {
    const tpl = component.template;
    const attrs = tpl.m ? tpl.m.slice() : [];

    // grab all of the passed attribute names
    const props = attrs.filter(a => a.t === ATTRIBUTE).map(a => a.n);

    // warn about missing requireds
    attributes.required.forEach(p => {
      if (!~props.indexOf(p)) {
        warnIfDebug(`Component '${component.name}' requires attribute '${p}' to be provided`);
      }
    });

    // set up a partial containing non-property attributes
    const all = attributes.optional.concat(attributes.required);
    const partial = [];
    let i = attrs.length;
    while (i--) {
      const a = attrs[i];
      if (a.t === ATTRIBUTE && !~all.indexOf(a.n)) {
        if (attributes.mapAll) {
          // map the attribute if requested and make the extra attribute in the partial refer to the mapping
          partial.unshift({
            t: ATTRIBUTE,
            n: a.n,
            f: [{ t: INTERPOLATOR, r: `~/${a.n}` }]
          });
        } else {
          // transfer the attribute to the extra attributes partal
          partial.unshift(attrs.splice(i, 1)[0]);
        }
      } else if (
        !attributes.mapAll &&
        (a.t === DECORATOR || a.t === TRANSITION || a.t === BINDING_FLAG)
      ) {
        partial.unshift(attrs.splice(i, 1)[0]);
      }
    }

    if (partial.length) component.template = { t: tpl.t, e: tpl.e, f: tpl.f, m: attrs, p: tpl.p };
    ractive._attributePartial = partial;
  }
}

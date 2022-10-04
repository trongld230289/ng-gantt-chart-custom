import moment, { duration } from 'moment';
import { of } from 'rxjs';

function noop() { }
function assign(tar, src) {
	// @ts-ignore
	for (const k in src)
		tar[k] = src[k];
	return tar;
}
function run(fn) {
	return fn();
}
function blank_object() {
	return Object.create(null);
}
function run_all(fns) {
	fns.forEach(run);
}
function is_function(thing) {
	return typeof thing === 'function';
}
function safe_not_equal(a, b) {
	return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function subscribe(store, ...callbacks) {
	if (store == null) {
		return noop;
	}
	const unsub = store.subscribe(...callbacks);
	return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
	let value;
	subscribe(store, _ => value = _)();
	return value;
}
function component_subscribe(component, store, callback) {
	component.$$.on_destroy.push(subscribe(store, callback));
}
function create_slot(definition, ctx, $$scope, fn) {
	if (definition) {
		const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
		return definition[0](slot_ctx);
	}
}
function get_slot_context(definition, ctx, $$scope, fn) {
	return definition[1] && fn
		? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
		: $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
	if (definition[2] && fn) {
		const lets = definition[2](fn(dirty));
		if ($$scope.dirty === undefined) {
			return lets;
		}
		if (typeof lets === 'object') {
			const merged = [];
			const len = Math.max($$scope.dirty.length, lets.length);
			for (let i = 0; i < len; i += 1) {
				merged[i] = $$scope.dirty[i] | lets[i];
			}
			return merged;
		}
		return $$scope.dirty | lets;
	}
	return $$scope.dirty;
}
function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
	const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
	if (slot_changes) {
		const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
		slot.p(slot_context, slot_changes);
	}
}
function exclude_internal_props(props) {
	const result = {};
	for (const k in props)
		if (k[0] !== '$')
			result[k] = props[k];
	return result;
}
function compute_rest_props(props, keys) {
	const rest = {};
	keys = new Set(keys);
	for (const k in props)
		if (!keys.has(k) && k[0] !== '$')
			rest[k] = props[k];
	return rest;
}
function null_to_empty(value) {
	return value == null ? '' : value;
}
function set_store_value(store, ret, value = ret) {
	store.set(value);
	return ret;
}
async function set_store_value_async(store, ret, value = ret) {
	store.set(value);
	return ret;
}
function action_destroyer(action_result) {
	return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
}

function append(target, node) {
	target.appendChild(node);
}
function insert(target, node, anchor) {
	target.insertBefore(node, anchor || null);
}
function detach(node) {
	node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
	for (let i = 0; i < iterations.length; i += 1) {
		if (iterations[i])
			iterations[i].d(detaching);
	}
}
function element(name) {
	return document.createElement(name);
}
function svg_element(name) {
	return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
	return document.createTextNode(data);
}
function space() {
	return text(' ');
}
function empty() {
	return text('');
}
function listen(node, event, handler, options) {
	node.addEventListener(event, handler, options);
	return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
	if (value == null)
		node.removeAttribute(attribute);
	else if (node.getAttribute(attribute) !== value)
		node.setAttribute(attribute, value);
}
function children(element) {
	return Array.from(element.childNodes);
}
function set_data(text, data) {
	data = '' + data;
	if (text.data !== data)
		text.data = data;
}
function set_style(node, key, value, important) {
	node && node.style.setProperty(key, value, important ? 'important' : '');
}
// unfortunately this can't be a constant as that wouldn't be tree-shakeable
// so we cache the result instead
let crossorigin;
function is_crossorigin() {
	if (crossorigin === undefined) {
		crossorigin = false;
		try {
			if (typeof window !== 'undefined' && window.parent) {
				void window.parent.document;
			}
		}
		catch (error) {
			crossorigin = true;
		}
	}
	return crossorigin;
}
function add_resize_listener(node, fn) {
	const computed_style = getComputedStyle(node);
	const z_index = (parseInt(computed_style.zIndex) || 0) - 1;
	if (computed_style.position === 'static') {
		node.style.position = 'relative';
	}
	const iframe = element('iframe');
	iframe.setAttribute('style', `display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ` +
		`overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: ${z_index};`);
	iframe.setAttribute('aria-hidden', 'true');
	iframe.tabIndex = -1;
	const crossorigin = is_crossorigin();
	let unsubscribe;
	if (crossorigin) {
		iframe.src = `data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>`;
		unsubscribe = listen(window, 'message', (event) => {
			if (event.source === iframe.contentWindow)
				fn();
		});
	}
	else {
		iframe.src = 'about:blank';
		iframe.onload = () => {
			unsubscribe = listen(iframe.contentWindow, 'resize', fn);
		};
	}
	append(node, iframe);
	return () => {
		if (crossorigin) {
			unsubscribe();
		}
		else if (unsubscribe && iframe.contentWindow) {
			unsubscribe();
		}
		detach(iframe);
	};
}
function toggle_class(element, name, toggle) {
	element.classList[toggle ? 'add' : 'remove'](name);
}
function custom_event(type, detail) {
	const e = document.createEvent('CustomEvent');
	e.initCustomEvent(type, false, false, detail);
	return e;
}
class HtmlTag {
	constructor(anchor = null) {
		this.a = anchor;
		this.e = this.n = null;
	}
	m(html, target, anchor = null) {
		if (!this.e) {
			this.e = element(target.nodeName);
			this.t = target;
			this.h(html);
		}
		this.i(anchor);
	}
	h(html) {
		this.e.innerHTML = html;
		this.n = Array.from(this.e.childNodes);
	}
	i(anchor) {
		for (let i = 0; i < this.n.length; i += 1) {
			insert(this.t, this.n[i], anchor);
		}
	}
	p(html) {
		this.d();
		this.h(html);
		this.i(this.a);
	}
	d() {
		this.n.forEach(detach);
	}
}

let current_component;
function set_current_component(component) {
	current_component = component;
}
function get_current_component() {
	if (!current_component)
		throw new Error(`Function called outside component initialization`);
	return current_component;
}
function onMount(fn) {
	get_current_component().$$.on_mount.push(fn);
}
function onDestroy(fn) {
	get_current_component().$$.on_destroy.push(fn);
}
function createEventDispatcher() {
	const component = get_current_component();
	return (type, detail) => {
		const callbacks = component.$$.callbacks[type];
		if (callbacks) {
			// TODO are there situations where events could be dispatched
			// in a server (non-DOM) environment?
			const event = custom_event(type, detail);
			callbacks.slice().forEach(fn => {
				fn.call(component, event);
			});
		}
	};
}
function setContext(key, context) {
	get_current_component().$$.context.set(key, context);
}
function getContext(key) {
	return get_current_component().$$.context.get(key);
}
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
	const callbacks = component.$$.callbacks[event.type];
	if (callbacks) {
		callbacks.slice().forEach(fn => fn(event));
	}
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
	if (!update_scheduled) {
		update_scheduled = true;
		resolved_promise.then(flush);
	}
}
function tick() {
	schedule_update();
	return resolved_promise;
}
function add_render_callback(fn) {
	render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
	if (flushing)
		return;
	flushing = true;
	do {
		// first, call beforeUpdate functions
		// and update components
		for (let i = 0; i < dirty_components.length; i += 1) {
			const component = dirty_components[i];
			set_current_component(component);
			update(component.$$);
		}
		dirty_components.length = 0;
		while (binding_callbacks.length)
			binding_callbacks.pop()();
		// then, once components are updated, call
		// afterUpdate functions. This may cause
		// subsequent updates...
		for (let i = 0; i < render_callbacks.length; i += 1) {
			const callback = render_callbacks[i];
			if (!seen_callbacks.has(callback)) {
				// ...so guard against infinite loops
				seen_callbacks.add(callback);
				callback();
			}
		}
		render_callbacks.length = 0;
	} while (dirty_components.length);
	while (flush_callbacks.length) {
		flush_callbacks.pop()();
	}
	update_scheduled = false;
	flushing = false;
	seen_callbacks.clear();
}
function update($$) {
	if ($$.fragment !== null) {
		$$.update();
		run_all($$.before_update);
		const dirty = $$.dirty;
		$$.dirty = [-1];
		$$.fragment && $$.fragment.p($$.ctx, dirty);
		$$.after_update.forEach(add_render_callback);

		if ($$.ctx[6] && $$.ctx[0]) {
            const { x, width } = $$.ctx[6];
            const updatedTask = StelteGanttScopeHolder.displayedTasks
                .find(taskModel => taskModel.model.id === $$.ctx[0].id);
            if(updatedTask) {
                updatedTask.left = x;
                updatedTask.width = width;
                const y = updatedTask.y + 3;
                const element = document.querySelector(`[data-task-id="${$$.ctx[0].id}"]`);
                set_style(element,"transform",`translate(${x}px, ${y}px)`);
            }
        }
	}
}
const outroing = new Set();
let outros;
function group_outros() {
	outros = {
		r: 0,
		c: [],
		p: outros // parent group
	};
}
function check_outros() {
	if (!outros.r) {
		run_all(outros.c);
	}
	outros = outros.p;
}
function transition_in(block, local) {
	if (block && block.i) {
		outroing.delete(block);
		block.i(local);
	}
}
function transition_out(block, local, detach, callback) {
	if (block && block.o) {
		if (outroing.has(block))
			return;
		outroing.add(block);
		outros.c.push(() => {
			outroing.delete(block);
			if (callback) {
				if (detach)
					block.d(1);
				callback();
			}
		});
		block.o(local);
	}
}
function outro_and_destroy_block(block, lookup) {
	transition_out(block, 1, 1, () => {
		lookup.delete(block.key);
	});
}
function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
	let o = old_blocks.length;
	let n = list.length;
	let i = o;
	const old_indexes = {};
	while (i--)
		old_indexes[old_blocks[i].key] = i;
	const new_blocks = [];
	const new_lookup = new Map();
	const deltas = new Map();
	i = n;
	while (i--) {
		const child_ctx = get_context(ctx, list, i);
		const key = get_key(child_ctx);
		let block = lookup.get(key);
		if (!block) {
			block = create_each_block(key, child_ctx);
			block.c();
		}
		else if (dynamic) {
			block.p(child_ctx, dirty);
		}
		new_lookup.set(key, new_blocks[i] = block);
		if (key in old_indexes)
			deltas.set(key, Math.abs(i - old_indexes[key]));
	}
	const will_move = new Set();
	const did_move = new Set();
	function insert(block) {
		transition_in(block, 1);
		block.m(node, next);
		lookup.set(block.key, block);
		next = block.first;
		n--;
	}
	while (o && n) {
		const new_block = new_blocks[n - 1];
		const old_block = old_blocks[o - 1];
		const new_key = new_block.key;
		const old_key = old_block.key;
		if (new_block === old_block) {
			// do nothing
			next = new_block.first;
			o--;
			n--;
		}
		else if (!new_lookup.has(old_key)) {
			// remove old block
			destroy(old_block, lookup);
			o--;
		}
		else if (!lookup.has(new_key) || will_move.has(new_key)) {
			insert(new_block);
		}
		else if (did_move.has(old_key)) {
			o--;
		}
		else if (deltas.get(new_key) > deltas.get(old_key)) {
			did_move.add(new_key);
			insert(new_block);
		}
		else {
			will_move.add(old_key);
			o--;
		}
	}
	while (o--) {
		const old_block = old_blocks[o];
		if (!new_lookup.has(old_block.key))
			destroy(old_block, lookup);
	}
	while (n)
		insert(new_blocks[n - 1]);
	return new_blocks;
}

function get_spread_update(levels, updates) {
	const update = {};
	const to_null_out = {};
	const accounted_for = { $$scope: 1 };
	let i = levels.length;
	while (i--) {
		const o = levels[i];
		const n = updates[i];
		if (n) {
			for (const key in o) {
				if (!(key in n))
					to_null_out[key] = 1;
			}
			for (const key in n) {
				if (!accounted_for[key]) {
					update[key] = n[key];
					accounted_for[key] = 1;
				}
			}
			levels[i] = n;
		}
		else {
			for (const key in o) {
				accounted_for[key] = 1;
			}
		}
	}
	for (const key in to_null_out) {
		if (!(key in update))
			update[key] = undefined;
	}
	return update;
}
function get_spread_object(spread_props) {
	return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
}
function create_component(block) {
	block && block.c();
}
function mount_component(component, target, anchor) {
	const { fragment, on_mount, on_destroy, after_update } = component.$$;
	fragment && fragment.m(target, anchor);
	// onMount happens before the initial afterUpdate
	add_render_callback(() => {
		const new_on_destroy = on_mount.map(run).filter(is_function);
		if (on_destroy) {
			on_destroy.push(...new_on_destroy);
		}
		else {
			// Edge case - component was destroyed immediately,
			// most likely as a result of a binding initialising
			run_all(new_on_destroy);
		}
		component.$$.on_mount = [];
	});
	after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
	const $$ = component.$$;
	if ($$.fragment !== null) {
		run_all($$.on_destroy);
		$$.fragment && $$.fragment.d(detaching);
		// TODO null out other refs, including component.$$ (but need to
		// preserve final state?)
		$$.on_destroy = $$.fragment = null;
		$$.ctx = [];
	}
}
function make_dirty(component, i) {
	if (component.$$.dirty[0] === -1) {
		dirty_components.push(component);
		schedule_update();
		component.$$.dirty.fill(0);
	}
	component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
	const parent_component = current_component;
	set_current_component(component);
	const prop_values = options.props || {};
	const $$ = component.$$ = {
		fragment: null,
		ctx: null,
		// state
		props,
		update: noop,
		not_equal,
		bound: blank_object(),
		// lifecycle
		on_mount: [],
		on_destroy: [],
		before_update: [],
		after_update: [],
		context: new Map(parent_component ? parent_component.$$.context : []),
		// everything else
		callbacks: blank_object(),
		dirty
	};
	let ready = false;
	$$.ctx = instance
		? instance(component, prop_values, (i, ret, ...rest) => {
			const value = rest.length ? rest[0] : ret;
			if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
				if ($$.bound[i])
					$$.bound[i](value);
				if (ready)
					make_dirty(component, i);
			}
			return ret;
		})
		: [];
	$$.update();
	ready = true;
	run_all($$.before_update);
	// `false` as a special case of no DOM component
	$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
	if (options.target) {
		if (options.hydrate) {
			const nodes = children(options.target);
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			$$.fragment && $$.fragment.l(nodes);
			nodes.forEach(detach);
		}
		else {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			$$.fragment && $$.fragment.c();
		}
		if (options.intro)
			transition_in(component.$$.fragment);
		mount_component(component, options.target, options.anchor);
		flush();
	}
	set_current_component(parent_component);
}
class SvelteComponent {
	$destroy() {
		destroy_component(this, 1);
		this.$destroy = noop;
	}
	$on(type, callback) {
		const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
		callbacks.push(callback);
		return () => {
			const index = callbacks.indexOf(callback);
			if (index !== -1)
				callbacks.splice(index, 1);
		};
	}
	$set() {
		// overridden by instance, if it has props
	}
}

const subscriber_queue = [];
/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
function readable(value, start) {
	return {
		subscribe: writable(value, start).subscribe,
	};
}
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
	let stop;
	const subscribers = [];
	function set(new_value) {
		if (safe_not_equal(value, new_value)) {
			value = new_value;
			if (stop) { // store is ready
				const run_queue = !subscriber_queue.length;
				for (let i = 0; i < subscribers.length; i += 1) {
					const s = subscribers[i];
					s[1]();
					subscriber_queue.push(s, value);
				}
				if (run_queue) {
					for (let i = 0; i < subscriber_queue.length; i += 2) {
						subscriber_queue[i][0](subscriber_queue[i + 1]);
					}
					subscriber_queue.length = 0;
				}
			}
		}
	}
	function update(fn) {
		set(fn(value));
	}
	function subscribe(run, invalidate = noop) {
		const subscriber = [run, invalidate];
		subscribers.push(subscriber);
		if (subscribers.length === 1) {
			stop = start(set) || noop;
		}
		run(value);
		return () => {
			const index = subscribers.indexOf(subscriber);
			if (index !== -1) {
				subscribers.splice(index, 1);
			}
			if (subscribers.length === 0) {
				stop();
				stop = null;
			}
		};
	}
	return { set, update, subscribe };
}
function derived(stores, fn, initial_value) {
	const single = !Array.isArray(stores);
	const stores_array = single
		? [stores]
		: stores;
	const auto = fn.length < 2;
	return readable(initial_value, (set) => {
		let inited = false;
		const values = [];
		let pending = 0;
		let cleanup = noop;
		const sync = () => {
			if (pending) {
				return;
			}
			cleanup();
			const result = fn(single ? values[0] : values, set);
			if (auto) {
				set(result);
			}
			else {
				cleanup = is_function(result) ? result : noop;
			}
		};
		const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
			values[i] = value;
			pending &= ~(1 << i);
			if (inited) {
				sync();
			}
		}, () => {
			pending |= (1 << i);
		}));
		inited = true;
		sync();
		return function stop() {
			run_all(unsubscribers);
			cleanup();
		};
	});
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __rest(s, e) {
	var t = {};
	for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
		t[p] = s[p];
	if (s != null && typeof Object.getOwnPropertySymbols === "function")
		for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
			if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
				t[p[i]] = s[p[i]];
		}
	return t;
}

function createEntityStore() {
	const { subscribe, set, update } = writable({ ids: [], entities: {} });
	return {
		set,
		_update: update,
		subscribe,
		add: (item) => update(({ ids, entities }) => ({
			ids: [...ids, item.model.id],
			entities: Object.assign(Object.assign({}, entities), { [item.model.id]: item })
		})),
		delete: (id) => update(state => {
			const _a = state.entities, _b = id, _ = _a[_b], entities = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
			return {
				ids: state.ids.filter(i => i !== id),
				entities
			};
		}),
		deleteAll: (ids) => update(state => {
			const entities = Object.assign({}, state.entities);
			const idState = {};
			ids.forEach(id => {
				delete entities[id];
				idState[id] = true;
			});
			return {
				ids: state.ids.filter(i => !idState[i]),
				entities
			};
		}),
		update: (item) => update(({ ids, entities }) => ({
			ids,
			entities: Object.assign(Object.assign({}, entities), { [item.model.id]: item })
		})),
		upsert: (item) => update(({ ids, entities }) => {
			const hasIndex = ids.indexOf(item.model.id) !== -1;
			return {
				ids: hasIndex ? ids : [...ids, item.model.id],
				entities: Object.assign(Object.assign({}, entities), { [item.model.id]: item })
			};
		}),
		upsertAll: (items) => update(state => {
			const entities = Object.assign({}, state.entities);
			const ids = [...state.ids];
			items.forEach(item => {
				if (!entities[item.model.id]) {
					ids.push(item.model.id);
				}
				entities[item.model.id] = item;
			});
			return {
				ids,
				entities
			};
		}),
		addAll: (items) => {
			const ids = [];
			const entities = {};
			for (const entity of items) {
				ids.push(entity.model.id);
				entities[entity.model.id] = entity;
			}
			set({ ids, entities });
		},
		refresh: () => update(store => (Object.assign({}, store)))
	};
}
const taskStore = createEntityStore();
const rowStore = createEntityStore();
const timeRangeStore = createEntityStore();
const allTasks = all(taskStore);
const allRows = all(rowStore);
const allTimeRanges = all(timeRangeStore);
const rowTaskCache = derived(allTasks, $allTasks => {
	return $allTasks.reduce((cache, task) => {
		if (!cache[task.model.resourceId])
			cache[task.model.resourceId] = [];
		cache[task.model.resourceId].push(task.model.id);
		return cache;
	}, {});
});
function all(store) {
	return derived(store, ({ ids, entities }) => ids.map(id => entities[id]));
}

function isLeftClick(event) {
	return event.which === 1;
}
/**
 * Gets mouse position within an element
 * @param node
 * @param event
 */
function getRelativePos(node, event) {
	const rect = node.getBoundingClientRect();
	const x = event.clientX - rect.left; //x position within the element.
	const y = event.clientY - rect.top; //y position within the element.
	return {
		x: x,
		y: y
	};
}
/**
 * Adds an event listener that triggers once.
 * @param target
 * @param type
 * @param listener
 * @param addOptions
 * @param removeOptions
 */
function addEventListenerOnce(target, type, listener, addOptions, removeOptions) {
	target.addEventListener(type, function fn(event) {
		target.removeEventListener(type, fn, removeOptions);
		listener.apply(this, arguments, addOptions);
	});
}
/**
 * Sets the cursor on an element. Globally by default.
 * @param cursor
 * @param node
 */
function setCursor(cursor, node = document.body) {
	node.style.cursor = cursor;
}

const MIN_DRAG_X = 2;
const MIN_DRAG_Y = 2;

/**
 * Applies dragging interaction to gantt elements
 */
class Draggable {
	constructor(node, settings) {
		this.dragging = false;
		this.resizing = false;
		this.resizeTriggered = false;
		this.onmousedown = (event) => {
			if (!isLeftClick(event)) {
				return;
			}
			event.stopPropagation();
			event.preventDefault();
			const canDrag = this.dragAllowed;
			const canResize = this.resizeAllowed;
			if (canDrag || canResize) {
				const x = this.settings.getX(event);
				const y = this.settings.getY(event);
				const width = this.settings.getWidth();
				this.initialX = event.clientX;
				this.initialY = event.clientY;
				this.mouseStartPosX = getRelativePos(this.settings.container, event).x - x;
				this.mouseStartPosY = getRelativePos(this.settings.container, event).y - y;
				this.mouseStartRight = x + width;
				if (canResize && this.mouseStartPosX < this.settings.resizeHandleWidth) {
					this.direction = 'left';
					this.resizing = true;
				}
				if (canResize && this.mouseStartPosX > width - this.settings.resizeHandleWidth) {
					this.direction = 'right';
					this.resizing = true;
				}
				if (canDrag && !this.resizing) {
					this.dragging = true;
				}
				if ((this.dragging || this.resizing) && this.settings.onDown) {
					this.settings.onDown({
						mouseEvent: event,
						x,
						width,
						y,
						resizing: this.resizing,
						dragging: this.dragging
					});
				}
				window.addEventListener('mousemove', this.onmousemove, false);
				addEventListenerOnce(window, 'mouseup', this.onmouseup);
			}
		};
		this.onmousemove = (event) => {
			if (!this.resizeTriggered) {
				if (Math.abs(event.clientX - this.initialX) > MIN_DRAG_X || Math.abs(event.clientY - this.initialY) > MIN_DRAG_Y) {
					this.resizeTriggered = true;
				}
				else {
					return;
				}
			}
			event.preventDefault();
			if (this.resizing) {
				const mousePos = getRelativePos(this.settings.container, event);
				const x = this.settings.getX(event);
				const width = this.settings.getWidth();
				let resultX;
				let resultWidth;
				if (this.direction === 'left') { //resize ulijevo
					if (mousePos.x > x + width) {
						this.direction = 'right';
						resultX = this.mouseStartRight;
						resultWidth = this.mouseStartRight - mousePos.x;
						this.mouseStartRight = this.mouseStartRight + width;
					}
					else {
						resultX = mousePos.x;
						resultWidth = this.mouseStartRight - mousePos.x;
					}
				}
				else if (this.direction === 'right') { //resize desno
					if (mousePos.x <= x) {
						this.direction = 'left';
						resultX = mousePos.x;
						resultWidth = x - mousePos.x;
						this.mouseStartRight = x;
					}
					else {
						resultX = x;
						resultWidth = mousePos.x - x;
					}
				}
				this.settings.onResize && this.settings.onResize({
					mouseEvent: event,
					x: resultX,
					width: resultWidth
				});
			}
			// mouseup
			if (this.dragging && this.settings.onDrag) {
				const mousePos = getRelativePos(this.settings.container, event);
				this.settings.onDrag({
					mouseEvent: event,
					x: mousePos.x - this.mouseStartPosX,
					y: mousePos.y - this.mouseStartPosY
				});
			}
		};
		this.onmouseup = (event) => {
			const x = this.settings.getX(event);
			const y = this.settings.getY(event);
			const width = this.settings.getWidth();
			this.settings.onMouseUp && this.settings.onMouseUp();
			if (this.resizeTriggered && this.settings.onDrop) {
				this.settings.onDrop({
					mouseEvent: event,
					x,
					y,
					width,
					dragging: this.dragging,
					resizing: this.resizing
				});
			}
			this.dragging = false;
			this.resizing = false;
			this.direction = null;
			this.resizeTriggered = false;
			window.removeEventListener('mousemove', this.onmousemove, false);
		};
		this.settings = settings;
		this.node = node;
		node.addEventListener('mousedown', this.onmousedown, false);
	}
	get dragAllowed() {
		if (typeof (this.settings.dragAllowed) === 'function') {
			return this.settings.dragAllowed();
		}
		else {
			return this.settings.dragAllowed;
		}
	}
	get resizeAllowed() {
		if (typeof (this.settings.resizeAllowed) === 'function') {
			return this.settings.resizeAllowed();
		}
		else {
			return this.settings.resizeAllowed;
		}
	}
	destroy() {
		this.node.removeEventListener('mousedown', this.onmousedown, false);
		this.node.removeEventListener('mousemove', this.onmousemove, false);
		this.node.removeEventListener('mouseup', this.onmouseup, false);
	}
}

class DragDropManager {
	constructor(rowStore) {
		this.handlerMap = {};
		this.register('row', (event) => {
			let elements = document.elementsFromPoint(event.clientX, event.clientY);
			let rowElement = elements.find((element) => !!element.getAttribute('data-row-id'));
			if (rowElement !== undefined) {
				const rowId = parseInt(rowElement.getAttribute('data-row-id'));
				const { entities } = get_store_value(rowStore);
				const targetRow = entities[rowId];
				if (targetRow.model.enableDragging) {
					return targetRow;
				}
			}
			return null;
		});
	}
	register(target, handler) {
		this.handlerMap[target] = handler;
	}
	getTarget(target, event) {
		//const rowCenterX = this.root.refs.mainContainer.getBoundingClientRect().left + this.root.refs.mainContainer.getBoundingClientRect().width / 2;
		var handler = this.handlerMap[target];
		if (handler) {
			return handler(event);
		}
	}
}

class TaskFactory {
	constructor(columnService) {
		this.columnService = columnService;
	}
	createTask(model) {
		// id of task, every task needs to have a unique one
		//task.id = task.id || undefined;
		// completion %, indicated on task
		model.amountDone = model.amountDone || 0;
		// css classes
		model.classes = model.classes || '';
		// datetime task starts on, currently moment-js object
		model.from = model.from || null;
		// datetime task ends on, currently moment-js object
		model.to = model.to || null;
		// label of task
		model.label = model.label || undefined;
		// html content of task, will override label
		model.html = model.html || undefined;
		// show button bar
		model.showButton = model.showButton || false;
		// button classes, useful for fontawesome icons
		model.buttonClasses = model.buttonClasses || '';
		// html content of button
		model.buttonHtml = model.buttonHtml || '';
		// enable dragging of task
		model.enableDragging = model.enableDragging === undefined ? true : model.enableDragging;
		const left = this.columnService.getPositionByDate(model.from) | 0;
		const right = this.columnService.getPositionByDate(model.to) | 0;
		return {
			model,
			left: left,
			width: right - left,
			height: this.getHeight(model),
			top: this.getPosY(model),
			reflections: []
		};
	}
	createTasks(tasks) {
		return tasks.map(task => this.createTask(task));
	}
	row(resourceId) {
		return this.rowEntities[resourceId];
	}
	getHeight(model) {
		return this.row(model.resourceId).height - 2 * this.rowPadding;
	}
	getPosY(model) {
		return this.row(model.resourceId).y + this.rowPadding;
	}
}
function reflectTask(task, row, options) {
	const reflectedId = `reflected-task-${task.model.id}-${row.model.id}`;
	const model = Object.assign(Object.assign({}, task.model), { resourceId: row.model.id, id: reflectedId, enableDragging: false });
	return Object.assign(Object.assign({}, task), { model, top: row.y + options.rowPadding, reflected: true, reflectedOnParent: true, reflectedOnChild: true, originalId: task.model.id });
}

/* src\entities\Task.svelte generated by Svelte v3.23.0 */

function create_if_block_4(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			attr(div, "class", "sg-task-background svelte-19txnoa");
			set_style(div, "width", /*model*/ ctx[0].amountDone + "%");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*model*/ 1) {
				set_style(div, "width", /*model*/ ctx[0].amountDone + "%");
			}
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (300:4) {:else}
function create_else_block(ctx) {
	let t_value = /*model*/ ctx[0].label + "";
	let t;
	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*model*/ 1 && t_value !== (t_value = /*model*/ ctx[0].label + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (298:26) 
function create_if_block_3(ctx) {
	let html_tag;
	let raw_value = /*taskContent*/ ctx[8](/*model*/ ctx[0]) + "";

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(raw_value, target, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*model*/ 1 && raw_value !== (raw_value = /*taskContent*/ ctx[8](/*model*/ ctx[0]) + "")) html_tag.p(raw_value);
		},
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

// (296:4) {#if model.html}
function create_if_block_2(ctx) {
	let html_tag;
	let raw_value = /*model*/ ctx[0].html + "";

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(raw_value, target, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*model*/ 1 && raw_value !== (raw_value = /*model*/ ctx[0].html + "")) html_tag.p(raw_value);
		},
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

// (302:4) {#if model.showButton}
function create_if_block_1(ctx) {
	let span;
	let raw_value = /*model*/ ctx[0].buttonHtml + "";
	let span_class_value;
	let mounted;
	let dispose;

	return {
		c() {
			span = element("span");
			attr(span, "class", span_class_value = "sg-task-button " + /*model*/ ctx[0].buttonClasses + " svelte-19txnoa");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			span.innerHTML = raw_value;

			if (!mounted) {
				dispose = listen(span, "click", /*onclick*/ ctx[3]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*model*/ 1 && raw_value !== (raw_value = /*model*/ ctx[0].buttonHtml + "")) span.innerHTML = raw_value;
			if (dirty[0] & /*model*/ 1 && span_class_value !== (span_class_value = "sg-task-button " + /*model*/ ctx[0].buttonClasses + " svelte-19txnoa")) {
				attr(span, "class", span_class_value);
			}
		},
		d(detaching) {
			if (detaching) detach(span);
			mounted = false;
			dispose();
		}
	};
}

// (309:2) {#if model.labelBottom}
function create_if_block(ctx) {
	let label;
	let t_value = /*model*/ ctx[0].labelBottom + "";
	let t;

	return {
		c() {
			label = element("label");
			t = text(t_value);
			attr(label, "class", "sg-label-bottom svelte-19txnoa");
		},
		m(target, anchor) {
			insert(target, label, anchor);
			append(label, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*model*/ 1 && t_value !== (t_value = /*model*/ ctx[0].labelBottom + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(label);
		}
	};
}

function create_fragment(ctx) {
	let div1;
	let t0;
	let div0;
	let t1;
	let t2;
	let div1_data_task_id_value;
	let div1_class_value;
	let mounted;
	let dispose;
	let if_block0 = /*model*/ ctx[0].amountDone && create_if_block_4(ctx);

	function select_block_type(ctx, dirty) {
		if (/*model*/ ctx[0].html) return create_if_block_2;
		if (/*taskContent*/ ctx[8]) return create_if_block_3;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block1 = current_block_type(ctx);
	let if_block2 = /*model*/ ctx[0].showButton && create_if_block_1(ctx);
	let if_block3 = /*model*/ ctx[0].labelBottom && create_if_block(ctx);

	return {
		c() {
			div1 = element("div");
			if (if_block0) if_block0.c();
			t0 = space();
			div0 = element("div");
			if_block1.c();
			t1 = space();
			if (if_block2) if_block2.c();
			t2 = space();
			if (if_block3) if_block3.c();
			attr(div0, "class", "sg-task-content svelte-19txnoa");
			attr(div1, "data-task-id", div1_data_task_id_value = /*model*/ ctx[0].id);
			attr(div1, "class", div1_class_value = "sg-task " + /*model*/ ctx[0].classes + " svelte-19txnoa");
			set_style(div1, "width", /*_position*/ ctx[6].width + "px");
			set_style(div1, "height", /*height*/ ctx[1] + "px"); //thangnaozay todo
			set_style(div1, "transform", "translate(" + /*_position*/ ctx[6].x + "px, " + /*_position*/ ctx[6].y + "px)");
			toggle_class(div1, "moving", /*_dragging*/ ctx[4] || /*_resizing*/ ctx[5]);
			toggle_class(div1, "selected", /*selected*/ ctx[7]);
			toggle_class(div1, "animating", animating);
			toggle_class(div1, "sg-task-reflected", /*reflected*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			if (if_block0) if_block0.m(div1, null);
			append(div1, t0);
			append(div1, div0);
			if_block1.m(div0, null);
			append(div0, t1);
			if (if_block2) if_block2.m(div0, null);
			append(div1, t2);
			if (if_block3) if_block3.m(div1, null);

			if (!mounted) {
				dispose = action_destroyer(ctx[10].call(null, div1));
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (/*model*/ ctx[0].amountDone) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_4(ctx);
					if_block0.c();
					if_block0.m(div1, t0);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
				if_block1.p(ctx, dirty);
			} else {
				if_block1.d(1);
				if_block1 = current_block_type(ctx);

				if (if_block1) {
					if_block1.c();
					if_block1.m(div0, t1);
				}
			}

			if (/*model*/ ctx[0].showButton) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_1(ctx);
					if_block2.c();
					if_block2.m(div0, null);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (/*model*/ ctx[0].labelBottom) {
				if (if_block3) {
					if_block3.p(ctx, dirty);
				} else {
					if_block3 = create_if_block(ctx);
					if_block3.c();
					if_block3.m(div1, null);
				}
			} else if (if_block3) {
				if_block3.d(1);
				if_block3 = null;
			}

			if (dirty[0] & /*model*/ 1 && div1_data_task_id_value !== (div1_data_task_id_value = /*model*/ ctx[0].id)) {
				attr(div1, "data-task-id", div1_data_task_id_value);
			}

			if (dirty[0] & /*model*/ 1 && div1_class_value !== (div1_class_value = "sg-task " + /*model*/ ctx[0].classes + " svelte-19txnoa")) {
				attr(div1, "class", div1_class_value);
			}

			if (dirty[0] & /*_position*/ 64) {
				set_style(div1, "width", /*_position*/ ctx[6].width + "px");
			}

			if (dirty[0] & /*height*/ 2) {
				set_style(div1, "height", /*height*/ ctx[1] + "px");
			}

			if (dirty[0] & /*_position*/ 64) {
				set_style(div1, "transform", "translate(" + /*_position*/ ctx[6].x + "px, " + /*_position*/ ctx[6].y + "px)");
			}

			if (dirty[0] & /*model, _dragging, _resizing*/ 49) {
				toggle_class(div1, "moving", /*_dragging*/ ctx[4] || /*_resizing*/ ctx[5]);
			}

			if (dirty[0] & /*model, selected*/ 129) {
				toggle_class(div1, "selected", /*selected*/ ctx[7]);
			}

			if (dirty[0] & /*model*/ 1) {
				toggle_class(div1, "animating", animating);
			}

			if (dirty[0] & /*model, reflected*/ 5) {
				toggle_class(div1, "sg-task-reflected", /*reflected*/ ctx[2]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
			if (if_block0) if_block0.d();
			if_block1.d();
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
			mounted = false;
			dispose();
		}
	};
}

let animating = true;

function instance($$self, $$props, $$invalidate) {
	let $rowStore;
	let $taskStore;
	let $rowPadding;
	let $selection;
	component_subscribe($$self, rowStore, $$value => $$invalidate(16, $rowStore = $$value));
	component_subscribe($$self, taskStore, $$value => $$invalidate(17, $taskStore = $$value));
	let { model } = $$props;
	let { height } = $$props;
	let { left } = $$props;
	let { top } = $$props;
	let { width } = $$props;
	let { reflected = false } = $$props;
	let _dragging = false;
	let _resizing = false;
	let _position = { x: left, y: top, width };

	function updatePosition(x, y, width) {
		if (!_dragging && !_resizing) {
			$$invalidate(6, _position.x = x, _position);
			$$invalidate(6, _position.y = y, _position); //row.y + 6;
			$$invalidate(6, _position.width = width, _position);
		} // should NOT animate on resize/update of columns
	}

	const { dimensionsChanged } = getContext("dimensions");
	const { rowContainer } = getContext("gantt");
	const { taskContent, resizeHandleWidth, rowPadding, onTaskButtonClick, reflectOnParentRows, reflectOnChildRows } = getContext("options");
	component_subscribe($$self, rowPadding, value => $$invalidate(18, $rowPadding = value));
	const { dndManager, api, utils, selectionManager, columnService } = getContext("services");

	function drag(node) {
		const ondrop = event => {
			let rowChangeValid = true;

			//row switching
			const sourceRow = $rowStore.entities[model.resourceId];

			if (event.dragging && false) { //thangnaozay force false
				const targetRow = dndManager.getTarget("row", event.mouseEvent);

				if (targetRow) {
					$$invalidate(0, model.resourceId = targetRow.model.id, model);
					api.tasks.raise.switchRow(this, targetRow, sourceRow);
				} else {
					rowChangeValid = false;
				}
			}

			$$invalidate(4, _dragging = $$invalidate(5, _resizing = false));
			const task = $taskStore.entities[model.id];

			if (rowChangeValid) {
				const prevFrom = model.from;
				const prevTo = model.to;
				const newFrom = $$invalidate(0, model.from = utils.roundTo(columnService.getDateByPosition(event.x)), model);
				const newTo = $$invalidate(0, model.to = utils.roundTo(columnService.getDateByPosition(event.x + event.width)), model);
				const newLeft = columnService.getPositionByDate(newFrom) | 0;
				const newRight = columnService.getPositionByDate(newTo) | 0;
				const targetRow = $rowStore.entities[model.resourceId];
				const left = newLeft;
				const width = newRight - newLeft;
				const top = $rowPadding + targetRow.y;
				updatePosition(left, top, width); // set new position
				const newTask = { ...task, left, width, top, model };
				const changed = !prevFrom.isSame(newFrom) || !prevTo.isSame(newTo) || sourceRow && sourceRow.model.id !== targetRow.model.id;

				//if (changed) {
				api.tasks.raise.change({ task: newTask, sourceRow, targetRow });
				//}

				taskStore.update(newTask); // set new position

				//if (changed) { 

				selectionManager.selectSingle(task.model.id);

				api.tasks.raise.changed({ task: newTask, sourceRow, targetRow, prevFrom, prevTo });
				//}

				//custom thangnaozay // set new position

				// setTimeout(function () {
				// 	($$invalidate(6, _position.x = task.left, _position), $$invalidate(6, _position.width = task.width, _position), $$invalidate(6, _position.y = task.top, _position));
				// }); 

				// update shadow tasks
				if (newTask.reflections) {
					taskStore.deleteAll(newTask.reflections);
				}

				const reflectedTasks = [];

				if (reflectOnChildRows && targetRow.allChildren) {
					if (!newTask.reflections) newTask.reflections = [];
					const opts = { rowPadding: $rowPadding };

					targetRow.allChildren.forEach(r => {
						const reflectedTask = reflectTask(newTask, r, opts);
						newTask.reflections.push(reflectedTask.model.id);
						reflectedTasks.push(reflectedTask);
					});
				}

				if (reflectOnParentRows && targetRow.allParents.length > 0) {
					if (!newTask.reflections) newTask.reflections = [];
					const opts = { rowPadding: $rowPadding };

					targetRow.allParents.forEach(r => {
						const reflectedTask = reflectTask(newTask, r, opts);
						newTask.reflections.push(reflectedTask.model.id);
						reflectedTasks.push(reflectedTask);
					});
				}

				if (reflectedTasks.length > 0) {
					taskStore.upsertAll(reflectedTasks);
				}

				if (!(targetRow.allParents.length > 0) && !targetRow.allChildren) {
					newTask.reflections = null;
				}

			} else {
				// reset position
				($$invalidate(6, _position.x = task.left, _position), $$invalidate(6, _position.width = task.width, _position), $$invalidate(6, _position.y = task.top, _position));
			}
		};

		const draggable = new Draggable(node,
			{
				onDown: event => {
					if (event.dragging) {
						setCursor("move");
					}

					if (event.resizing) {
						setCursor("e-resize");
					}
				},
				onMouseUp: () => {
					setCursor("default");
				},
				onResize: event => {
					($$invalidate(6, _position.x = event.x, _position), $$invalidate(6, _position.width = event.width, _position), $$invalidate(5, _resizing = true));
				},
				onDrag: event => {
					($$invalidate(6, _position.x = event.x, _position), $$invalidate(6, _position.y = event.y, _position), $$invalidate(4, _dragging = true));
				},
				dragAllowed: () => {
					return row.model.enableDragging && model.enableDragging;
				},
				resizeAllowed: () => {
					return row.model.enableDragging && model.enableDragging;
				},
				onDrop: ondrop,
				container: rowContainer,
				resizeHandleWidth,
				getX: () => _position.x,
				getY: () => _position.y,
				getWidth: () => _position.width
			});

		return { destroy: () => draggable.destroy() };
	}

	function onclick(event) {
		if (onTaskButtonClick) {
			onTaskButtonClick(task);
		}
	}

	let selection = selectionManager.selection;
	component_subscribe($$self, selection, value => $$invalidate(19, $selection = value));
	let selected = false;
	let row;

	$$self.$set = $$props => {
		if ("model" in $$props) $$invalidate(0, model = $$props.model);
		if ("height" in $$props) $$invalidate(1, height = $$props.height);
		if ("left" in $$props) $$invalidate(12, left = $$props.left);
		if ("top" in $$props) $$invalidate(13, top = $$props.top);
		if ("width" in $$props) $$invalidate(14, width = $$props.width);
		if ("reflected" in $$props) $$invalidate(2, reflected = $$props.reflected);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*left, top, width*/ 28672) {
			updatePosition(left, top, width);
		}

		if ($$self.$$.dirty[0] & /*$selection, model*/ 524289) {
			$$invalidate(7, selected = $selection.indexOf(model.id) !== -1);
		}

		if ($$self.$$.dirty[0] & /*$rowStore, model*/ 65537) {
			row = $rowStore.entities[model.resourceId];
		}
	};

	return [
		model,
		height,
		reflected,
		onclick,
		_dragging,
		_resizing,
		_position,
		selected,
		taskContent,
		rowPadding,
		drag,
		selection,
		left,
		top,
		width
	];
}

class Task extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance,
			create_fragment,
			safe_not_equal,
			{
				model: 0,
				height: 1,
				left: 12,
				top: 13,
				width: 14,
				reflected: 2,
				onclick: 3
			},
			[-1, -1]
		);
	}

	get onclick() {
		return this.$$.ctx[3];
	}
}

/* src\entities\Row.svelte generated by Svelte v3.23.0 */

function create_if_block$1(ctx) {
	let html_tag;
	let raw_value = /*row*/ ctx[0].model.contentHtml + "";

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(raw_value, target, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*row*/ 1 && raw_value !== (raw_value = /*row*/ ctx[0].model.contentHtml + "")) html_tag.p(raw_value);
		},
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}
function updateVisibleRowsYPosision(each_value_3) {

	if (each_value_3 && each_value_3.length > 0) {
		let { y, height } = each_value_3[0];
		each_value_3.forEach(ctx => {
			ctx.y = y;
			y += height
		})
	}

}

function create_fragment$1(ctx) {
	let div;
	let div_class_value;
	let div_data_row_id_value;
	let if_block = /*row*/ ctx[0].model.contentHtml && create_if_block$1(ctx);

	return {
		c() {
			div = element("div");
			if (if_block) if_block.c();
			attr(div, "class", div_class_value = "sg-row " + /*row*/ ctx[0].model.classes + " svelte-ejtbeo");
			attr(div, "data-row-id", div_data_row_id_value = /*row*/ ctx[0].model.id);
			set_style(div, "height", /*$rowHeight*/ ctx[4] + "px");
			toggle_class(div, "sg-hover", /*$hoveredRow*/ ctx[2] == /*row*/ ctx[0].model.id);
			toggle_class(div, "sg-selected", /*$selectedRow*/ ctx[3] == /*row*/ ctx[0].model.id);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (if_block) if_block.m(div, null);
			/*div_binding*/ ctx[8](div);
		},
		p(ctx, [dirty]) {
			if (/*row*/ ctx[0].model.contentHtml) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$1(ctx);
					if_block.c();
					if_block.m(div, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*row*/ 1 && div_class_value !== (div_class_value = "sg-row " + /*row*/ ctx[0].model.classes + " svelte-ejtbeo")) {
				attr(div, "class", div_class_value);
			}

			if (dirty & /*row*/ 1 && div_data_row_id_value !== (div_data_row_id_value = /*row*/ ctx[0].model.id)) {
				attr(div, "data-row-id", div_data_row_id_value);
			}

			if (dirty & /*$rowHeight*/ 16) {
				set_style(div, "height", /*$rowHeight*/ ctx[4] + "px");
			}

			if (dirty & /*row, $hoveredRow, row*/ 5) {
				toggle_class(div, "sg-hover", /*$hoveredRow*/ ctx[2] == /*row*/ ctx[0].model.id);
			}

			if (dirty & /*row, $selectedRow, row*/ 9) {
				toggle_class(div, "sg-selected", /*$selectedRow*/ ctx[3] == /*row*/ ctx[0].model.id);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
			/*div_binding*/ ctx[8](null);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let $hoveredRow;
	let $selectedRow;
	let $rowHeight;
	let { row } = $$props;
	let rowElement;
	const { rowHeight } = getContext("options");
	component_subscribe($$self, rowHeight, value => $$invalidate(4, $rowHeight = value));
	const { hoveredRow, selectedRow } = getContext("gantt");
	component_subscribe($$self, hoveredRow, value => $$invalidate(2, $hoveredRow = value));
	component_subscribe($$self, selectedRow, value => $$invalidate(3, $selectedRow = value));

	function div_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(1, rowElement = $$value);
		});
	}

	$$self.$set = $$props => {
		if ("row" in $$props) $$invalidate(0, row = $$props.row);
	};

	return [
		row,
		rowElement,
		$hoveredRow,
		$selectedRow,
		$rowHeight,
		rowHeight,
		hoveredRow,
		selectedRow,
		div_binding
	];
}

class Row extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { row: 0 });
	}
}

/* src\entities\TimeRange.svelte generated by Svelte v3.23.0 */

function create_fragment$2(ctx) {
	let div1;
	let div0;
	let t_value = /*model*/ ctx[0].label + "";
	let t;

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			t = text(t_value);
			attr(div0, "class", "sg-time-range-label svelte-18yq9be");
			attr(div1, "class", "sg-time-range svelte-18yq9be");
			set_style(div1, "width", /*_position*/ ctx[2].width + "px");
			set_style(div1, "left", /*_position*/ ctx[2].x + "px");
			toggle_class(div1, "moving", /*resizing*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, t);
		},
		p(ctx, [dirty]) {
			if (dirty & /*model*/ 1 && t_value !== (t_value = /*model*/ ctx[0].label + "")) set_data(t, t_value);

			if (dirty & /*_position*/ 4) {
				set_style(div1, "width", /*_position*/ ctx[2].width + "px");
			}

			if (dirty & /*_position*/ 4) {
				set_style(div1, "left", /*_position*/ ctx[2].x + "px");
			}

			if (dirty & /*resizing*/ 2) {
				toggle_class(div1, "moving", /*resizing*/ ctx[1]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let { model } = $$props;
	let { left } = $$props;
	let { width } = $$props;
	let { resizing = false } = $$props;
	const _position = { width, x: left };


	$$self.$set = $$props => {
		if ("model" in $$props) $$invalidate(0, model = $$props.model);
		if ("left" in $$props) $$invalidate(3, left = $$props.left);
		if ("width" in $$props) $$invalidate(4, width = $$props.width);
		if ("resizing" in $$props) $$invalidate(1, resizing = $$props.resizing);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*left, width*/ 24) {
			{
				($$invalidate(2, _position.x = left, _position), $$invalidate(2, _position.width = width, _position));
			}
		}
	};

	return [model, resizing, _position, left, width];
}

class TimeRange extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { model: 0, left: 3, width: 4, resizing: 1 });
	}
}

/* src\entities\TimeRangeHeader.svelte generated by Svelte v3.23.0 */

function create_fragment$3(ctx) {
	let div2;
	let div0;
	let t;
	let div1;
	let mounted;
	let dispose;

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			t = space();
			div1 = element("div");
			attr(div0, "class", "sg-time-range-handle-left svelte-16dwney");
			attr(div1, "class", "sg-time-range-handle-right svelte-16dwney");
			attr(div2, "class", "sg-time-range-control svelte-16dwney");
			set_style(div2, "width", /*_position*/ ctx[0].width + "px");
			set_style(div2, "left", /*_position*/ ctx[0].x + "px");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div2, t);
			append(div2, div1);

			if (!mounted) {
				dispose = [
					action_destroyer(ctx[1].call(null, div0)),
					action_destroyer(ctx[1].call(null, div1))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*_position*/ 1) {
				set_style(div2, "width", /*_position*/ ctx[0].width + "px");
			}

			if (dirty & /*_position*/ 1) {
				set_style(div2, "left", /*_position*/ ctx[0].x + "px");
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div2);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	const { rowContainer } = getContext("gantt");
	const { utils, columnService } = getContext("services");
	const { resizeHandleWidth } = getContext("options");
	const { from, to, width: ganttWidth, visibleWidth } = getContext("dimensions");
	let { model } = $$props;
	let { width } = $$props;
	let { left } = $$props;
	const _position = { width, x: left };


	function drag(node) {
		const ondrop = event => {
			const newFrom = utils.roundTo(columnService.getDateByPosition(event.x));
			const newTo = utils.roundTo(columnService.getDateByPosition(event.x + event.width));
			const newLeft = columnService.getPositionByDate(newFrom);
			const newRight = columnService.getPositionByDate(newTo);
			Object.assign(model, { from: newFrom, to: newTo });

			update({
				left: newLeft,
				width: newRight - newLeft,
				model,
				resizing: false
			});

			window.removeEventListener("mousemove", onmousemove, false);
		};

		function update(state) {
			timeRangeStore.update(state);
			$$invalidate(0, _position.x = state.left, _position);
			$$invalidate(0, _position.width = state.width, _position);
		}

		return new Draggable(node,
			{
				onDown: event => {
					update({
						left: event.x,
						width: event.width,
						model,
						resizing: true
					});
				},
				onResize: event => {
					update({
						left: event.x,
						width: event.width,
						model,
						resizing: true
					});
				},
				dragAllowed: false,
				resizeAllowed: true,
				onDrop: ondrop,
				container: rowContainer,
				resizeHandleWidth,
				getX: () => _position.x,
				getY: () => 0,
				getWidth: () => _position.width
			});
	}

	$$self.$set = $$props => {
		if ("model" in $$props) $$invalidate(2, model = $$props.model);
		if ("width" in $$props) $$invalidate(3, width = $$props.width);
		if ("left" in $$props) $$invalidate(4, left = $$props.left);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*left, width*/ 24) {
			{
				($$invalidate(0, _position.x = left, _position), $$invalidate(0, _position.width = width, _position));
			}
		}
	};

	return [_position, drag, model, width, left];
}

class TimeRangeHeader extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { model: 2, width: 3, left: 4 });
	}
}

/* src\column\ColumnHeaderRow.svelte generated by Svelte v3.23.0 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[13] = list[i];
	return child_ctx;
}

// (52:4) {#each _headers as _header}
function create_each_block(ctx) {
	let div1;
	let div0;
	let t0_value = (/*_header*/ ctx[13].label || "N/A") + "";
	let t0;
	let t1;
	let mounted;
	let dispose;

	// thangnaozay
	function click_handler(...args) {
		//return /*click_handler*/ ctx[12](/*_header*/ ctx[13], ...args);
	}

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			t0 = text(t0_value);
			t1 = space();
			attr(div0, "class", "column-header-cell-label svelte-2mrscm");
			attr(div1, "class", "column-header-cell svelte-2mrscm");
			set_style(div1, "width", /*_header*/ ctx[13].width + "px");
			toggle_class(div1, "sticky", /*header*/ ctx[0].sticky);
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, t0);
			append(div1, t1);

			if (!mounted) {
				dispose = listen(div1, "click", click_handler);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*_headers*/ 2 && t0_value !== (t0_value = (/*_header*/ ctx[13].label || "N/A") + "")) set_data(t0, t0_value);

			if (dirty & /*_headers*/ 2) {
				set_style(div1, "width", /*_header*/ ctx[13].width + "px");
			}

			if (dirty & /*header*/ 1) {
				toggle_class(div1, "sticky", /*header*/ ctx[0].sticky);
			}
		},
		d(detaching) {
			if (detaching) detach(div1);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$4(ctx) {
	let div;
	let each_value = /*_headers*/ ctx[1];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", "column-header-row svelte-2mrscm");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*_headers, header, dispatch*/ 7) {
				each_value = /*_headers*/ ctx[1];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	let $width;
	let $from;
	let $to;
	const dispatch = createEventDispatcher();
	const { from, to, width } = getContext("dimensions");
	component_subscribe($$self, from, value => $$invalidate(10, $from = value));
	component_subscribe($$self, to, value => $$invalidate(10, $to = value));

	component_subscribe($$self, width, value => $$invalidate(9, $width = value));
	let { header } = $$props;
	let { baseWidth } = $$props;
	let { baseDuration } = $$props;
	let { columnWidth } = $$props;
	let { columnCount } = $$props;
	let _headers = [];

	const click_handler = _header => dispatch("dateSelected", {
		from: _header.from,
		to: _header.to,
		unit: _header.unit
	});

	$$self.$set = $$props => {
		if ("header" in $$props) $$invalidate(0, header = $$props.header);
		if ("baseWidth" in $$props) $$invalidate(7, baseWidth = $$props.baseWidth);
		if ("baseDuration" in $$props) $$invalidate(8, baseDuration = $$props.baseDuration);
		if ("columnWidth" in $$props) $$invalidate(5, columnWidth = $$props.columnWidth);
		if ("columnCount" in $$props) $$invalidate(6, columnCount = $$props.columnCount);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*header, baseDuration, baseWidth*/ 385) {
			{
				const offset = header.offset || 1;
				const duration$1 = duration(offset, header.unit).asMilliseconds();
				const ratio = duration$1 / baseDuration;
				$$invalidate(5, columnWidth = baseWidth * ratio);
			}
		}

		if ($$self.$$.dirty & /*$width, columnWidth, columnCount*/ 608) {
			{
				$$invalidate(6, columnCount = Math.ceil($width / columnWidth));

				if (!isFinite(columnCount)) {
					console.error("columnCount is not finite");
					$$invalidate(6, columnCount = 0);
				}
			}
		}

		if ($$self.$$.dirty & /*$from, header, columnCount, columnWidth, $width*/ 1633) {
			{
				const headers = [];
				let headerTime = $from.clone();//.startOf(header.unit);
				const offset = header.offset || 1;

				if (header.unit == 'week') {
					const from_date = $from.startOf('week');
					const to_date = $to.endOf('week');
					var weekRange = to_date.diff(from_date, 'week');
					var dateRange = to_date.diff(from_date, 'days');

					headerTime = from_date.clone();//.startOf(header.unit);
					for (let i = 0; i <= weekRange; i++) {
						//var quarterName = "Q" + headerTime.quarter();
						headers.push({
							width: baseWidth * 7,
							label: headerTime.format('ddd DD'),
							from: headerTime.clone(),
							to: headerTime.clone().add(offset, header.unit),
							unit: header.unit
						});

						headerTime.add(offset, header.unit);
					}

				} else if (header.unit == 'quarter') {
					var startQ = $from.quarter();
					var endQ = $to.quarter();
					var dateRange = $to.diff($from, 'days') + 1;
					var yearRange = $to.year() - $from.year();

					for (let m = 0; m <= yearRange; m++) {
						var startQ = $from.quarter();
						var endQ = $to.quarter();
						if (m != yearRange) {
							var endQ = 4;
						}

						if (m > 0) {
							startQ = 1;
						}

						var quarterRange = endQ - startQ;

						for (let i = 0; i <= quarterRange; i++) {

							let days = 0;
							if (i == 0 && m == 0) { //first
								var endOfQuarter = $to;
								//if (quarterRange > 0) {
								endOfQuarter = headerTime.clone().endOf('quarter');
								//}

								days = endOfQuarter.diff($from, 'days') + 1;
							}

							else if (i == quarterRange && m == yearRange) { //last
								days = $to.diff($to.clone().startOf('quarter'), 'days') + 1;
							}

							else { //between
								days = moment(headerTime.clone().endOf('quarter')).diff(headerTime.clone().startOf('quarter'), 'days') + 1;
							}

							var quarterName = "Q" + headerTime.quarter();
							headers.push({
								width: baseWidth * days,
								label: quarterName,
								from: headerTime.clone(),
								to: headerTime.clone().add(offset, header.unit),
								unit: header.unit
							});

							headerTime.add(offset, header.unit);
						}
					}


				} else if (header.unit == 'year') {
					var yearRange = $to.year() - $from.year();
					for (let i = 0; i <= yearRange; i++) {
						let days = 0;

						if (i == 0) { //first
							var toRange = $to.dayOfYear();
							if (yearRange > 0) {
								toRange = headerTime.endOf('year').dayOfYear();
							}

							days = toRange - $from.dayOfYear() + 1;
						}

						else if (i == yearRange) { //last
							days = $to.dayOfYear();
						}

						else { //between
							days = headerTime.endOf('year').dayOfYear();
						}

						headers.push({
							width: baseWidth * days,
							label: headerTime.format(header.format),
							from: headerTime.clone(),
							to: headerTime.clone().add(offset, header.unit),
							unit: header.unit
						});

						headerTime.add(offset, header.unit);
					}

				} else if (header.unit == 'month') {

					var monthRange = monthDiff($from, $to);// $to.diff($from, 'months');

					for (let i = 0; i <= monthRange; i++) {
						let days = 0;
						var year = headerTime.year();
						var month = headerTime.month() + 1;

						if (i == 0) { //first month
							days = moment(`${year}-${month}`, "YYYY-MM").daysInMonth() - headerTime.date() + 1;
						}

						else if (i == monthRange) { //last month
							days = $to.date();
						}

						else { //month between
							days = moment(`${year}-${month}`, "YYYY-MM").daysInMonth();
						}

						headers.push({
							width: baseWidth * days,
							label: headerTime.format(header.format),
							from: headerTime.clone(),
							to: headerTime.clone().add(offset, header.unit),
							unit: header.unit
						});

						headerTime.add(offset, header.unit);
					}
				}
				else {
					if (!header.isHide) {
						var dateRange = $to.diff($from, 'days');

						for (let i = 0; i <= dateRange; i++) {
							headers.push({
								width: baseWidth,
								label: headerTime.format(header.format),
								from: headerTime.clone(),
								to: headerTime.clone().add(offset, header.unit),
								unit: header.unit
							});

							headerTime.add(offset, header.unit);
						}
					}
				}

				$$invalidate(1, _headers = headers);
			}
		}
	};

	return [
		header,
		_headers,
		dispatch,
		from,
		width,
		columnWidth,
		columnCount,
		baseWidth,
		baseDuration,
		$width,
		$from,
		to,
		click_handler
	];
}


function monthDiff(dateFrom, dateTo) {
	return dateTo.month() - dateFrom.month() +
		(12 * (dateTo.year() - dateFrom.year()))
}

class ColumnHeaderRow extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
			header: 0,
			baseWidth: 7,
			baseDuration: 8,
			columnWidth: 5,
			columnCount: 6
		});
	}
}

class GanttUtils {
	constructor() {
	}
	/**
	 * Returns position of date on a line if from and to represent length of width
	 * @param {*} date
	 */
	getPositionByDate(date) {
		return getPositionByDate(date, this.from, this.to, this.width);
	}
	getDateByPosition(x) {
		return getDateByPosition(x, this.from, this.to, this.width);
	}
	/**
	 *
	 * @param {Moment} date - Date
	 * @returns {Moment} rounded date passed as parameter
	 */
	roundTo(date) {
		let value = date.get(this.magnetUnit);
		value = Math.round(value / this.magnetOffset);
		date.set(this.magnetUnit, value * this.magnetOffset);
		//round all smaller units to 0
		const units = ['millisecond', 'second', 'minute', 'hour', 'date', 'month', 'year'];
		const indexOf = units.indexOf(this.magnetUnit);

		for (let i = 0; i < indexOf; i++) {
			date.set(units[i], 0);
		}
		return date;
	}
}
function getPositionByDate(date, from, to, width) {
	if (!date) {
		return undefined;
	}
	let durationTo = date.diff(from, 'milliseconds');
	let durationToEnd = to.diff(from, 'milliseconds');
	return durationTo / durationToEnd * width;
}
function getDateByPosition(x, from, to, width) {
	let durationTo = x / width * to.diff(from, 'milliseconds');
	let dateAtPosition = from.clone().add(durationTo, 'milliseconds');
	return dateAtPosition;
}
// Returns the object on the left and right in an array using the given cmp function.
// The compare function defined which property of the value to compare (e.g.: c => c.left)
function getIndicesOnly(input, value, comparer, strict) {
	let lo = -1;
	let hi = input.length;
	while (hi - lo > 1) {
		let mid = Math.floor((lo + hi) / 2);
		if (strict ? comparer(input[mid]) < value : comparer(input[mid]) <= value) {
			lo = mid;
		}
		else {
			hi = mid;
		}
	}
	if (!strict && input[lo] !== undefined && comparer(input[lo]) === value) {
		hi = lo;
	}
	return [lo, hi];
}
function get(input, value, comparer, strict) {
	let res = getIndicesOnly(input, value, comparer, strict);
	return [input[res[0]], input[res[1]]];
}

/* src\column\ColumnHeader.svelte generated by Svelte v3.23.0 */

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[13] = list[i];
	return child_ctx;
}

// (48:0) {#each headers as header}
function create_each_block$1(ctx) {
	let current;

	const columnheaderrow = new ColumnHeaderRow({
		props: {
			header: /*header*/ ctx[13],
			baseWidth: /*baseHeaderWidth*/ ctx[1],
			baseDuration: /*baseHeaderDuration*/ ctx[2]
		}
	});

	columnheaderrow.$on("dateSelected", /*dateSelected_handler*/ ctx[12]);

	return {
		c() {
			create_component(columnheaderrow.$$.fragment);
		},
		m(target, anchor) {
			mount_component(columnheaderrow, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const columnheaderrow_changes = {};
			if (dirty & /*headers*/ 1) columnheaderrow_changes.header = /*header*/ ctx[13];
			if (dirty & /*baseHeaderWidth*/ 2) columnheaderrow_changes.baseWidth = /*baseHeaderWidth*/ ctx[1];
			if (dirty & /*baseHeaderDuration*/ 4) columnheaderrow_changes.baseDuration = /*baseHeaderDuration*/ ctx[2];
			columnheaderrow.$set(columnheaderrow_changes);
		},
		i(local) {
			if (current) return;
			transition_in(columnheaderrow.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(columnheaderrow.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(columnheaderrow, detaching);
		}
	};
}

function create_fragment$5(ctx) {
	let each_1_anchor;
	let current;
	let each_value = /*headers*/ ctx[0];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {

		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*headers, baseHeaderWidth, baseHeaderDuration*/ 7) {
				each_value = /*headers*/ ctx[0];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					if (!each_value[i].isHide) {
						const child_ctx = get_each_context$1(ctx, each_value, i);
						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

function instance$5($$self, $$props, $$invalidate) {
	let $from;
	let $to;
	let $width;
	let { headers } = $$props;
	let { columnUnit } = $$props;
	let { columnOffset } = $$props;
	const { from, to, width } = getContext("dimensions");
	component_subscribe($$self, from, value => $$invalidate(9, $from = value));
	component_subscribe($$self, to, value => $$invalidate(10, $to = value));
	component_subscribe($$self, width, value => $$invalidate(11, $width = value));
	let minHeader;
	let baseHeaderWidth;
	let baseHeaderDuration;

	function dateSelected_handler(event) {
		bubble($$self, event);
	}

	$$self.$set = $$props => {
		if ("headers" in $$props) $$invalidate(0, headers = $$props.headers);
		if ("columnUnit" in $$props) $$invalidate(6, columnUnit = $$props.columnUnit);
		if ("columnOffset" in $$props) $$invalidate(7, columnOffset = $$props.columnOffset);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*headers, columnUnit, columnOffset*/ 193) {
			{
				let result = null;
				let minDuration = null;

				[...headers, { unit: columnUnit, offset: columnOffset }].forEach(header => {
					const offset = header.offset || 1;
					const duration$1 = duration(offset, header.unit).asMilliseconds();
					if (duration$1 < minDuration || minDuration === null) {
						minDuration = duration$1;
						result = header;
					}
				});

				$$invalidate(8, minHeader = result);
			}
		}

		if ($$self.$$.dirty & /*$from, minHeader, $to, $width, baseHeaderWidth*/ 3842) {
			{
				$$invalidate(1, baseHeaderWidth = getPositionByDate($from.clone().add(minHeader.offset || 1, minHeader.unit), $from, $to, $width) | 0);
				if (baseHeaderWidth <= 0) console.error("baseHeaderWidth is invalid, columns or headers might be too short for the current view.");
			}
		}

		if ($$self.$$.dirty & /*minHeader*/ 256) {
			{
				$$invalidate(2, baseHeaderDuration = duration(minHeader.offset || 1, minHeader.unit).asMilliseconds());
			}
		}
	};

	return [
		headers,
		baseHeaderWidth,
		baseHeaderDuration,
		from,
		to,
		width,
		columnUnit,
		columnOffset,
		minHeader,
		$from,
		$to,
		$width,
		dateSelected_handler
	];
}

class ColumnHeader extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
			headers: 0,
			columnUnit: 6,
			columnOffset: 7
		});
	}
}

/* src\column\Columns.svelte generated by Svelte v3.23.0 */

function create_fragment$6(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			attr(div, "class", "sg-columns svelte-1clwlpk");
			set_style(div, "background-image", /*backgroundImage*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /*backgroundImage*/ 1) {
				set_style(div, "background-image", /*backgroundImage*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function lineAt(ctx, x) {
	ctx.beginPath();
	ctx.moveTo(x, 0);
	ctx.lineTo(x, 20);
	ctx.stroke();
}

function createBackground(columns) {
	const canvas = document.createElement("canvas");
	canvas.width = columns.length * columns[0].width;
	canvas.height = 20;
	const ctx = canvas.getContext("2d");
	ctx.shadowColor = "rgba(128,128,128,0.5)";
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 0.5;
	ctx.lineWidth = 1;
	ctx.lineCap = "square";
	ctx.strokeStyle = "#efefef";
	ctx.translate(0.5, 0.5);

	columns.forEach(column => {
		lineAt(ctx, column.left);
	});

	const dataURL = canvas.toDataURL();
	return `url("${dataURL}")`;
}

function instance$6($$self, $$props, $$invalidate) {
	let { columns = [] } = $$props;
	let backgroundImage;

	$$self.$set = $$props => {
		if ("columns" in $$props) $$invalidate(1, columns = $$props.columns);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*columns*/ 2) {
			{
				$$invalidate(0, backgroundImage = createBackground(columns.slice(0, 4)));
			}
		}
	};

	return [backgroundImage, columns];
}

class Columns extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$6, create_fragment$6, safe_not_equal, { columns: 1 });
	}
}

/* src\ui\Resizer.svelte generated by Svelte v3.23.0 */

function create_fragment$7(ctx) {
	let div;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			attr(div, "class", "sg-resize svelte-1cpm1hk");
			set_style(div, "left", /*x*/ ctx[0] + "px");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (!mounted) {
				dispose = action_destroyer(ctx[1].call(null, div));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*x*/ 1) {
				set_style(div, "left", /*x*/ ctx[0] + "px");
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			dispose();
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	const dispatch = createEventDispatcher();
	let { x = 240 } = $$props;
	let { container } = $$props;

	const dragOptions = {
		onDrag: event => {
			($$invalidate(0, x = event.x), true);
			dispatch("resize", { left: x });
			setCursor("col-resize");
		},
		onDrop: event => {
			($$invalidate(0, x = event.x), false);
			dispatch("resize", { left: x });
			setCursor("default");
		},
		dragAllowed: true,
		resizeAllowed: false,
		container,
		getX: () => x,
		getY: () => 0,
		getWidth: () => 0
	};

	function resizer(node) {
		return new Draggable(node, dragOptions);
	}

	$$self.$set = $$props => {
		if ("x" in $$props) $$invalidate(0, x = $$props.x);
		if ("container" in $$props) $$invalidate(2, container = $$props.container);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*container*/ 4) {
			dragOptions.container = container;
		}
	};

	return [x, resizer, container];
}

class Resizer extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$7, create_fragment$7, safe_not_equal, { x: 0, container: 2 });
	}
}

class SelectionManager {
	constructor() {
		this.selection = writable([]);
	}
	selectSingle(item) {
		this.selection.set([item]);
	}
	toggleSelection(item) {
		this.selection.update(items => {
			const index = items.indexOf(item);
			if (index !== -1) {
				items.splice(index, 1);
			}
			else {
				items.push(item);
			}
			return items;
		});
	}
	clearSelection() {
		this.selection.set([]);
	}
}

class GanttApi {
	constructor() {
		this.listeners = [];
		this.listenersMap = {};

		this.initTaskLifeCycle();       
	}

    initTaskLifeCycle() {
        const task = this.task;
        const lifeCycle = {
            data: null,
            listener:null,
            subscribe: function (callback) {
                this.listener = callback;
                return this;
            },
            emit: function (data) {
                this.data = data
                if(this.listener) {
                    this.listener(this.data);
                }
            },
            unsubscribe: function () {
                this.listener = null;
            },
            getData: function () {
                return this.data;
            }
        };
        this.task = {
            ...task,
            lifeCycle: {
                didMount: { ...lifeCycle },
                unMount: { ...lifeCycle }
            }
        };
        StelteGanttScopeHolder.taskLifeCycle = this.task.lifeCycle;
	}
	registerEvent(featureName, eventName) {
		if (!this[featureName]) {
			this[featureName] = {};
		}
		const feature = this[featureName];
		if (!feature.on) {
			feature.on = {};
			feature.raise = {};
		}
		let eventId = 'on:' + featureName + ':' + eventName;
		feature.raise[eventName] = (...params) => {
			//todo add svelte? event listeners, looping isnt effective unless rarely used
			this.listeners.forEach(listener => {
				if (listener.eventId === eventId) {
					listener.handler(params);
				}
			});
		};
		// Creating on event method featureName.oneventName
		feature.on[eventName] = (handler) => {
			// track our listener so we can turn off and on
			let listener = {
				handler: handler,
				eventId: eventId
			};
			this.listenersMap[eventId] = listener;
			this.listeners.push(listener);
			const removeListener = () => {
				const index = this.listeners.indexOf(listener);
				this.listeners.splice(index, 1);
			};
			return removeListener;
		};
	}
}

class RowFactory {
	constructor() {
	}
	createRow(row, y) {
		// defaults
		// id of task, every task needs to have a unique one
		//row.id = row.id || undefined;
		// css classes
		row.classes = row.classes || '';
		// html content of row
		row.contentHtml = row.contentHtml || undefined;
		// enable dragging of tasks to and from this row 
		row.enableDragging = row.enableDragging === undefined ? true : row.enableDragging;
		// height of row element
		const height = row.height || this.rowHeight;
		return {
			model: row,
			y,
			height,
			expanded: row.expanded ?  row.expanded : false
		};
	}
	createRows(rows) {
		const ctx = { y: 0, result: [] };
		this.createChildRows(rows, ctx);
		return ctx.result;
	}
	createChildRows(rowModels, ctx, parent = null, level = 0, parents = []) {
		const rowsAtLevel = [];
		const allRows = [];
		if (parent) {
			parents = [...parents, parent];
		}
		rowModels.forEach(rowModel => {
			const row = this.createRow(rowModel, ctx.y);
			ctx.result.push(row);
			rowsAtLevel.push(row);
			allRows.push(row);
			row.childLevel = level;
			row.parent = parent;
			row.allParents = parents;

			if (level > 0 && !row.expanded) {
				row.hidden = true;
			}
			else {
				ctx.y += row.height;  //customctx.y += row.height; for expand
			}

			if (rowModel.children) {
				const nextLevel = this.createChildRows(rowModel.children, ctx, row, level + 1, parents);
				row.children = nextLevel.rows;
				row.allChildren = nextLevel.allRows;
				allRows.push(...nextLevel.allRows);
			}
		});
		return {
			rows: rowsAtLevel,
			allRows
		};
	}
}

class TimeRangeFactory {
	constructor(columnService) {
		this.columnService = columnService;
	}
	create(model) {
		// enable dragging
		model.enableResizing = model.enableResizing === undefined ? true : model.enableResizing;
		const left = this.columnService.getPositionByDate(model.from);
		const right = this.columnService.getPositionByDate(model.to);
		return {
			model,
			left: left,
			width: right - left,
			resizing: false
		};
	}
}

function findByPosition(columns, x) {
	const result = get(columns, x, c => c.left);
	return result;
}
function findByDate(columns, x) {
	const result = get(columns, x, c => c.from);
	return result;
}

const callbacks = {};
function onDelegatedEvent(type, attr, callback) {
	if (!callbacks[type])
		callbacks[type] = {};
	callbacks[type][attr] = callback;
}
function offDelegatedEvent(type, attr) {
	delete callbacks[type][attr];
}
function matches(cbs, element) {
	let data;
	for (let attr in cbs) {
		if (data = element.getAttribute(attr)) {
			return { attr, data };
		}
	}
}
function onEvent(e) {
	let { type, target } = e;
	const cbs = callbacks[type];
	if (!cbs)
		return;
	let match;
	let element = target;
	while (element && element != e.currentTarget) {
		if ((match = matches(cbs, element))) {
			break;
		}
		element = element.parentElement;
	}
	if (match && cbs[match.attr]) {
		cbs[match.attr](e, match.data, element);
	}
}

/* src\Gantt.svelte generated by Svelte v3.23.0 */

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[119] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[122] = list[i];
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[125] = list[i];
	return child_ctx;
}

function get_each_context_3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[128] = list[i];
	return child_ctx;
}

function get_each_context_4(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[125] = list[i];
	return child_ctx;
}

function get_each_context_5(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[119] = list[i];
	return child_ctx;
}

// (605:4) {#each ganttTableModules as module}
function create_each_block_5(ctx) {
	let t;
	let current;

	const switch_instance_spread_levels = [
		{
			rowContainerHeight: /*rowContainerHeight*/ ctx[14]
		},
		{ paddingTop: /*paddingTop*/ ctx[15] },
		{ paddingBottom: /*paddingBottom*/ ctx[16] },
		{ tableWidth: /*tableWidth*/ ctx[1] },
		/*$$restProps*/ ctx[43],
		{ visibleRows: /*visibleRows*/ ctx[17] }
	];

	var switch_value = /*module*/ ctx[119];

	function switch_props(ctx) {
		let switch_instance_props = {};

		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
		}

		return { props: switch_instance_props };
	}

	if (switch_value) {
		var switch_instance = new switch_value(switch_props());
		switch_instance.$on("init", onModuleInit);
	}

	const resizer = new Resizer({
		props: {
			x: /*tableWidth*/ ctx[1],
			container: /*ganttElement*/ ctx[7]
		}
	});

	resizer.$on("resize", /*onResize*/ ctx[40]);

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			t = space();
			create_component(resizer.$$.fragment);
		},
		m(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert(target, t, anchor);
			mount_component(resizer, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const switch_instance_changes = (dirty[0] & /*rowContainerHeight, paddingTop, paddingBottom, tableWidth, visibleRows*/ 245762 | dirty[1] & /*$$restProps*/ 4096)
				? get_spread_update(switch_instance_spread_levels, [
					dirty[0] & /*rowContainerHeight*/ 16384 && {
						rowContainerHeight: /*rowContainerHeight*/ ctx[14]
					},
					dirty[0] & /*paddingTop*/ 32768 && { paddingTop: /*paddingTop*/ ctx[15] },
					dirty[0] & /*paddingBottom*/ 65536 && { paddingBottom: /*paddingBottom*/ ctx[16] },
					dirty[0] & /*tableWidth*/ 2 && { tableWidth: /*tableWidth*/ ctx[1] },
					dirty[1] & /*$$restProps*/ 4096 && get_spread_object(/*$$restProps*/ ctx[43]),
					dirty[0] & /*visibleRows*/ 131072 && { visibleRows: /*visibleRows*/ ctx[17] }
				])
				: {};

			if (switch_value !== (switch_value = /*module*/ ctx[119])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props());
					switch_instance.$on("init", onModuleInit);
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, t.parentNode, t);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}

			const resizer_changes = {};
			if (dirty[0] & /*tableWidth*/ 2) resizer_changes.x = /*tableWidth*/ ctx[1];
			if (dirty[0] & /*ganttElement*/ 128) resizer_changes.container = /*ganttElement*/ ctx[7];
			resizer.$set(resizer_changes);
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			transition_in(resizer.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			transition_out(resizer.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (switch_instance) destroy_component(switch_instance, detaching);
			if (detaching) detach(t);
			destroy_component(resizer, detaching);
		}
	};
}

// (616:20) {#each $allTimeRanges as timeRange (timeRange.id)}
function create_each_block_4(key_1, ctx) {
	let first;
	let current;
	const timerangeheader_spread_levels = [/*timeRange*/ ctx[125]];
	let timerangeheader_props = {};

	for (let i = 0; i < timerangeheader_spread_levels.length; i += 1) {
		timerangeheader_props = assign(timerangeheader_props, timerangeheader_spread_levels[i]);
	}

	const timerangeheader = new TimeRangeHeader({ props: timerangeheader_props });

	return {
		key: key_1,
		first: null,
		c() {
			first = empty();
			create_component(timerangeheader.$$.fragment);
			this.first = first;
		},
		m(target, anchor) {
			insert(target, first, anchor);
			mount_component(timerangeheader, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const timerangeheader_changes = (dirty[0] & /*$allTimeRanges*/ 8388608)
				? get_spread_update(timerangeheader_spread_levels, [get_spread_object(/*timeRange*/ ctx[125])])
				: {};

			timerangeheader.$set(timerangeheader_changes);
		},
		i(local) {
			if (current) return;
			transition_in(timerangeheader.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(timerangeheader.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(first);
			destroy_component(timerangeheader, detaching);
		}
	};
}

// (629:24) {#each visibleRows as row (row.model.id)}
function create_each_block_3(key_1, ctx) {
	let first;
	let current;
	const row = new Row({ props: { row: /*row*/ ctx[128] } });

	return {
		key: key_1,
		first: null,
		c() {
			first = empty();
			create_component(row.$$.fragment);
			this.first = first;
		},
		m(target, anchor) {
			insert(target, first, anchor);
			mount_component(row, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const row_changes = {};
			if (dirty[0] & /*visibleRows*/ 131072) row_changes.row = /*row*/ ctx[128];
			row.$set(row_changes);
		},
		i(local) {
			if (current) return;
			transition_in(row.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(row.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(first);
			destroy_component(row, detaching);
		}
	};
}

// (635:20) {#each $allTimeRanges as timeRange (timeRange.id)}
function create_each_block_2(key_1, ctx) {
	let first;
	let current;
	const timerange_spread_levels = [/*timeRange*/ ctx[125]];
	let timerange_props = {};

	for (let i = 0; i < timerange_spread_levels.length; i += 1) {
		timerange_props = assign(timerange_props, timerange_spread_levels[i]);
	}

	const timerange = new TimeRange({ props: timerange_props });

	return {
		key: key_1,
		first: null,
		c() {
			first = empty();
			create_component(timerange.$$.fragment);
			this.first = first;
		},
		m(target, anchor) {
			insert(target, first, anchor);
			mount_component(timerange, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const timerange_changes = (dirty[0] & /*$allTimeRanges*/ 8388608)
				? get_spread_update(timerange_spread_levels, [get_spread_object(/*timeRange*/ ctx[125])])
				: {};

			timerange.$set(timerange_changes);
		},
		i(local) {
			if (current) return;
			transition_in(timerange.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(timerange.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(first);
			destroy_component(timerange, detaching);
		}
	};
}

function updateTaskPositions() {

	StelteGanttScopeHolder.displayedTasks.map(taskModel => {
		const { model, top, left } = taskModel;
		const dataTaskId = model.id;
		const taskRow = StelteGanttScopeHolder.displayedTaskRows.find(taskRow => taskRow.model.id === model.resourceId);
		if(taskRow) {
			const y = taskRow.y + 3;
			const element = document.querySelector(`[data-task-id="${dataTaskId}"]`);
			set_style(element,"transform",`translate(${left}px, ${y}px)`);
				
		}
	})
}

function updateTaskCtxTopPosition(ctx) {
	const taskRow = StelteGanttScopeHolder.displayedTaskRows
		.find(taskRow => taskRow.model.id === ctx[122].model.resourceId);

	if (!taskRow) return;
	ctx[122].top = taskRow.y + 3;
}
// (639:20) {#each visibleTasks as task (task.model.id)}
function create_each_block_1(key_1, ctx) {
	updateTaskCtxTopPosition(ctx);
	let first;
	let current;

	const task_spread_levels = [
		{ model: /*task*/ ctx[122].model },
		{ left: /*task*/ ctx[122].left },
		{ width: /*task*/ ctx[122].width },
		{ height: /*task*/ ctx[122].height },
		{ top: /*task*/ ctx[122].top },
		/*task*/ ctx[122]
	];

	let task_props = {};

	for (let i = 0; i < task_spread_levels.length; i += 1) {
		task_props = assign(task_props, task_spread_levels[i]);
	}

	const task = new Task({ props: task_props });

	return {
		key: key_1,
		first: null,
		c() {
			first = empty();
			create_component(task.$$.fragment);
			this.first = first;
		},
		m(target, anchor) {
			insert(target, first, anchor);
			mount_component(task, target, anchor);
			current = true;
			const dataTaskId = task.$$.ctx[0].id;
			const emitData = { dataTaskId, task };

			StelteGanttScopeHolder.taskLifeCycle.didMount.emit(emitData);
		},
		p(ctx, dirty) {
			const task_changes = (dirty[0] & /*visibleTasks*/ 262144)
				? get_spread_update(task_spread_levels, [
					{ model: /*task*/ ctx[122].model },
					{ left: /*task*/ ctx[122].left },
					{ width: /*task*/ ctx[122].width },
					{ height: /*task*/ ctx[122].height },
					{ top: /*task*/ ctx[122].top },
					get_spread_object(/*task*/ ctx[122])
				])
				: {};

			task.$set(task_changes);
		},
		i(local) {
			if (current) return;
			transition_in(task.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(task.$$.fragment, local);
			current = false;
		},
		d(detaching) {

			const dataTaskId = task.$$.ctx[0].id;
			const emitData = { dataTaskId, task };

			StelteGanttScopeHolder.taskLifeCycle.unMount.emit(emitData);

			if (detaching) detach(first);
			destroy_component(task, detaching);
		}
	};
}

// (644:16) {#each ganttBodyModules as module}
function create_each_block$2(ctx) {
	let switch_instance_anchor;
	let current;

	const switch_instance_spread_levels = [
		{ paddingTop: /*paddingTop*/ ctx[15] },
		{ paddingBottom: /*paddingBottom*/ ctx[16] },
		{ visibleRows: /*visibleRows*/ ctx[17] },
		/*$$restProps*/ ctx[43]
	];

	var switch_value = /*module*/ ctx[119];

	function switch_props(ctx) {
		let switch_instance_props = {};

		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
		}

		return { props: switch_instance_props };
	}

	if (switch_value) {
		var switch_instance = new switch_value(switch_props());
		switch_instance.$on("init", onModuleInit);
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const switch_instance_changes = (dirty[0] & /*paddingTop, paddingBottom, visibleRows*/ 229376 | dirty[1] & /*$$restProps*/ 4096)
				? get_spread_update(switch_instance_spread_levels, [
					dirty[0] & /*paddingTop*/ 32768 && { paddingTop: /*paddingTop*/ ctx[15] },
					dirty[0] & /*paddingBottom*/ 65536 && { paddingBottom: /*paddingBottom*/ ctx[16] },
					dirty[0] & /*visibleRows*/ 131072 && { visibleRows: /*visibleRows*/ ctx[17] },
					dirty[1] & /*$$restProps*/ 4096 && get_spread_object(/*$$restProps*/ ctx[43])
				])
				: {};

			if (switch_value !== (switch_value = /*module*/ ctx[119])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props());
					switch_instance.$on("init", onModuleInit);
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

function create_fragment$8(ctx) {
	let div9;
	let t0;
	let div8;
	let div2;
	let div1;
	let div0;
	let t1;
	let each_blocks_4 = [];
	let each1_lookup = new Map();
	let div2_resize_listener;
	let t2;
	let div7;
	let div6;
	let t3;
	let div4;
	let div3;
	let each_blocks_3 = [];
	let each2_lookup = new Map();
	let t4;
	let div5;
	let each_blocks_2 = [];
	let each3_lookup = new Map();
	let t5;
	let each_blocks_1 = [];
	let each4_lookup = new Map();
	let t6;
	let div7_resize_listener;
	let div9_class_value;
	let current;
	let mounted;
	let dispose;
	let each_value_5 = /*ganttTableModules*/ ctx[5];
	let each_blocks_5 = [];

	for (let i = 0; i < each_value_5.length; i += 1) {
		each_blocks_5[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
	}

	const out = i => transition_out(each_blocks_5[i], 1, 1, () => {
		each_blocks_5[i] = null;
	});

	const columnheader = new ColumnHeader({
		props: {
			headers: /*headers*/ ctx[0],
			columnUnit: /*columnUnit*/ ctx[2],
			columnOffset: /*columnOffset*/ ctx[3]
		}
	});

	columnheader.$on("dateSelected", /*onDateSelected*/ ctx[42]);
	let each_value_4 = /*$allTimeRanges*/ ctx[23];
	const get_key = ctx => /*timeRange*/ ctx[125].id;

	for (let i = 0; i < each_value_4.length; i += 1) {
		let child_ctx = get_each_context_4(ctx, each_value_4, i);
		let key = get_key(child_ctx);
		each1_lookup.set(key, each_blocks_4[i] = create_each_block_4(key, child_ctx));
	}

	const columns_1 = new Columns({ props: { columns: /*columns*/ ctx[11] } });
	let each_value_3 = /*visibleRows*/ ctx[17];
	const get_key_1 = ctx => /*row*/ ctx[128].model.id;

	StelteGanttScopeHolder.displayedTaskRows = each_value_3;
	for (let i = 0; i < each_value_3.length; i += 1) {
		let child_ctx = get_each_context_3(ctx, each_value_3, i);
		let key = get_key_1(child_ctx);
		each2_lookup.set(key, each_blocks_3[i] = create_each_block_3(key, child_ctx));
	}

	let each_value_2 = /*$allTimeRanges*/ ctx[23];
	const get_key_2 = ctx => /*timeRange*/ ctx[125].id;

	for (let i = 0; i < each_value_2.length; i += 1) {
		let child_ctx = get_each_context_2(ctx, each_value_2, i);
		let key = get_key_2(child_ctx);
		each3_lookup.set(key, each_blocks_2[i] = create_each_block_2(key, child_ctx));
	}

	let each_value_1 = /*visibleTasks*/ ctx[18];
	const get_key_3 = ctx => /*task*/ ctx[122].model.id;

	StelteGanttScopeHolder.displayedTasks = each_value_1;
	for (let i = 0; i < each_value_1.length; i += 1) {
		let child_ctx = get_each_context_1(ctx, each_value_1, i);
		let key = get_key_3(child_ctx);
		each4_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
	}

	let each_value = /*ganttBodyModules*/ ctx[6];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
	}

	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div9 = element("div");

			for (let i = 0; i < each_blocks_5.length; i += 1) {
				each_blocks_5[i].c();
			}

			t0 = space();
			div8 = element("div");
			div2 = element("div");
			div1 = element("div");
			div0 = element("div");
			create_component(columnheader.$$.fragment);
			t1 = space();

			for (let i = 0; i < each_blocks_4.length; i += 1) {
				each_blocks_4[i].c();
			}

			t2 = space();
			div7 = element("div");
			div6 = element("div");
			create_component(columns_1.$$.fragment);
			t3 = space();
			div4 = element("div");
			div3 = element("div");

			for (let i = 0; i < each_blocks_3.length; i += 1) {
				each_blocks_3[i].c();
			}

			t4 = space();
			div5 = element("div");

			for (let i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].c();
			}

			t5 = space();

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t6 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div0, "class", "header-container svelte-12fxs8g");
			set_style(div0, "width", /*$_width*/ ctx[20] + "px");
			attr(div1, "class", "sg-header-scroller svelte-12fxs8g");
			attr(div2, "class", "sg-header svelte-12fxs8g");
			add_render_callback(() => /*div2_elementresize_handler*/ ctx[114].call(div2));
			toggle_class(div2, "right-scrollbar-visible", /*rightScrollbarVisible*/ ctx[13]);
			set_style(div3, "transform", "translateY(" + /*paddingTop*/ ctx[15] + "px)");
			attr(div4, "class", "sg-rows svelte-12fxs8g");
			set_style(div4, "height", /*rowContainerHeight*/ ctx[14] + "px");
			attr(div5, "class", "sg-foreground svelte-12fxs8g");
			attr(div6, "class", "content svelte-12fxs8g");
			set_style(div6, "width", /*$_width*/ ctx[20] + "px");
			attr(div7, "class", "sg-timeline-body svelte-12fxs8g");
			add_render_callback(() => /*div7_elementresize_handler*/ ctx[117].call(div7));
			toggle_class(div7, "zooming", /*zooming*/ ctx[12]);
			attr(div8, "class", "sg-timeline sg-view svelte-12fxs8g");
			attr(div9, "class", div9_class_value = "sg-gantt " + /*classes*/ ctx[4] + " svelte-12fxs8g");
			toggle_class(div9, "sg-disable-transition", !/*disableTransition*/ ctx[19]);
		},
		m(target, anchor) {
			insert(target, div9, anchor);

			for (let i = 0; i < each_blocks_5.length; i += 1) {
				each_blocks_5[i].m(div9, null);
			}

			append(div9, t0);
			append(div9, div8);
			append(div8, div2);
			append(div2, div1);
			append(div1, div0);
			mount_component(columnheader, div0, null);
			append(div0, t1);

			for (let i = 0; i < each_blocks_4.length; i += 1) {
				each_blocks_4[i].m(div0, null);
			}

			/*div2_binding*/ ctx[113](div2);
			div2_resize_listener = add_resize_listener(div2, /*div2_elementresize_handler*/ ctx[114].bind(div2));
			append(div8, t2);
			append(div8, div7);
			append(div7, div6);
			mount_component(columns_1, div6, null);
			append(div6, t3);
			append(div6, div4);
			append(div4, div3);

			for (let i = 0; i < each_blocks_3.length; i += 1) {
				each_blocks_3[i].m(div3, null);
			}

			/*div4_binding*/ ctx[115](div4);
			append(div6, t4);
			append(div6, div5);

			for (let i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].m(div5, null);
			}

			append(div5, t5);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(div5, null);
			}

			append(div6, t6);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div6, null);
			}

			/*div7_binding*/ ctx[116](div7);
			div7_resize_listener = add_resize_listener(div7, /*div7_elementresize_handler*/ ctx[117].bind(div7));
			/*div9_binding*/ ctx[118](div9);
			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(ctx[39].call(null, div1)),
					action_destroyer(ctx[38].call(null, div7)),
					listen(div7, "wheel", /*onwheel*/ ctx[41]),
					listen(div9, "click", onEvent),
					listen(div9, "mouseover", onEvent),
					listen(div9, "dblclick", onEvent),
					listen(div9, "contextmenu", onEvent)
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*tableWidth, ganttElement, ganttTableModules, rowContainerHeight, paddingTop, paddingBottom, visibleRows*/ 245922 | dirty[1] & /*onResize, $$restProps*/ 4608) {
				each_value_5 = /*ganttTableModules*/ ctx[5];
				let i;

				for (i = 0; i < each_value_5.length; i += 1) {
					const child_ctx = get_each_context_5(ctx, each_value_5, i);

					if (each_blocks_5[i]) {
						each_blocks_5[i].p(child_ctx, dirty);
						transition_in(each_blocks_5[i], 1);
					} else {
						each_blocks_5[i] = create_each_block_5(child_ctx);
						each_blocks_5[i].c();
						transition_in(each_blocks_5[i], 1);
						each_blocks_5[i].m(div9, t0);
					}
				}

				group_outros();

				for (i = each_value_5.length; i < each_blocks_5.length; i += 1) {
					out(i);
				}

				check_outros();
			}

			const columnheader_changes = {};
			if (dirty[0] & /*headers*/ 1) columnheader_changes.headers = /*headers*/ ctx[0];
			if (dirty[0] & /*columnUnit*/ 4) columnheader_changes.columnUnit = /*columnUnit*/ ctx[2];
			if (dirty[0] & /*columnOffset*/ 8) columnheader_changes.columnOffset = /*columnOffset*/ ctx[3];
			columnheader.$set(columnheader_changes);

			if (dirty[0] & /*$allTimeRanges*/ 8388608) {
				const each_value_4 = /*$allTimeRanges*/ ctx[23];
				group_outros();
				each_blocks_4 = update_keyed_each(each_blocks_4, dirty, get_key, 1, ctx, each_value_4, each1_lookup, div0, outro_and_destroy_block, create_each_block_4, null, get_each_context_4);
				check_outros();
			}

			if (!current || dirty[0] & /*$_width*/ 1048576) {
				set_style(div0, "width", /*$_width*/ ctx[20] + "px");
			}

			if (dirty[0] & /*rightScrollbarVisible*/ 8192) {
				toggle_class(div2, "right-scrollbar-visible", /*rightScrollbarVisible*/ ctx[13]);
			}

			const columns_1_changes = {};
			if (dirty[0] & /*columns*/ 2048) columns_1_changes.columns = /*columns*/ ctx[11];
			columns_1.$set(columns_1_changes);

			if (dirty[0] & /*visibleRows*/ 131072) {
				const each_value_3 = /*visibleRows*/ ctx[17];

				updateVisibleRowsYPosision(each_value_3);
				StelteGanttScopeHolder.displayedTaskRows = each_value_3;

				group_outros();
				each_blocks_3 = update_keyed_each(each_blocks_3, dirty, get_key_1, 1, ctx, each_value_3, each2_lookup, div3, outro_and_destroy_block, create_each_block_3, null, get_each_context_3);
				check_outros();
			}

			if (!current || dirty[0] & /*paddingTop*/ 32768) {
				set_style(div3, "transform", "translateY(" + /*paddingTop*/ ctx[15] + "px)");
			}

			if (!current || dirty[0] & /*rowContainerHeight*/ 16384) {
				set_style(div4, "height", /*rowContainerHeight*/ ctx[14] + "px");
			}

			if (dirty[0] & /*$allTimeRanges*/ 8388608) {
				const each_value_2 = /*$allTimeRanges*/ ctx[23];
				group_outros();
				each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key_2, 1, ctx, each_value_2, each3_lookup, div5, outro_and_destroy_block, create_each_block_2, t5, get_each_context_2);
				check_outros();
			}

			if (dirty[0] & /*visibleTasks*/ 262144) {
				const each_value_1 = /*visibleTasks*/ ctx[18];
				StelteGanttScopeHolder.displayedTasks = each_value_1;

				group_outros();
				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_3, 1, ctx, each_value_1, each4_lookup, div5, outro_and_destroy_block, create_each_block_1, null, get_each_context_1);
				check_outros();

				updateTaskPositions();
			}

			if (dirty[0] & /*ganttBodyModules, paddingTop, paddingBottom, visibleRows*/ 229440 | dirty[1] & /*$$restProps*/ 4096) {
				each_value = /*ganttBodyModules*/ ctx[6];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$2(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$2(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div6, null);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out_1(i);
				}

				check_outros();
			}

			if (!current || dirty[0] & /*$_width*/ 1048576) {
				set_style(div6, "width", /*$_width*/ ctx[20] + "px");
			}

			if (dirty[0] & /*zooming*/ 4096) {
				toggle_class(div7, "zooming", /*zooming*/ ctx[12]);
			}

			if (!current || dirty[0] & /*classes*/ 16 && div9_class_value !== (div9_class_value = "sg-gantt " + /*classes*/ ctx[4] + " svelte-12fxs8g")) {
				attr(div9, "class", div9_class_value);
			}

			if (dirty[0] & /*classes, disableTransition*/ 524304) {
				toggle_class(div9, "sg-disable-transition", !/*disableTransition*/ ctx[19]);
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value_5.length; i += 1) {
				transition_in(each_blocks_5[i]);
			}

			transition_in(columnheader.$$.fragment, local);

			for (let i = 0; i < each_value_4.length; i += 1) {
				transition_in(each_blocks_4[i]);
			}

			transition_in(columns_1.$$.fragment, local);

			for (let i = 0; i < each_value_3.length; i += 1) {
				transition_in(each_blocks_3[i]);
			}

			for (let i = 0; i < each_value_2.length; i += 1) {
				transition_in(each_blocks_2[i]);
			}

			for (let i = 0; i < each_value_1.length; i += 1) {
				transition_in(each_blocks_1[i]);
			}

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks_5 = each_blocks_5.filter(Boolean);

			for (let i = 0; i < each_blocks_5.length; i += 1) {
				transition_out(each_blocks_5[i]);
			}

			transition_out(columnheader.$$.fragment, local);

			for (let i = 0; i < each_blocks_4.length; i += 1) {
				transition_out(each_blocks_4[i]);
			}

			transition_out(columns_1.$$.fragment, local);

			for (let i = 0; i < each_blocks_3.length; i += 1) {
				transition_out(each_blocks_3[i]);
			}

			for (let i = 0; i < each_blocks_2.length; i += 1) {
				transition_out(each_blocks_2[i]);
			}

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				transition_out(each_blocks_1[i]);
			}

			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div9);
			destroy_each(each_blocks_5, detaching);
			destroy_component(columnheader);

			for (let i = 0; i < each_blocks_4.length; i += 1) {
				each_blocks_4[i].d();
			}

			/*div2_binding*/ ctx[113](null);
			div2_resize_listener();
			destroy_component(columns_1);

			for (let i = 0; i < each_blocks_3.length; i += 1) {
				each_blocks_3[i].d();
			}

			/*div4_binding*/ ctx[115](null);

			for (let i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].d();
			}

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].d();
			}

			destroy_each(each_blocks, detaching);
			/*div7_binding*/ ctx[116](null);
			div7_resize_listener();
			/*div9_binding*/ ctx[118](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function onModuleInit(module) {

}

function instance$8($$self, $$props, $$invalidate) {
	const omit_props_names = [
		"rows", "tasks", "timeRanges", "rowPadding", "rowHeight", "from", "to", "minWidth", "fitWidth", "classes", "headers", "zoomLevels", "taskContent", "tableWidth", "resizeHandleWidth", "onTaskButtonClick", "magnetUnit", "magnetOffset", "columnUnit", "columnOffset", "ganttTableModules", "ganttBodyModules", "reflectOnParentRows", "reflectOnChildRows", "columnService", "api", "taskFactory", "rowFactory", "dndManager", "timeRangeFactory", "utils", "refreshTimeRanges", "refreshTasks", "getRowContainer", "selectTask", "unselectTasks", "scrollToRow", "scrollToTask", "updateTask", "updateTasks", "updateRow", "updateRows", "getRow", "getTask", "getTasks", "deleteTask"
	];

	let $$restProps = compute_rest_props($$props, omit_props_names);
	let $_from;
	let $_to;
	let $_minWidth;
	let $_fitWidth;
	let $_width;
	let $columnWidth;
	let $dimensionsChanged;
	let $taskStore;
	let $hoveredRow;
	let $selectedRow;
	let $_rowPadding;
	let $rowStore;
	let $allTasks;
	let $allRows;
	let $rowTaskCache;
	let $visibleHeight;
	let $headerHeight;
	let $allTimeRanges;
	let $visibleWidth;
	component_subscribe($$self, taskStore, $$value => $$invalidate(96, $taskStore = $$value));
	component_subscribe($$self, rowStore, $$value => $$invalidate(100, $rowStore = $$value));
	component_subscribe($$self, allTasks, $$value => $$invalidate(101, $allTasks = $$value));
	component_subscribe($$self, allRows, $$value => $$invalidate(102, $allRows = $$value));
	component_subscribe($$self, rowTaskCache, $$value => $$invalidate(103, $rowTaskCache = $$value));
	component_subscribe($$self, allTimeRanges, $$value => $$invalidate(23, $allTimeRanges = $$value));
	let ganttElement;
	let mainHeaderContainer;
	let mainContainer;
	let rowContainer;
	let scrollables = [];
	let mounted = false;
	let { rows } = $$props;
	let { tasks = [] } = $$props;
	let { timeRanges = [] } = $$props;
	let { rowPadding = 3 } = $$props;
	let { rowHeight = 36 } = $$props;
	const _rowHeight = writable(rowHeight);
	const _rowPadding = writable(rowPadding);
	component_subscribe($$self, _rowPadding, value => $$invalidate(99, $_rowPadding = value));
	let { from } = $$props;
	let { to } = $$props;
	const _from = writable(from);
	component_subscribe($$self, _from, value => $$invalidate(90, $_from = value));
	const _to = writable(to);
	component_subscribe($$self, _to, value => $$invalidate(91, $_to = value));
	let { minWidth = 800 } = $$props;
	let { fitWidth = false } = $$props;
	const _minWidth = writable(minWidth);
	component_subscribe($$self, _minWidth, value => $$invalidate(92, $_minWidth = value));
	const _fitWidth = writable(fitWidth);
	component_subscribe($$self, _fitWidth, value => $$invalidate(93, $_fitWidth = value));
	let { classes = [] } = $$props;
	let { headers = [{ unit: "day", format: "MMMM Do" }, { unit: "hour", format: "H:mm" }] } = $$props;

	let { zoomLevels = [
		{
			headers: [{ unit: "day", format: "DD.MM.YYYY" }, { unit: "hour", format: "HH" }],
			minWidth: 800,
			fitWidth: true
		},
		{
			headers: [
				{ unit: "hour", format: "ddd D/M, H A" },
				{ unit: "minute", format: "mm", offset: 15 }
			],
			minWidth: 5000,
			fitWidth: false
		}
	] } = $$props;

	let { taskContent = null } = $$props;
	let { tableWidth = 100 } = $$props;
	let { resizeHandleWidth = 10 } = $$props;
	let { onTaskButtonClick = null } = $$props;
	let { magnetUnit = "minute" } = $$props;
	let { magnetOffset = 15 } = $$props;
	let { columnUnit = "minute" } = $$props;
	let { columnOffset = 15 } = $$props;
	let { ganttTableModules = [] } = $$props;
	let { ganttBodyModules = [] } = $$props;
	let { reflectOnParentRows = true } = $$props;
	let { reflectOnChildRows = false } = $$props;
	const visibleWidth = writable();
	component_subscribe($$self, visibleWidth, value => $$invalidate(24, $visibleWidth = value));
	const visibleHeight = writable();
	component_subscribe($$self, visibleHeight, value => $$invalidate(21, $visibleHeight = value));
	const headerHeight = writable();
	component_subscribe($$self, headerHeight, value => $$invalidate(22, $headerHeight = value));

	const _width = derived([visibleWidth, _minWidth, _fitWidth], ([visible, min, stretch]) => {
		return stretch && visible > min ? visible : min;
	});

	component_subscribe($$self, _width, value => $$invalidate(20, $_width = value));

	const columnService = {
		getColumnByDate(date) {
			const pair = findByDate(columns, date);
			return !pair[0] ? pair[1] : pair[0];
		},
		getColumnByPosition(x) {
			const pair = findByPosition(columns, x);
			return !pair[0] ? pair[1] : pair[0];
		},
		getPositionByDate(date) {
			if (!date) return null;
			const column = this.getColumnByDate(date);
			let durationTo = date.diff(column.from, "milliseconds");
			const position = durationTo / column.duration * column.width;

			//multiples - skip every nth col, use other duration
			return column.left + position;
		},
		getDateByPosition(x) {
			const column = this.getColumnByPosition(x);
			x = x - column.left;
			let positionDuration = column.duration / column.width * x;
			const date = moment(column.from).add(positionDuration, "milliseconds");
			return date;
		},
		/**
 * 
 * @param {Moment} date - Date
 * @returns {Moment} rounded date passed as parameter
 */
		roundTo(date) {
			let value = date.get(magnetUnit);
			value = Math.round(value / magnetOffset);
			date.set(magnetUnit, value * magnetOffset);

			//round all smaller units to 0
			const units = ["millisecond", "second", "minute", "hour", "date", "month", "year"];
			const indexOf = units.indexOf(magnetUnit);

			for (let i = 0; i < indexOf; i++) {
				date.set(units[i], 0);
			}

			return date;
		}
	};

	const columnWidth = writable(getPositionByDate($_from.clone().add(columnOffset, columnUnit), $_from, $_to, $_width) | 0);
	component_subscribe($$self, columnWidth, value => $$invalidate(94, $columnWidth = value));
	let columnCount = Math.ceil($_width / $columnWidth);
	let columns = getColumns($_from, columnCount, columnOffset, columnUnit, $columnWidth);

	function getColumns(from, count, offset, unit, width) {
		let columns = [];
		let columnFrom = from.clone();
		let left = 0;

		for (let i = 0; i < count; i++) {
			const from = columnFrom.clone();
			const to = columnFrom.add(offset, unit);
			const duration = to.diff(from, "milliseconds");
			columns.push({ width, from, left, duration });
			left += width;
			columnFrom = to;
		}

		return columns;
	}

	const dimensionsChanged = derived([columnWidth, _from, _to], () => ({}));
	component_subscribe($$self, dimensionsChanged, value => $$invalidate(95, $dimensionsChanged = value));

	setContext("dimensions", {
		from: _from,
		to: _to,
		width: _width,
		visibleWidth,
		visibleHeight,
		headerHeight,
		dimensionsChanged
	});

	setContext("options", {
		taskContent,
		rowPadding: _rowPadding,
		rowHeight: _rowHeight,
		resizeHandleWidth,
		reflectOnParentRows,
		reflectOnChildRows,
		onTaskButtonClick
	});

	const hoveredRow = writable();
	component_subscribe($$self, hoveredRow, value => $$invalidate(97, $hoveredRow = value));
	const selectedRow = writable();
	component_subscribe($$self, selectedRow, value => $$invalidate(98, $selectedRow = value));
	const ganttContext = { scrollables, hoveredRow, selectedRow };
	setContext("gantt", ganttContext);

	onMount(() => {
		Object.assign(ganttContext, {
			rowContainer,
			mainContainer,
			mainHeaderContainer
		});

		api.registerEvent("tasks", "move");
		api.registerEvent("tasks", "select");
		api.registerEvent("tasks", "switchRow");
		api.registerEvent("tasks", "moveEnd");
		api.registerEvent("tasks", "change");
		api.registerEvent("tasks", "changed");
		api.registerEvent("gantt", "viewChanged");
		api.registerEvent("rows", "dblclick");
		api.registerEvent("tasks", "dblclick");
		api.registerEvent("tasks", "contextmenu");
		api.registerEvent("rows", "mouseover");

		$$invalidate(82, mounted = true);
	});

	onDelegatedEvent("dblclick", "data-row-id", (event, data, target) => {
		var targetClasses = target.getAttribute('class');
		if (targetClasses.indexOf('sg-table-row') > - 1) return;

		var date = columnService.getDateByPosition(event.offsetX);

		const rowId = data;
		var object = { date: date, rowId: rowId };

		if (event.ctrlKey) {
			selectionManager.toggleSelection(rowId);
		} else {
			selectionManager.selectSingle(rowId);
		}

		api.rows.raise.dblclick(object);

		set_store_value(selectedRow, $selectedRow = +data);
	});

	onDelegatedEvent("contextmenu", "data-task-id", (event, data, target) => {
		const taskId = data;
		const task = $taskStore.entities[taskId];

		if (event.ctrlKey) {
			selectionManager.toggleSelection(taskId);
		} else {
			selectionManager.selectSingle(taskId);
		}

		const object = {
			taskId: data,
			task: task,
			event: event
		}

		api.tasks.raise.contextmenu(object);
		event.preventDefault();
	});

	onDelegatedEvent("dblclick", "data-task-id", (event, data, target) => {
		const taskId = data;
		const task = $taskStore.entities[taskId];

		if (event.ctrlKey) {
			selectionManager.toggleSelection(taskId);
		} else {
			selectionManager.selectSingle(taskId);
		}

		var date = columnService.getDateByPosition(event.layerX);

		const object = {
			taskId: data,
			task: task,
			event: event,
			date: date
		}

		api.tasks.raise.dblclick(object);
	});

	onDelegatedEvent("click", "data-task-id", (event, data, target) => {
		const taskId = data;
		const task = $taskStore.entities[taskId];

		if (event.ctrlKey) {
			selectionManager.toggleSelection(taskId);
		} else {
			selectionManager.selectSingle(taskId);
		}

		const object = {
			taskId: data,
			task: task,
			event: event
		}

		//const task = $taskStore.entities[taskId];

		api.tasks.raise.select(object);
	});

	onDelegatedEvent("mouseover", "data-row-id", (event, data, target) => {
		const object = {
			rowId: data,
			event: event
		}

		api.rows.raise.mouseover(object);

		set_store_value(hoveredRow, $hoveredRow = +data);
	});

	onDelegatedEvent("click", "data-row-id", (event, data, target) => {
		set_store_value(selectedRow, $selectedRow = +data);
		const rowId = data;
		if (event.ctrlKey) {
			selectionManager.toggleSelection(rowId);
		} else {
			selectionManager.selectSingle(rowId);
		}
	});

	onDestroy(() => {
		offDelegatedEvent("click", "data-task-id");
		offDelegatedEvent("click", "data-row-id");
		offDelegatedEvent("dblclick", "data-row-id");
		offDelegatedEvent("dblclick", "data-task-id");
	});

	let __scrollTop = 0;
	let __scrollLeft = 0;

	function scrollable(node) {
		const onscroll = event => {
			const { scrollTop, scrollLeft } = node;

			scrollables.forEach(scrollable => {
				if (scrollable.orientation === "horizontal") {
					scrollable.node.scrollLeft = scrollLeft;
				} else {
					scrollable.node.scrollTop = scrollTop;
				}
			});

			$$invalidate(84, __scrollTop = scrollTop);
			__scrollLeft = scrollLeft;
		};

		node.addEventListener("scroll", onscroll);

		return {
			destroy() {
				node.removeEventListener("scroll", onscroll, false);
			}
		};
	}

	function horizontalScrollListener(node) {
		scrollables.push({ node, orientation: "horizontal" });
	}

	function onResize(event) {
		$$invalidate(1, tableWidth = event.detail.left);
	}

	let zoomLevel = 0;
	let zooming = false;

	async function onwheel(event) {
		// if (event.ctrlKey) {
		// 	event.preventDefault();
		// 	const prevZoomLevel = zoomLevel;

		// 	if (event.deltaY > 0) {
		// 		zoomLevel = Math.max(zoomLevel - 1, 0);
		// 	} else {
		// 		zoomLevel = Math.min(zoomLevel + 1, zoomLevels.length - 1);
		// 	}

		// 	if (prevZoomLevel != zoomLevel && zoomLevels[zoomLevel]) {
		// 		const options = {
		// 			columnUnit,
		// 			columnOffset,
		// 			minWidth: $_minWidth,
		// 			...zoomLevels[zoomLevel]
		// 		};

		// 		const scale = options.minWidth / $_width;
		// 		const node = mainContainer;
		// 		const mousepos = getRelativePos(node, event);
		// 		const before = node.scrollLeft + mousepos.x;
		// 		const after = before * scale;
		// 		const scrollLeft = after - mousepos.x + node.clientWidth / 2;
		// 		console.log("scrollLeft", scrollLeft);
		// 		$$invalidate(2, columnUnit = options.columnUnit);
		// 		$$invalidate(3, columnOffset = options.columnOffset);
		// 		set_store_value(_minWidth, $_minWidth = options.minWidth);
		// 		if (options.headers) $$invalidate(0, headers = options.headers);
		// 		if (options.fitWidth) set_store_value(_fitWidth, $_fitWidth = options.fitWidth);
		// 		api.gantt.raise.viewChanged();
		// 		$$invalidate(12, zooming = true);
		// 		await tick();
		// 		node.scrollLeft = scrollLeft;
		// 		$$invalidate(12, zooming = false);
		// 	}
		// }
	}

	function onDateSelected(event) {
		set_store_value(_from, $_from = event.detail.from.clone());
		set_store_value(_to, $_to = event.detail.to.clone());
	}

	function initRows(rowsData) {
		const rows = rowFactory.createRows(rowsData);
		rowStore.addAll(rows);
		// try {
		// 	rows.forEach(row => {
		// 		onRowCollapsed(row);
		// 	});
		// } catch (error) {
		// 	console.log("default collapse error");
		// 	console.log(error);
		// }
	}

	function onRowCollapsed(currentRow) {
		const row = currentRow;
		row.expanded = false;
		if (row.children) hide(row.children);
		updateYPositions(row.height);
	}

	function updateYPositions(rowHeight) {


		let y = 0;

		$rowStore.ids.forEach(id => {
			const row = $rowStore.entities[id];

			if (!row.hidden) {
				set_store_value(rowStore, $rowStore.entities[id].y = y, $rowStore);
				y += rowHeight;
			}
		});

		// $taskStore.ids.forEach(id => {
		// 	const task = $taskStore.entities[id];
		// 	const row = $rowStore.entities[task.model.resourceId];
		// 	set_store_value(taskStore, $taskStore.entities[id].top = row.y + $rowPadding, $taskStore);
		// });
	}

	async function initTasks(taskData) {
		await tick();
		const tasks = [];
		const opts = { rowPadding: $_rowPadding };

		taskData.forEach(t => {
			const task = taskFactory.createTask(t);
			const row = $rowStore.entities[task.model.resourceId];
			task.reflections = [];

			if (reflectOnChildRows && row.allChildren) {
				row.allChildren.forEach(r => {
					const reflectedTask = reflectTask(task, r, opts);
					task.reflections.push(reflectedTask.model.id);
					tasks.push(reflectedTask);
				});
			}

			if (reflectOnParentRows && row.allParents.length > 0) {
				row.allParents.forEach(r => {
					const reflectedTask = reflectTask(task, r, opts);
					task.reflections.push(reflectedTask.model.id);
					tasks.push(reflectedTask);
				});
			}

			tasks.push(task);
		});

		taskStore.addAll(tasks);
	}

	function initTimeRanges(timeRangeData) {
		const timeRanges = timeRangeData.map(timeRange => {
			return timeRangeFactory.create(timeRange);
		});

		timeRangeStore.addAll(timeRanges);
	}

	async function tickWithoutCSSTransition() {
		$$invalidate(19, disableTransition = false);
		await tick();
		ganttElement.offsetHeight; // force a reflow
		$$invalidate(19, disableTransition = true);
	}

	const api = new GanttApi();
	const selectionManager = new SelectionManager();
	const taskFactory = new TaskFactory(columnService);
	const rowFactory = new RowFactory();
	const dndManager = new DragDropManager(rowStore);
	const timeRangeFactory = new TimeRangeFactory(columnService);
	const utils = new GanttUtils();

	setContext("services", {
		utils,
		api,
		dndManager,
		selectionManager,
		columnService
	});

	function refreshTimeRanges() {
		timeRangeStore._update(({ ids, entities }) => {
			ids.forEach(id => {
				const timeRange = entities[id];
				const newLeft = columnService.getPositionByDate(timeRange.model.from) | 0;
				const newRight = columnService.getPositionByDate(timeRange.model.to) | 0;
				timeRange.left = newLeft;
				timeRange.width = newRight - newLeft;
			});

			return { ids, entities };
		});
	}

	function refreshTasks() {
		$allTasks.forEach(task => {
			const newLeft = columnService.getPositionByDate(task.model.from) | 0;
			const newRight = columnService.getPositionByDate(task.model.to) | 0;
			task.left = newLeft;
			task.width = newRight - newLeft;
		});

		taskStore.refresh();
	}

	function getRowContainer() {
		return rowContainer;
	}

	function deleteTask(id) {
		taskStore.delete(id);
	}

	function selectTask(id) {
		const task = $taskStore.entities[id];

		if (task) {
			selectionManager.selectSingle(task);
		}
	}

	function unselectTasks() {
		selectionManager.clearSelection();
	}

	function scrollToRow(id, scrollBehavior = "auto") {
		const { scrollTop, clientHeight } = mainContainer;
		const index = $allRows.findIndex(r => r.model.id == id);
		if (index === -1) return;
		const targetTop = index * rowHeight;

		if (targetTop < scrollTop) {
			mainContainer.scrollTo({ top: targetTop, behavior: scrollBehavior });
		}

		if (targetTop > scrollTop + clientHeight) {
			mainContainer.scrollTo({
				top: targetTop + rowHeight - clientHeight,
				behavior: scrollBehavior
			});
		}
	}

	function scrollToTask(id, scrollBehavior = "auto") {
		const { scrollLeft, scrollTop, clientWidth, clientHeight } = mainContainer;
		const task = $taskStore.entities[id];
		if (!task) return;
		const targetLeft = task.left;
		const rowIndex = $allRows.findIndex(r => r.model.id == task.model.resourceId);
		const targetTop = rowIndex * rowHeight;

		const options = {
			top: undefined,
			left: undefined,
			behavior: scrollBehavior
		};

		if (targetLeft < scrollLeft) {
			options.left = targetLeft;
		}

		if (targetLeft > scrollLeft + clientWidth) {
			options.left = targetLeft + task.width - clientWidth;
		}

		if (targetTop < scrollTop) {
			options.top = targetTop;
		}

		if (targetTop > scrollTop + clientHeight) {
			options.top = targetTop + rowHeight - clientHeight;
		}

		mainContainer.scrollTo(options);
	}

	function updateTask(model) {
		const task = taskFactory.createTask(model);
		taskStore.upsert(task);
	}

	function updateTasks(taskModels) {
		//const tasks =  taskModels.map(model => taskFactory.createTask(model));

		updateAllTasks(taskModels);

	}

	async function updateAllTasks(taskData) {
		await tick();
		const tasks = [];
		const opts = { rowPadding: $_rowPadding };

		taskData.forEach(t => {
			const task = taskFactory.createTask(t);
			const row = $rowStore.entities[task.model.resourceId];
			task.reflections = [];

			if (reflectOnChildRows && row.allChildren) {
				row.allChildren.forEach(r => {
					const reflectedTask = reflectTask(task, r, opts);
					task.reflections.push(reflectedTask.model.id);
					tasks.push(reflectedTask);
				});
			}

			if (reflectOnParentRows && row.allParents.length > 0) {
				row.allParents.forEach(r => {
					const reflectedTask = reflectTask(task, r, opts);
					task.reflections.push(reflectedTask.model.id);
					tasks.push(reflectedTask);
				});
			}

			tasks.push(task);
		});

		taskStore.upsertAll(tasks);//taskStore.addAll(tasks);
	}

	function updateRow(model, parentId) {
		if (!parentId) {
			const row = rowFactory.createRow(model);
			rowStore.upsert(row);
		}
		else {
			//rowStore.delete(parentId);
			updateRows([model]);
		}
	}

	function updateRows(rowModels) { //custom to add child row
		const rows = rowFactory.createRows(rowModels);  //rowModels.map(model => rowFactory.createRow(model));
		rowStore.upsertAll(rows);
		//collapseAll(rows);

	}

	async function collapseAll(rows) {
		rows.forEach(row => {
			onRowCollapsed(row);
		});
	}

	function getRow(resourceId) {
		return $rowStore.entities[resourceId];
	}

	function getTask(id) {
		return $taskStore.entities[id];
	}

	function getTasks(resourceId) {
		if ($rowTaskCache[resourceId]) {
			return $rowTaskCache[resourceId].map(id => $taskStore.entities[id]);
		}

		return null;
	}

	let filteredRows = [];
	let rightScrollbarVisible;
	let rowContainerHeight;
	let startIndex;
	let endIndex;
	let paddingTop = 0;
	let paddingBottom = 0;
	let visibleRows = [];
	let visibleTasks;
	let disableTransition = true;

	function div2_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(8, mainHeaderContainer = $$value);
		});
	}

	function div2_elementresize_handler() {
		$headerHeight = this.clientHeight;
		headerHeight.set($headerHeight);
	}

	function div4_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(10, rowContainer = $$value);
		});
	}

	function div7_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(9, mainContainer = $$value);
		});
	}

	function div7_elementresize_handler() {
		$visibleHeight = this.clientHeight;
		visibleHeight.set($visibleHeight);
		$visibleWidth = this.clientWidth;
		visibleWidth.set($visibleWidth);
	}

	function div9_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(7, ganttElement = $$value);
		});
	}

	$$self.$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(43, $$restProps = compute_rest_props($$props, omit_props_names));
		if ("rows" in $$new_props) $$invalidate(47, rows = $$new_props.rows);
		if ("tasks" in $$new_props) $$invalidate(48, tasks = $$new_props.tasks);
		if ("timeRanges" in $$new_props) $$invalidate(49, timeRanges = $$new_props.timeRanges);
		if ("rowPadding" in $$new_props) $$invalidate(50, rowPadding = $$new_props.rowPadding);
		if ("rowHeight" in $$new_props) $$invalidate(51, rowHeight = $$new_props.rowHeight);
		if ("from" in $$new_props) $$invalidate(52, from = $$new_props.from);
		if ("to" in $$new_props) $$invalidate(53, to = $$new_props.to);
		if ("minWidth" in $$new_props) $$invalidate(54, minWidth = $$new_props.minWidth);
		if ("fitWidth" in $$new_props) $$invalidate(55, fitWidth = $$new_props.fitWidth);
		if ("classes" in $$new_props) $$invalidate(4, classes = $$new_props.classes);
		if ("headers" in $$new_props) $$invalidate(0, headers = $$new_props.headers);
		if ("zoomLevels" in $$new_props) $$invalidate(56, zoomLevels = $$new_props.zoomLevels);
		if ("taskContent" in $$new_props) $$invalidate(57, taskContent = $$new_props.taskContent);
		if ("tableWidth" in $$new_props) $$invalidate(1, tableWidth = $$new_props.tableWidth);
		if ("resizeHandleWidth" in $$new_props) $$invalidate(58, resizeHandleWidth = $$new_props.resizeHandleWidth);
		if ("onTaskButtonClick" in $$new_props) $$invalidate(59, onTaskButtonClick = $$new_props.onTaskButtonClick);
		if ("magnetUnit" in $$new_props) $$invalidate(60, magnetUnit = $$new_props.magnetUnit);
		if ("magnetOffset" in $$new_props) $$invalidate(61, magnetOffset = $$new_props.magnetOffset);
		if ("columnUnit" in $$new_props) $$invalidate(2, columnUnit = $$new_props.columnUnit);
		if ("columnOffset" in $$new_props) $$invalidate(3, columnOffset = $$new_props.columnOffset);
		if ("ganttTableModules" in $$new_props) $$invalidate(5, ganttTableModules = $$new_props.ganttTableModules);
		if ("ganttBodyModules" in $$new_props) $$invalidate(6, ganttBodyModules = $$new_props.ganttBodyModules);
		if ("reflectOnParentRows" in $$new_props) $$invalidate(62, reflectOnParentRows = $$new_props.reflectOnParentRows);
		if ("reflectOnChildRows" in $$new_props) $$invalidate(63, reflectOnChildRows = $$new_props.reflectOnChildRows);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[1] & /*rows*/ 65536 | $$self.$$.dirty[2] & /*mounted*/ 1048576) {
			if (mounted) initRows(rows);
		}

		if ($$self.$$.dirty[1] & /*tasks*/ 131072 | $$self.$$.dirty[2] & /*mounted*/ 1048576) {
			if (mounted) initTasks(tasks);
		}

		if ($$self.$$.dirty[1] & /*timeRanges*/ 262144 | $$self.$$.dirty[2] & /*mounted*/ 1048576) {
			if (mounted) initTimeRanges(timeRanges);
		}

		if ($$self.$$.dirty[1] & /*from*/ 2097152) {
			set_store_value(_from, $_from = from);
		}

		if ($$self.$$.dirty[1] & /*to*/ 4194304) {
			set_store_value(_to, $_to = to);
		}

		if ($$self.$$.dirty[1] & /*minWidth, fitWidth*/ 25165824) {
			{
				set_store_value(_minWidth, $_minWidth = minWidth);
				set_store_value(_fitWidth, $_fitWidth = fitWidth);
			}
		}

		if ($$self.$$.dirty[0] & /*columnOffset, columnUnit, $_width*/ 1048588 | $$self.$$.dirty[2] & /*$_from, $_to*/ 805306368) {
			set_store_value(columnWidth, $columnWidth = getPositionByDate($_from.clone().add(columnOffset, columnUnit), $_from, $_to, $_width) | 0);
		}

		if ($$self.$$.dirty[0] & /*$_width*/ 1048576 | $$self.$$.dirty[3] & /*$columnWidth*/ 2) {
			$$invalidate(83, columnCount = Math.ceil($_width / $columnWidth));
		}

		if ($$self.$$.dirty[0] & /*columnOffset, columnUnit*/ 12 | $$self.$$.dirty[2] & /*$_from, columnCount*/ 270532608 | $$self.$$.dirty[3] & /*$columnWidth*/ 2) {
			$$invalidate(11, columns = getColumns($_from, columnCount, columnOffset, columnUnit, $columnWidth));
		}

		if ($$self.$$.dirty[3] & /*$dimensionsChanged*/ 4) {
			{
				if ($dimensionsChanged) {
					refreshTasks();
					refreshTimeRanges();
				}
			}
		}

		if ($$self.$$.dirty[3] & /*$_rowPadding, $rowStore*/ 192) {
			{
				$$invalidate(44, taskFactory.rowPadding = $_rowPadding, taskFactory);
				$$invalidate(44, taskFactory.rowEntities = $rowStore.entities, taskFactory);
			}
		}

		if ($$self.$$.dirty[1] & /*rowHeight*/ 1048576) {
			$$invalidate(45, rowFactory.rowHeight = rowHeight, rowFactory);
		}

		if ($$self.$$.dirty[0] & /*$_width*/ 1048576 | $$self.$$.dirty[1] & /*magnetOffset, magnetUnit*/ 1610612736 | $$self.$$.dirty[2] & /*$_from, $_to*/ 805306368) {
			{
				$$invalidate(46, utils.from = $_from, utils);
				$$invalidate(46, utils.to = $_to, utils);
				$$invalidate(46, utils.width = $_width, utils);
				$$invalidate(46, utils.magnetOffset = magnetOffset, utils);
				$$invalidate(46, utils.magnetUnit = magnetUnit, utils);
			}
		}

		if ($$self.$$.dirty[3] & /*$allRows*/ 512) {
			$$invalidate(87, filteredRows = $allRows.filter(row => !row.hidden));
		}

		if ($$self.$$.dirty[1] & /*rowHeight*/ 1048576 | $$self.$$.dirty[2] & /*filteredRows*/ 33554432) {
			$$invalidate(14, rowContainerHeight = filteredRows.length * rowHeight);
		}

		if ($$self.$$.dirty[0] & /*rowContainerHeight, $visibleHeight*/ 2113536) {
			$$invalidate(13, rightScrollbarVisible = rowContainerHeight > $visibleHeight);
		}

		if ($$self.$$.dirty[1] & /*rowHeight*/ 1048576 | $$self.$$.dirty[2] & /*__scrollTop*/ 4194304) {
			$$invalidate(88, startIndex = Math.floor(__scrollTop / rowHeight));
		}

		if ($$self.$$.dirty[0] & /*$visibleHeight*/ 2097152 | $$self.$$.dirty[1] & /*rowHeight*/ 1048576 | $$self.$$.dirty[2] & /*startIndex, filteredRows*/ 100663296) {
			$$invalidate(89, endIndex = Math.min(startIndex + Math.ceil($visibleHeight / rowHeight), filteredRows.length - 1));
		}

		if ($$self.$$.dirty[1] & /*rowHeight*/ 1048576 | $$self.$$.dirty[2] & /*startIndex*/ 67108864) {
			$$invalidate(15, paddingTop = startIndex * rowHeight);
		}

		if ($$self.$$.dirty[1] & /*rowHeight*/ 1048576 | $$self.$$.dirty[2] & /*filteredRows, endIndex*/ 167772160) {
			$$invalidate(16, paddingBottom = (filteredRows.length - endIndex - 1) * rowHeight);
		}

		if ($$self.$$.dirty[2] & /*filteredRows, startIndex, endIndex*/ 234881024) {
			$$invalidate(17, visibleRows = filteredRows.slice(startIndex, endIndex + 1));
		}

		if ($$self.$$.dirty[0] & /*visibleRows*/ 131072 | $$self.$$.dirty[3] & /*$rowTaskCache, $taskStore*/ 1032) {
			{
				const tasks = [];

				visibleRows.forEach(row => {
					if ($rowTaskCache[row.model.id]) {
						$rowTaskCache[row.model.id].forEach(id => {
							tasks.push($taskStore.entities[id]);
						});
					}
				});

				$$invalidate(18, visibleTasks = tasks);
			}
		}

		if ($$self.$$.dirty[3] & /*$dimensionsChanged*/ 4) {
			if ($dimensionsChanged) tickWithoutCSSTransition();
		}
	};

	return [
		headers,
		tableWidth,
		columnUnit,
		columnOffset,
		classes,
		ganttTableModules,
		ganttBodyModules,
		ganttElement,
		mainHeaderContainer,
		mainContainer,
		rowContainer,
		columns,
		zooming,
		rightScrollbarVisible,
		rowContainerHeight,
		paddingTop,
		paddingBottom,
		visibleRows,
		visibleTasks,
		disableTransition,
		$_width,
		$visibleHeight,
		$headerHeight,
		$allTimeRanges,
		$visibleWidth,
		_rowPadding,
		_from,
		_to,
		_minWidth,
		_fitWidth,
		visibleWidth,
		visibleHeight,
		headerHeight,
		_width,
		columnWidth,
		dimensionsChanged,
		hoveredRow,
		selectedRow,
		scrollable,
		horizontalScrollListener,
		onResize,
		onwheel,
		onDateSelected,
		$$restProps,
		taskFactory,
		rowFactory,
		utils,
		rows,
		tasks,
		timeRanges,
		rowPadding,
		rowHeight,
		from,
		to,
		minWidth,
		fitWidth,
		zoomLevels,
		taskContent,
		resizeHandleWidth,
		onTaskButtonClick,
		magnetUnit,
		magnetOffset,
		reflectOnParentRows,
		reflectOnChildRows,
		columnService,
		api,
		dndManager,
		timeRangeFactory,
		refreshTimeRanges,
		refreshTasks,
		getRowContainer,
		selectTask,
		unselectTasks,
		scrollToRow,
		scrollToTask,
		updateTask,
		updateTasks,
		updateRow,
		updateRows,
		getRow,
		getTask,
		getTasks,
		mounted,
		columnCount,
		__scrollTop,
		__scrollLeft,
		zoomLevel,
		filteredRows,
		startIndex,
		endIndex,
		$_from,
		$_to,
		$_minWidth,
		$_fitWidth,
		$columnWidth,
		$dimensionsChanged,
		$taskStore,
		$hoveredRow,
		$selectedRow,
		$_rowPadding,
		$rowStore,
		$allTasks,
		$allRows,
		$rowTaskCache,
		scrollables,
		_rowHeight,
		getColumns,
		ganttContext,
		initRows,
		initTasks,
		initTimeRanges,
		tickWithoutCSSTransition,
		selectionManager,
		div2_binding,
		div2_elementresize_handler,
		div4_binding,
		div7_binding,
		div7_elementresize_handler,
		div9_binding,
		deleteTask,
	];
}

class Gantt extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$8,
			create_fragment$8,
			safe_not_equal,
			{
				rows: 47,
				tasks: 48,
				timeRanges: 49,
				rowPadding: 50,
				rowHeight: 51,
				from: 52,
				to: 53,
				minWidth: 54,
				fitWidth: 55,
				classes: 4,
				headers: 0,
				zoomLevels: 56,
				taskContent: 57,
				tableWidth: 1,
				resizeHandleWidth: 58,
				onTaskButtonClick: 59,
				magnetUnit: 60,
				magnetOffset: 61,
				columnUnit: 2,
				columnOffset: 3,
				ganttTableModules: 5,
				ganttBodyModules: 6,
				reflectOnParentRows: 62,
				reflectOnChildRows: 63,
				columnService: 64,
				api: 65,
				taskFactory: 44,
				rowFactory: 45,
				dndManager: 66,
				timeRangeFactory: 67,
				utils: 46,
				refreshTimeRanges: 68,
				refreshTasks: 69,
				getRowContainer: 70,
				selectTask: 71,
				unselectTasks: 72,
				scrollToRow: 73,
				scrollToTask: 74,
				updateTask: 75,
				updateTasks: 76,
				updateRow: 77,
				updateRows: 78,
				getRow: 79,
				getTask: 80,
				getTasks: 81,
				deleteTask: 119
			},
			[-1, -1, -1, -1, -1]
		);
	}

	get columnService() {
		return this.$$.ctx[64];
	}

	get api() {
		return this.$$.ctx[65];
	}

	get taskFactory() {
		return this.$$.ctx[44];
	}

	get rowFactory() {
		return this.$$.ctx[45];
	}

	get dndManager() {
		return this.$$.ctx[66];
	}

	get timeRangeFactory() {
		return this.$$.ctx[67];
	}

	get utils() {
		return this.$$.ctx[46];
	}

	get refreshTimeRanges() {
		return this.$$.ctx[68];
	}

	get refreshTasks() {
		return this.$$.ctx[69];
	}

	get getRowContainer() {
		return this.$$.ctx[70];
	}

	get selectTask() {
		return this.$$.ctx[71];
	}

	get unselectTasks() {
		return this.$$.ctx[72];
	}

	get scrollToRow() {
		return this.$$.ctx[73];
	}

	get scrollToTask() {
		return this.$$.ctx[74];
	}

	get updateTask() {
		return this.$$.ctx[75];
	}

	get updateTasks() {
		return this.$$.ctx[76];
	}

	get updateRow() {
		return this.$$.ctx[77];
	}

	get updateRows() {
		return this.$$.ctx[78];
	}

	get getRow() {
		return this.$$.ctx[79];
	}

	get getTask() {
		return this.$$.ctx[80];
	}

	get getTasks() {
		return this.$$.ctx[81];
	}

	get deleteTask() {
		return this.$$.ctx[119];
	}
}

/* src\modules\table\TableTreeCell.svelte generated by Svelte v3.23.0 */

function create_if_block$2(ctx) {
	let div;
	let mounted;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*row*/ ctx[0].expanded) return create_if_block_1$1;
		return create_else_block$1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			div = element("div");
			if_block.c();
			attr(div, "class", "sg-tree-expander svelte-1tpezbv");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if_block.m(div, null);

			if (!mounted) {
				dispose = listen(div, "click", /*onExpandToggle*/ ctx[1]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(div, null);
				}
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			if_block.d();
			mounted = false;
			dispose();
		}
	};
}

// (22:12) {:else}
function create_else_block$1(ctx) {
	let i;

	return {
		c() {
			i = element("i");
			attr(i, "class", "fa fa-angle-right");
		},
		m(target, anchor) {
			insert(target, i, anchor);
		},
		d(detaching) {
			if (detaching) detach(i);
		}
	};
}

// (20:12) {#if row.expanded}
function create_if_block_1$1(ctx) {
	let i;

	return {
		c() {
			i = element("i");
			attr(i, "class", "fa fa-angle-down");
		},
		m(target, anchor) {
			insert(target, i, anchor);
		},
		d(detaching) {
			if (detaching) detach(i);
		}
	};
}

function create_fragment$9(ctx) {
	let div;
	let t;
	let current;
	let if_block = /*row*/ ctx[0].children && create_if_block$2(ctx);
	const default_slot_template = /*$$slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

	return {
		c() {
			div = element("div");
			if (if_block) if_block.c();
			t = space();
			if (default_slot) default_slot.c();
			attr(div, "class", "sg-cell-inner svelte-1tpezbv");
			set_style(div, "padding-left", /*row*/ ctx[0].childLevel * 2 + "em");
			set_style(div, "font-weight", /*row*/ ctx[0].childLevel === 0 ? '600' : '500');
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block) if_block.m(div, null);
			append(div, t);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (/*row*/ ctx[0].children) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$2(ctx);
					if_block.c();
					if_block.m(div, t);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 8) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
				}
			}

			if (!current || dirty & /*row*/ 1) {
				set_style(div, "padding-left", /*row*/ ctx[0].childLevel * 2 + "em");
				set_style(div, "font-weight", /*row*/ ctx[0].childLevel === 0 ? '600' : '500');
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$9($$self, $$props, $$invalidate) {
	let { row } = $$props;
	const dispatch = createEventDispatcher();

	function onExpandToggle() {
		if (row.expanded) {
			dispatch("rowCollapsed", { row });
		} else {
			dispatch("rowExpanded", { row });
		}
	}

	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("row" in $$props) $$invalidate(0, row = $$props.row);
		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
	};

	return [row, onExpandToggle, dispatch, $$scope, $$slots];
}

class TableTreeCell extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$9, create_fragment$9, safe_not_equal, { row: 0 });
	}
}

/* src\modules\table\TableRow.svelte generated by Svelte v3.23.0 */

function get_each_context$3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[12] = list[i];
	return child_ctx;
}

// (40:12) {:else}
function create_else_block_1(ctx) {
	let t;
	let if_block1_anchor;
	let if_block0 = /*row*/ ctx[1].model.iconClass && create_if_block_7(ctx);

	function select_block_type_2(ctx, dirty) {
		if (/*row*/ ctx[1].model.headerHtml) return create_if_block_4$1;
		if (/*header*/ ctx[12].renderer) return create_if_block_5;
		if (/*header*/ ctx[12].type === "resourceInfo") return create_if_block_6;
		return create_else_block_2;
	}

	let current_block_type = select_block_type_2(ctx);
	let if_block1 = current_block_type(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t = space();
			if_block1.c();
			if_block1_anchor = empty();
		},
		m(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t, anchor);
			if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (/*row*/ ctx[1].model.iconClass) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_7(ctx);
					if_block0.c();
					if_block0.m(t.parentNode, t);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block1) {
				if_block1.p(ctx, dirty);
			} else {
				if_block1.d(1);
				if_block1 = current_block_type(ctx);

				if (if_block1) {
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach(t);
			if_block1.d(detaching);
			if (detaching) detach(if_block1_anchor);
		}
	};
}

// (24:12) {#if header.type == 'tree'}
function create_if_block$3(ctx) {
	let current;

	const tabletreecell = new TableTreeCell({
		props: {
			row: /*row*/ ctx[1],
			$$slots: { default: [create_default_slot] },
			$$scope: { ctx }
		}
	});

	tabletreecell.$on("rowCollapsed", /*rowCollapsed_handler*/ ctx[10]);
	tabletreecell.$on("rowExpanded", /*rowExpanded_handler*/ ctx[11]);

	return {
		c() {
			create_component(tabletreecell.$$.fragment);
		},
		m(target, anchor) {
			mount_component(tabletreecell, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const tabletreecell_changes = {};
			if (dirty & /*row*/ 2) tabletreecell_changes.row = /*row*/ ctx[1];

			if (dirty & /*$$scope, row, headers*/ 32771) {
				tabletreecell_changes.$$scope = { dirty, ctx };
			}

			tabletreecell.$set(tabletreecell_changes);
		},
		i(local) {
			if (current) return;
			transition_in(tabletreecell.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tabletreecell.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(tabletreecell, detaching);
		}
	};
}

// (41:16) {#if row.model.iconClass}
function create_if_block_7(ctx) {
	let div;
	let i;
	let i_class_value;

	return {
		c() {
			div = element("div");
			i = element("i");
			attr(i, "class", i_class_value = "" + (null_to_empty(/*row*/ ctx[1].model.iconClass) + " svelte-137zt6g"));
			attr(div, "class", "sg-table-icon svelte-137zt6g");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, i);
		},
		p(ctx, dirty) {
			if (dirty & /*row*/ 2 && i_class_value !== (i_class_value = "" + (null_to_empty(/*row*/ ctx[1].model.iconClass) + " svelte-137zt6g"))) {
				attr(i, "class", i_class_value);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (56:16) {:else}
function create_else_block_2(ctx) {
	let t_value = /*row*/ ctx[1].model[/*header*/ ctx[12].property] + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*row, headers*/ 3 && t_value !== (t_value = /*row*/ ctx[1].model[/*header*/ ctx[12].property] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (51:57) 
function create_if_block_6(ctx) {
	let img;
	let img_src_value;
	let t0;
	let div;
	let t1_value = /*row*/ ctx[1].model[/*header*/ ctx[12].property] + "";
	let t1;

	return {
		c() {
			img = element("img");
			t0 = space();
			div = element("div");
			t1 = text(t1_value);
			attr(img, "class", "sg-resource-image svelte-137zt6g");
			if (img.src !== (img_src_value = /*row*/ ctx[1].model.imageSrc)) attr(img, "src", img_src_value);
			attr(img, "alt", "");
			attr(div, "class", "sg-resource-title");
		},
		m(target, anchor) {
			insert(target, img, anchor);
			insert(target, t0, anchor);
			insert(target, div, anchor);
			append(div, t1);
		},
		p(ctx, dirty) {
			if (dirty & /*row*/ 2 && img.src !== (img_src_value = /*row*/ ctx[1].model.imageSrc)) {
				attr(img, "src", img_src_value);
			}

			if (dirty & /*row, headers*/ 3 && t1_value !== (t1_value = /*row*/ ctx[1].model[/*header*/ ctx[12].property] + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) detach(img);
			if (detaching) detach(t0);
			if (detaching) detach(div);
		}
	};
}

// (49:42) 
function create_if_block_5(ctx) {
	let html_tag;
	let raw_value = /*header*/ ctx[12].renderer(/*row*/ ctx[1]) + "";

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(raw_value, target, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*headers, row*/ 3 && raw_value !== (raw_value = /*header*/ ctx[12].renderer(/*row*/ ctx[1]) + "")) html_tag.p(raw_value);
		},
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

// (47:16) {#if row.model.headerHtml}
function create_if_block_4$1(ctx) {
	let html_tag;
	let raw_value = /*row*/ ctx[1].model.headerHtml + "";

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(raw_value, target, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*row*/ 2 && raw_value !== (raw_value = /*row*/ ctx[1].model.headerHtml + "")) html_tag.p(raw_value);
		},
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

// (26:20) {#if row.model.iconClass}
function create_if_block_3$1(ctx) {
	let div;
	let i;
	let i_class_value;

	return {
		c() {
			div = element("div");
			i = element("i");
			attr(i, "class", i_class_value = "" + (null_to_empty(/*row*/ ctx[1].model.iconClass) + " svelte-137zt6g"));
			attr(div, "class", "sg-table-icon svelte-137zt6g");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, i);
		},
		p(ctx, dirty) {
			if (dirty & /*row*/ 2 && i_class_value !== (i_class_value = "" + (null_to_empty(/*row*/ ctx[1].model.iconClass) + " svelte-137zt6g"))) {
				attr(i, "class", i_class_value);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (36:20) {:else}
function create_else_block$2(ctx) {
	let t_value = /*row*/ ctx[1].model[/*header*/ ctx[12].property] + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*row, headers*/ 3 && t_value !== (t_value = /*row*/ ctx[1].model[/*header*/ ctx[12].property] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (34:46) 
function create_if_block_2$1(ctx) {
	let html_tag;
	let raw_value = /*header*/ ctx[12].renderer(/*row*/ ctx[1]) + "";

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(raw_value, target, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*headers, row*/ 3 && raw_value !== (raw_value = /*header*/ ctx[12].renderer(/*row*/ ctx[1]) + "")) html_tag.p(raw_value);
		},
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

// (32:20) {#if row.model.headerHtml}
function create_if_block_1$2(ctx) {
	let html_tag;
	let raw_value = /*row*/ ctx[1].model.headerHtml + "";

	return {
		c() {
			html_tag = new HtmlTag(null);
		},
		m(target, anchor) {
			html_tag.m(raw_value, target, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*row*/ 2 && raw_value !== (raw_value = /*row*/ ctx[1].model.headerHtml + "")) html_tag.p(raw_value);
		},
		d(detaching) {
			if (detaching) html_tag.d();
		}
	};
}

// (25:16) <TableTreeCell on:rowCollapsed on:rowExpanded {row}>
function create_default_slot(ctx) {
	let t;
	let if_block1_anchor;
	let if_block0 = /*row*/ ctx[1].model.iconClass && create_if_block_3$1(ctx);

	function select_block_type_1(ctx, dirty) {
		if (/*row*/ ctx[1].model.headerHtml) return create_if_block_1$2;
		if (/*header*/ ctx[12].renderer) return create_if_block_2$1;
		return create_else_block$2;
	}

	let current_block_type = select_block_type_1(ctx);
	let if_block1 = current_block_type(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t = space();
			if_block1.c();
			if_block1_anchor = empty();
		},
		m(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t, anchor);
			if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (/*row*/ ctx[1].model.iconClass) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_3$1(ctx);
					if_block0.c();
					if_block0.m(t.parentNode, t);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block1) {
				if_block1.p(ctx, dirty);
			} else {
				if_block1.d(1);
				if_block1 = current_block_type(ctx);

				if (if_block1) {
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			}
		},
		d(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach(t);
			if_block1.d(detaching);
			if (detaching) detach(if_block1_anchor);
		}
	};
}

// (22:4) {#each headers as header}
function create_each_block$3(ctx) {
	let div;
	let current_block_type_index;
	let if_block;
	let t;
	let current;
	const if_block_creators = [create_if_block$3, create_else_block_1];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*header*/ ctx[12].type == "tree") return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			div = element("div");
			if_block.c();
			t = space();
			attr(div, "class", "sg-table-body-cell sg-table-cell svelte-137zt6g");
			set_style(div, "width", /*header*/ ctx[12].width + "px");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if_blocks[current_block_type_index].m(div, null);
			append(div, t);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(div, t);
			}

			if (!current || dirty & /*headers*/ 1) {
				set_style(div, "width", /*header*/ ctx[12].width + "px");
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if_blocks[current_block_type_index].d();
		}
	};
}

function create_fragment$a(ctx) {
	let div;
	let div_class_value;
	let div_data_row_id_value;
	let current;
	let each_value = /*headers*/ ctx[0];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", div_class_value = "sg-table-row " + (/*row*/ ctx[1].model.class || "") + " svelte-137zt6g");
			set_style(div, "height", /*$rowHeight*/ ctx[2] + "px");
			attr(div, "data-row-id", div_data_row_id_value = /*row*/ ctx[1].model.id);
			toggle_class(div, "sg-row-expanded", /*row*/ ctx[1].expanded);
			toggle_class(div, "sg-hover", /*$hoveredRow*/ ctx[3] == /*row*/ ctx[1].model.id);
			toggle_class(div, "sg-selected", /*$selectedRow*/ ctx[4] == /*row*/ ctx[1].model.id);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*headers, row*/ 3) {
				each_value = /*headers*/ ctx[0];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$3(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$3(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div, null);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}

			if (!current || dirty & /*row*/ 2 && div_class_value !== (div_class_value = "sg-table-row " + (/*row*/ ctx[1].model.class || "") + " svelte-137zt6g")) {
				attr(div, "class", div_class_value);
			}

			if (!current || dirty & /*$rowHeight*/ 4) {
				set_style(div, "height", /*$rowHeight*/ ctx[2] + "px");
			}

			if (!current || dirty & /*row*/ 2 && div_data_row_id_value !== (div_data_row_id_value = /*row*/ ctx[1].model.id)) {
				attr(div, "data-row-id", div_data_row_id_value);
			}

			if (dirty & /*row, row*/ 2) {
				toggle_class(div, "sg-row-expanded", /*row*/ ctx[1].expanded);
			}

			if (dirty & /*row, $hoveredRow, row*/ 10) {
				toggle_class(div, "sg-hover", /*$hoveredRow*/ ctx[3] == /*row*/ ctx[1].model.id);
			}

			if (dirty & /*row, $selectedRow, row*/ 18) {
				toggle_class(div, "sg-selected", /*$selectedRow*/ ctx[4] == /*row*/ ctx[1].model.id);
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$a($$self, $$props, $$invalidate) {
	let $rowHeight;
	let $hoveredRow;
	let $selectedRow;
	let { headers = null } = $$props;
	let { row = null } = $$props;
	const { rowHeight } = getContext("options");
	component_subscribe($$self, rowHeight, value => $$invalidate(2, $rowHeight = value));
	const { hoveredRow, selectedRow } = getContext("gantt");
	component_subscribe($$self, hoveredRow, value => $$invalidate(3, $hoveredRow = value));
	component_subscribe($$self, selectedRow, value => $$invalidate(4, $selectedRow = value));
	const dispatch = createEventDispatcher();
	let treeIndentationStyle = "";

	function rowCollapsed_handler(event) {
		bubble($$self, event);
	}

	function rowExpanded_handler(event) {
		bubble($$self, event);
	}

	$$self.$set = $$props => {
		if ("headers" in $$props) $$invalidate(0, headers = $$props.headers);
		if ("row" in $$props) $$invalidate(1, row = $$props.row);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*row*/ 2) {
			{
				treeIndentationStyle = row.parent
					? `padding-left: ${row.childLevel * 3}em;`
					: "";
			}
		}
	};

	return [
		headers,
		row,
		$rowHeight,
		$hoveredRow,
		$selectedRow,
		rowHeight,
		hoveredRow,
		selectedRow,
		treeIndentationStyle,
		dispatch,
		rowCollapsed_handler,
		rowExpanded_handler
	];
}

class TableRow extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$a, create_fragment$a, safe_not_equal, { headers: 0, row: 1 });
	}
}

/* src\modules\table\Table.svelte generated by Svelte v3.23.0 */

function get_each_context$4(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[28] = list[i];
	return child_ctx;
}

function get_each_context_1$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[31] = list[i];
	return child_ctx;
}

// (115:8) {#each tableHeaders as header}
function create_each_block_1$1(ctx) {
	let div;
	let t0_value = /*header*/ ctx[31].title + "";
	let t0;
	let t1;

	return {
		c() {
			div = element("div");
			t0 = text(t0_value);
			t1 = space();
			attr(div, "class", "sg-table-header-cell sg-table-cell svelte-s3b3pm");
			set_style(div, "width", /*header*/ ctx[31].width + "px");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t0);
			append(div, t1);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*tableHeaders*/ 32 && t0_value !== (t0_value = /*header*/ ctx[31].title + "")) set_data(t0, t0_value);

			if (dirty[0] & /*tableHeaders*/ 32) {
				set_style(div, "width", /*header*/ ctx[31].width + "px");
			}
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (125:16) {#each visibleRows as row}
function create_each_block$4(ctx) {
	let current;

	const tablerow = new TableRow({
		props: {
			row: /*row*/ ctx[28],
			headers: /*tableHeaders*/ ctx[5]
		}
	});

	tablerow.$on("rowExpanded", /*onRowExpanded*/ ctx[14]);
	tablerow.$on("rowCollapsed", /*onRowCollapsed*/ ctx[15]);

	return {
		c() {
			create_component(tablerow.$$.fragment);
		},
		m(target, anchor) {
			mount_component(tablerow, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const tablerow_changes = {};
			if (dirty[0] & /*visibleRows*/ 16) tablerow_changes.row = /*row*/ ctx[28];
			if (dirty[0] & /*tableHeaders*/ 32) tablerow_changes.headers = /*tableHeaders*/ ctx[5];
			tablerow.$set(tablerow_changes);
		},
		i(local) {
			if (current) return;
			transition_in(tablerow.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tablerow.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(tablerow, detaching);
		}
	};
}

function create_fragment$b(ctx) {
	let div4;
	let div0;
	let t;
	let div3;
	let div2;
	let div1;
	let current;
	let mounted;
	let dispose;
	let each_value_1 = /*tableHeaders*/ ctx[5];
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
	}

	let each_value = /*visibleRows*/ ctx[4];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div4 = element("div");
			div0 = element("div");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t = space();
			div3 = element("div");
			div2 = element("div");
			div1 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div0, "class", "sg-table-header svelte-s3b3pm");
			set_style(div0, "height", /*$headerHeight*/ ctx[8] + "px");
			attr(div1, "class", "sg-table-rows svelte-s3b3pm");
			set_style(div1, "padding-top", /*paddingTop*/ ctx[1] + "px");
			set_style(div1, "padding-bottom", /*paddingBottom*/ ctx[2] + "px");
			set_style(div1, "height", /*rowContainerHeight*/ ctx[3] + "px");
			attr(div2, "class", "sg-table-scroller svelte-s3b3pm");
			attr(div3, "class", "sg-table-body svelte-s3b3pm");
			toggle_class(div3, "bottom-scrollbar-visible", /*bottomScrollbarVisible*/ ctx[7]);
			attr(div4, "class", "sg-table sg-view svelte-s3b3pm");
			set_style(div4, "width", /*tableWidth*/ ctx[0] + "px");
		},
		m(target, anchor) {
			insert(target, div4, anchor);
			append(div4, div0);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(div0, null);
			}

			/*div0_binding*/ ctx[27](div0);
			append(div4, t);
			append(div4, div3);
			append(div3, div2);
			append(div2, div1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div1, null);
			}

			current = true;

			if (!mounted) {
				dispose = action_destroyer(ctx[13].call(null, div2));
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*tableHeaders*/ 32) {
				each_value_1 = /*tableHeaders*/ ctx[5];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_1$1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(div0, null);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (!current || dirty[0] & /*$headerHeight*/ 256) {
				set_style(div0, "height", /*$headerHeight*/ ctx[8] + "px");
			}

			if (dirty[0] & /*visibleRows, tableHeaders, onRowExpanded, onRowCollapsed*/ 49200) {
				each_value = /*visibleRows*/ ctx[4];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$4(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$4(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div1, null);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}

			if (!current || dirty[0] & /*paddingTop*/ 2) {
				set_style(div1, "padding-top", /*paddingTop*/ ctx[1] + "px");
			}

			if (!current || dirty[0] & /*paddingBottom*/ 4) {
				set_style(div1, "padding-bottom", /*paddingBottom*/ ctx[2] + "px");
			}

			if (!current || dirty[0] & /*rowContainerHeight*/ 8) {
				set_style(div1, "height", /*rowContainerHeight*/ ctx[3] + "px");
			}

			if (dirty[0] & /*bottomScrollbarVisible*/ 128) {
				toggle_class(div3, "bottom-scrollbar-visible", /*bottomScrollbarVisible*/ ctx[7]);
			}

			if (!current || dirty[0] & /*tableWidth*/ 1) {
				set_style(div4, "width", /*tableWidth*/ ctx[0] + "px");
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div4);
			destroy_each(each_blocks_1, detaching);
			/*div0_binding*/ ctx[27](null);
			destroy_each(each_blocks, detaching);
			mounted = false;
			dispose();
		}
	};
}

function hide(children) {
	children.forEach(row => {
		if (row.children) hide(row.children);
		row.hidden = true;
	});
}

function show(children, hidden = false) {
	children.forEach(row => {
		if (row.children) show(row.children, !row.expanded);
		row.hidden = hidden;
	});
}

function instance$b($$self, $$props, $$invalidate) {
	let $rowStore;
	let $taskStore;
	let $rowPadding;
	let $width;
	let $visibleWidth;
	let $headerHeight;
	component_subscribe($$self, rowStore, $$value => $$invalidate(17, $rowStore = $$value));
	component_subscribe($$self, taskStore, $$value => $$invalidate(18, $taskStore = $$value));
	const dispatch = createEventDispatcher();
	let { tableWidth } = $$props;
	let { paddingTop } = $$props;
	let { paddingBottom } = $$props;
	let { rowContainerHeight } = $$props;
	let { visibleRows } = $$props;

	let { tableHeaders = [
		{
			title: "Name",
			property: "label",
			width: 100
		}
	] } = $$props;

	const { from, to, width, visibleWidth, headerHeight } = getContext("dimensions");
	component_subscribe($$self, width, value => $$invalidate(20, $width = value));
	component_subscribe($$self, visibleWidth, value => $$invalidate(21, $visibleWidth = value));
	component_subscribe($$self, headerHeight, value => $$invalidate(8, $headerHeight = value));
	const { rowPadding } = getContext("options");
	component_subscribe($$self, rowPadding, value => $$invalidate(19, $rowPadding = value));

	onMount(() => {
		dispatch("init", { module: this });
	});

	const { scrollables } = getContext("gantt");
	let headerContainer;

	function scrollListener(node) {
		scrollables.push({ node, orientation: "vertical" });

		node.addEventListener("scroll", event => {
			$$invalidate(6, headerContainer.scrollLeft = node.scrollLeft, headerContainer);
		});

		return {
			destroy() {
				node.removeEventListener("scroll");
			}
		};
	}

	let scrollWidth;

	function onRowExpanded(event) {
		const row = event.detail.row;
		row.expanded = true;
		if (row.children) show(row.children);
		updateYPositions(row);
	}

	function onRowCollapsed(event, currentRow = null) {
		const row = event.detail.row;
		if (currentRow != null) {
			row = currentRow;
		}
		row.expanded = false;
		if (row.children) hide(row.children);
		updateYPositions(row);
	}

	async function updateYPositions(row) {
		
		const { height, children } = row;
		const { displayedTaskRows } = StelteGanttScopeHolder;

		const childRowIds = children.map(c => c.model.id);

		const currentRowIds = displayedTaskRows.map(i => i.model.id);
		
		const updateRowIds = [...currentRowIds, ...childRowIds];
		const updatedRow = $rowStore.ids.filter(i => updateRowIds.includes(i));

		let y = $rowStore.entities[updateRowIds[0]].y;
		updateRowIds.forEach(id => {
			const row = $rowStore.entities[id];

			if (!row.hidden) {
				set_store_value_async(rowStore, $rowStore.entities[id].y = y, $rowStore);
				y += height;
			}
		});

		StelteGanttScopeHolder.$taskStore = $taskStore;
		// $taskStore.ids.forEach(id => {
		// 	const task = $taskStore.entities[id];
		// 	const row = $rowStore.entities[task.model.resourceId];
			//if (limitRowIds.indexOf(row.model.id) > - 1) {
		// 		set_store_value_async(taskStore, $taskStore.entities[id].top = row.y + $rowPadding, $taskStore,6454);
			//}
		// });
	}

	// if gantt displays a bottom scrollbar and table does not, we need to pad out the table
	let bottomScrollbarVisible;

	function div0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(6, headerContainer = $$value);
		});
	}

	$$self.$set = $$props => {
		if ("tableWidth" in $$props) $$invalidate(0, tableWidth = $$props.tableWidth);
		if ("paddingTop" in $$props) $$invalidate(1, paddingTop = $$props.paddingTop);
		if ("paddingBottom" in $$props) $$invalidate(2, paddingBottom = $$props.paddingBottom);
		if ("rowContainerHeight" in $$props) $$invalidate(3, rowContainerHeight = $$props.rowContainerHeight);
		if ("visibleRows" in $$props) $$invalidate(4, visibleRows = $$props.visibleRows);
		if ("tableHeaders" in $$props) $$invalidate(5, tableHeaders = $$props.tableHeaders);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*tableHeaders*/ 32) {
			{
				let sum = 0;

				tableHeaders.forEach(header => {
					sum += header.width;
				});

				$$invalidate(16, scrollWidth = sum);
			}
		}

		if ($$self.$$.dirty[0] & /*$width, $visibleWidth, scrollWidth, tableWidth*/ 3211265) {
			{
				$$invalidate(7, bottomScrollbarVisible = $width > $visibleWidth && scrollWidth <= tableWidth);
			}
		}
	};

	return [
		tableWidth,
		paddingTop,
		paddingBottom,
		rowContainerHeight,
		visibleRows,
		tableHeaders,
		headerContainer,
		bottomScrollbarVisible,
		$headerHeight,
		width,
		visibleWidth,
		headerHeight,
		rowPadding,
		scrollListener,
		onRowExpanded,
		onRowCollapsed,
		scrollWidth,
		$rowStore,
		$taskStore,
		$rowPadding,
		$width,
		$visibleWidth,
		dispatch,
		from,
		to,
		scrollables,
		updateYPositions,
		div0_binding
	];
}

class Table extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$b,
			create_fragment$b,
			safe_not_equal,
			{
				tableWidth: 0,
				paddingTop: 1,
				paddingBottom: 2,
				rowContainerHeight: 3,
				visibleRows: 4,
				tableHeaders: 5
			},
			[-1, -1]
		);
	}
}

var SvelteGanttTable = Table;

/* src\modules\dependencies\Arrow.svelte generated by Svelte v3.23.0 */

function create_fragment$c(ctx) {
	let svg;
	let path0;
	let path1;

	return {
		c() {
			svg = svg_element("svg");
			path0 = svg_element("path");
			path1 = svg_element("path");
			attr(path0, "d", /*path*/ ctx[2]);
			attr(path0, "stroke", /*stroke*/ ctx[0]);
			attr(path0, "stroke-width", /*strokeWidth*/ ctx[1]);
			attr(path0, "fill", "transparent");
			attr(path0, "class", "select-area svelte-5u2c1l");
			attr(path1, "d", /*arrowPath*/ ctx[3]);
			attr(path1, "fill", /*stroke*/ ctx[0]);
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "shape-rendering", "crispEdges");
			attr(svg, "class", "arrow svelte-5u2c1l");
			attr(svg, "height", "100%");
			attr(svg, "width", "100%");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path0);
			append(svg, path1);
		},
		p(ctx, [dirty]) {
			if (dirty & /*path*/ 4) {
				attr(path0, "d", /*path*/ ctx[2]);
			}

			if (dirty & /*stroke*/ 1) {
				attr(path0, "stroke", /*stroke*/ ctx[0]);
			}

			if (dirty & /*strokeWidth*/ 2) {
				attr(path0, "stroke-width", /*strokeWidth*/ ctx[1]);
			}

			if (dirty & /*arrowPath*/ 8) {
				attr(path1, "d", /*arrowPath*/ ctx[3]);
			}

			if (dirty & /*stroke*/ 1) {
				attr(path1, "fill", /*stroke*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

function instance$c($$self, $$props, $$invalidate) {
	let { startY } = $$props;
	let { endY } = $$props;
	let { endX } = $$props;
	let { startX } = $$props;
	let { minLen = 12 } = $$props;
	let { arrowSize = 5 } = $$props;
	let { stroke = "red" } = $$props;
	let { strokeWidth = 2 } = $$props;

	onMount(() => {

	});

	let height;
	let width;
	let path;
	let arrowPath;

	$$self.$set = $$props => {
		if ("startY" in $$props) $$invalidate(4, startY = $$props.startY);
		if ("endY" in $$props) $$invalidate(5, endY = $$props.endY);
		if ("endX" in $$props) $$invalidate(6, endX = $$props.endX);
		if ("startX" in $$props) $$invalidate(7, startX = $$props.startX);
		if ("minLen" in $$props) $$invalidate(8, minLen = $$props.minLen);
		if ("arrowSize" in $$props) $$invalidate(9, arrowSize = $$props.arrowSize);
		if ("stroke" in $$props) $$invalidate(0, stroke = $$props.stroke);
		if ("strokeWidth" in $$props) $$invalidate(1, strokeWidth = $$props.strokeWidth);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*endY, startY*/ 48) {
			$$invalidate(10, height = endY - startY);
		}

		if ($$self.$$.dirty & /*endX, startX*/ 192) {
			$$invalidate(11, width = endX - startX);
		}

		if ($$self.$$.dirty & /*startX, minLen, endX, startY, endY, height, width*/ 3568) {
			{
				if (startX == NaN || startX == undefined) $$invalidate(2, path = "M0 0");
				let result;

				if (startX + minLen >= endX && startY != endY) {
					result = `L ${startX + minLen} ${startY} 
                        L ${startX + minLen} ${startY + height / 2}
                        L ${endX - minLen} ${startY + height / 2}
                        L ${endX - minLen} ${endY} `;
				} else {
					result = `L ${startX + width / 2} ${startY} 
                        L ${startX + width / 2} ${endY}`;
				}

				// -2 so the line doesn't stick out of the arrowhead
				$$invalidate(2, path = `M${startX} ${startY}` + result + `L ${endX - 2} ${endY}`);
			}
		}

		if ($$self.$$.dirty & /*endX, arrowSize, endY*/ 608) {
			{
				if (endX == NaN || endX == undefined) $$invalidate(3, arrowPath = "M0 0");
				$$invalidate(3, arrowPath = `M${endX - arrowSize} ${endY - arrowSize} L${endX} ${endY} L${endX - arrowSize} ${endY + arrowSize} Z`);
			}
		}
	};

	return [
		stroke,
		strokeWidth,
		path,
		arrowPath,
		startY,
		endY,
		endX,
		startX,
		minLen,
		arrowSize
	];
}

class Arrow extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$c, create_fragment$c, safe_not_equal, {
			startY: 4,
			endY: 5,
			endX: 6,
			startX: 7,
			minLen: 8,
			arrowSize: 9,
			stroke: 0,
			strokeWidth: 1
		});
	}
}

/* src\modules\dependencies\Dependency.svelte generated by Svelte v3.23.0 */

function create_fragment$d(ctx) {
	let div;
	let current;

	const arrow = new Arrow({
		props: {
			startX: /*fromTask*/ ctx[1].left + /*fromTask*/ ctx[1].width,
			startY: /*fromTask*/ ctx[1].top + /*fromTask*/ ctx[1].height / 2,
			endX: /*toTask*/ ctx[2].left,
			endY: /*toTask*/ ctx[2].top + /*toTask*/ ctx[2].height / 2
		}
	});

	return {
		c() {
			div = element("div");
			create_component(arrow.$$.fragment);
			attr(div, "class", "sg-dependency svelte-fnf1gz");
			set_style(div, "left", "0");
			set_style(div, "top", "0");
			attr(div, "data-dependency-id", /*id*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(arrow, div, null);
			current = true;
		},
		p(ctx, [dirty]) {
			const arrow_changes = {};
			if (dirty & /*fromTask*/ 2) arrow_changes.startX = /*fromTask*/ ctx[1].left + /*fromTask*/ ctx[1].width;
			if (dirty & /*fromTask*/ 2) arrow_changes.startY = /*fromTask*/ ctx[1].top + /*fromTask*/ ctx[1].height / 2;
			if (dirty & /*toTask*/ 4) arrow_changes.endX = /*toTask*/ ctx[2].left;
			if (dirty & /*toTask*/ 4) arrow_changes.endY = /*toTask*/ ctx[2].top + /*toTask*/ ctx[2].height / 2;
			arrow.$set(arrow_changes);

			if (!current || dirty & /*id*/ 1) {
				attr(div, "data-dependency-id", /*id*/ ctx[0]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(arrow.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(arrow.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(arrow);
		}
	};
}

function instance$d($$self, $$props, $$invalidate) {
	let $taskStore;
	component_subscribe($$self, taskStore, $$value => $$invalidate(5, $taskStore = $$value));
	let { id } = $$props;
	let { fromId } = $$props;
	let { toId } = $$props;
	let fromTask;
	let toTask;

	$$self.$set = $$props => {
		if ("id" in $$props) $$invalidate(0, id = $$props.id);
		if ("fromId" in $$props) $$invalidate(3, fromId = $$props.fromId);
		if ("toId" in $$props) $$invalidate(4, toId = $$props.toId);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$taskStore, fromId*/ 40) {
			$$invalidate(1, fromTask = $taskStore.entities[fromId]);
		}

		if ($$self.$$.dirty & /*$taskStore, toId*/ 48) {
			$$invalidate(2, toTask = $taskStore.entities[toId]);
		}
	};

	return [id, fromTask, toTask, fromId, toId];
}

class Dependency extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$d, create_fragment$d, safe_not_equal, { id: 0, fromId: 3, toId: 4 });
	}
}

/* src\modules\dependencies\GanttDependencies.svelte generated by Svelte v3.23.0 */

function get_each_context$5(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	return child_ctx;
}

// (39:4) {#each visibleDependencies as dependency (dependency.id)}
function create_each_block$5(key_1, ctx) {
	let first;
	let current;
	const dependency_spread_levels = [/*dependency*/ ctx[6]];
	let dependency_props = {};

	for (let i = 0; i < dependency_spread_levels.length; i += 1) {
		dependency_props = assign(dependency_props, dependency_spread_levels[i]);
	}

	const dependency = new Dependency({ props: dependency_props });

	return {
		key: key_1,
		first: null,
		c() {
			first = empty();
			create_component(dependency.$$.fragment);
			this.first = first;
		},
		m(target, anchor) {
			insert(target, first, anchor);
			mount_component(dependency, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const dependency_changes = (dirty & /*visibleDependencies*/ 1)
				? get_spread_update(dependency_spread_levels, [get_spread_object(/*dependency*/ ctx[6])])
				: {};

			dependency.$set(dependency_changes);
		},
		i(local) {
			if (current) return;
			transition_in(dependency.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(dependency.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(first);
			destroy_component(dependency, detaching);
		}
	};
}

function create_fragment$e(ctx) {
	let div;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let current;
	let each_value = /*visibleDependencies*/ ctx[0];
	const get_key = ctx => /*dependency*/ ctx[6].id;

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$5(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$5(key, child_ctx));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", "dependency-container svelte-hatx0f");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*visibleDependencies*/ 1) {
				const each_value = /*visibleDependencies*/ ctx[0];
				group_outros();
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$5, null, get_each_context$5);
				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}
		}
	};
}

function instance$e($$self, $$props, $$invalidate) {
	let $taskStore;
	let $visibleHeight;
	component_subscribe($$self, taskStore, $$value => $$invalidate(4, $taskStore = $$value));
	const { visibleHeight } = getContext("dimensions");
	component_subscribe($$self, visibleHeight, value => $$invalidate(5, $visibleHeight = value));
	let { paddingTop } = $$props;
	let { dependencies = [] } = $$props;
	let visibleDependencies = [];

	$$self.$set = $$props => {
		if ("paddingTop" in $$props) $$invalidate(2, paddingTop = $$props.paddingTop);
		if ("dependencies" in $$props) $$invalidate(3, dependencies = $$props.dependencies);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*dependencies, $taskStore, paddingTop, $visibleHeight*/ 60) {
			{
				const result = [];

				for (let i = 0; i < dependencies.length; i++) {
					const dependency = dependencies[i];
					const map = $taskStore.entities;
					const fromTask = map[dependency.fromId];
					const toTask = map[dependency.toId];

					if (fromTask && toTask && Math.min(fromTask.top, toTask.top) <= paddingTop + $visibleHeight && Math.max(fromTask.top, toTask.top) >= paddingTop) {
						result.push(dependency);
					}
				}

				$$invalidate(0, visibleDependencies = result);
			}
		}
	};

	return [visibleDependencies, visibleHeight, paddingTop, dependencies];
}

class GanttDependencies extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$e, create_fragment$e, safe_not_equal, { paddingTop: 2, dependencies: 3 });
	}
}

var SvelteGanttDependencies = GanttDependencies;

const defaults = {
	enabled: true,
	elementContent: () => {
		const element = document.createElement('div');
		element.innerHTML = 'New Task';
		Object.assign(element.style, {
			position: 'absolute',
			background: '#eee',
			padding: '0.5em 1em',
			fontSize: '12px',
			pointerEvents: 'none',
		});
		return element;
	}
};
class SvelteGanttExternal {
	constructor(node, options) {
		this.options = Object.assign({}, defaults, options);
		this.draggable = new Draggable(node, {
			onDrag: this.onDrag.bind(this),
			dragAllowed: () => this.options.enabled,
			resizeAllowed: false,
			onDrop: this.onDrop.bind(this),
			container: document.body,
			getX: (event) => event.pageX,
			getY: (event) => event.pageY,
			getWidth: () => 0
		});
	}
	onDrag({ x, y }) {
		if (!this.element) {
			this.element = this.options.elementContent();
			document.body.appendChild(this.element);
			this.options.dragging = true;
		}
		this.element.style.top = y + 'px';
		this.element.style.left = x + 'px';
	}
	onDrop(event) {
		var _a, _b, _c, _d;
		const gantt = this.options.gantt;
		const targetRow = gantt.dndManager.getTarget('row', event.mouseEvent);
		if (targetRow) {
			const mousePos = getRelativePos(gantt.getRowContainer(), event.mouseEvent);
			const date = gantt.utils.getDateByPosition(mousePos.x);
			(_b = (_a = this.options).onsuccess) === null || _b === void 0 ? void 0 : _b.call(_a, targetRow, date, gantt);
		}
		else {
			(_d = (_c = this.options).onfail) === null || _d === void 0 ? void 0 : _d.call(_c);
		}
		document.body.removeChild(this.element);
		this.options.dragging = false;
		this.element = null;
	}
}

var StelteGanttScopeHolder = {
	displayedTasks: [],
	displayedTaskRows: []
	/*
    taskLifeCycle - Use for custom or listening the task life cycle event (ref: Gantt.api.task.lifeCycle),
*/};
// import { SvelteGanttTableComponent } from './modules/table';
var SvelteGantt = Gantt;

export { SvelteGantt, SvelteGanttDependencies, SvelteGanttExternal, SvelteGanttTable };
//# sourceMappingURL=index.js.map
//test
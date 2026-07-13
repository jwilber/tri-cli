import test from 'ava';
import {hierarchy} from 'd3-hierarchy';
import {
	assignShortcuts,
	formatBytes,
	getViewportWindow,
} from '../source/utils.js';

test('formats byte values across units and handles invalid input', t => {
	t.is(formatBytes(0), '0 B');
	t.is(formatBytes(1024), '1 KB');
	t.is(formatBytes(1536), '1.5 KB');
	t.is(formatBytes(Number.NaN), '0 B');
});

test('assigns stable, globally unique shortcuts in large nested trees', t => {
	const children = Array.from({length: 30}, (_, index) => ({
		name: `directory-${index}`,
		isFile: false,
		children: index === 0 ? [{name: 'nested', isFile: false}] : undefined,
	}));
	children.push(
		{name: 'one.txt', isFile: true},
		{name: 'two.txt', isFile: true},
	);
	const root = assignShortcuts(
		hierarchy({name: 'root', isFile: false, children}),
	);
	const shortcuts = root.descendants().map(node => node.shortcut);

	t.is(new Set(shortcuts).size, shortcuts.length);
	t.is(root.shortcut, '.');
	t.is(root.children[0].shortcut, 'a');
	t.is(root.children[0].children[0].shortcut, 'a.a');
	t.is(root.children[23].shortcut, 'aa');
	t.deepEqual(
		root
			.descendants()
			.filter(node => node.data.isFile)
			.map(node => node.shortcut),
		['1', '2'],
	);
	t.false(shortcuts.includes('q'));
	t.false(shortcuts.includes('t'));
	t.false(shortcuts.includes('m'));
});

test('viewport windows include indicators without exceeding available rows', t => {
	const middle = getViewportWindow(100, 50, 8);
	t.true(middle.showAbove);
	t.true(middle.showBelow);
	t.is(
		middle.end -
			middle.start +
			Number(middle.showAbove) +
			Number(middle.showBelow),
		8,
	);

	const start = getViewportWindow(100, 0, 8);
	t.false(start.showAbove);
	t.true(start.showBelow);
	t.is(start.end - start.start + 1, 8);
});

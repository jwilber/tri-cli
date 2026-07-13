import React from 'react';
import test from 'ava';
import {hierarchy} from 'd3-hierarchy';
import {render} from 'ink-testing-library';
import {
	createDirectoryGrid,
	createTreemapRoot,
	TreeMapView,
} from '../dist/Treemap.js';

const data = {
	name: 'root',
	path: '/root',
	isFile: false,
	size: 100,
	children: [
		{name: 'large.js', path: '/root/large.js', isFile: true, size: 100},
		{name: 'empty.txt', path: '/root/empty.txt', isFile: true, size: 0},
		{name: 'empty-dir', path: '/root/empty-dir', isFile: false, size: 0},
	],
};

test('uses minimum layout weights without changing displayed byte totals', t => {
	const root = createTreemapRoot(data, 80, 20);
	t.is(data.size, 100);
	t.is(root.value, 102);
	for (const node of root.children) {
		t.true(node.x1 > node.x0);
		t.true(node.y1 > node.y0);
		t.true(node.x0 >= 0 && node.x1 <= 80);
		t.true(node.y0 >= 0 && node.y1 <= 20);
	}
});

test('creates a fixed-size grid and keeps labels off rectangle borders', t => {
	const width = 80;
	const height = 20;
	const {grid} = createDirectoryGrid(data, width, height);
	const root = createTreemapRoot(data, width, height);
	const borderCharacters = new Set(['┌', '┐', '└', '┘', '─', '│', '·', ' ']);

	t.is(grid.length, height);
	t.true(grid.every(row => row.length === width));
	for (const node of root.children) {
		const x0 = Math.round(node.x0);
		const y0 = Math.round(node.y0);
		const x1 = Math.round(node.x1);
		const y1 = Math.round(node.y1);
		for (let x = x0; x < x1; x += 1) {
			t.true(borderCharacters.has(grid[y0][x].character));
			t.true(borderCharacters.has(grid[y1 - 1][x].character));
		}
	}
});

test('renders gracefully at minimum and undersized terminal dimensions', t => {
	const selectedNode = hierarchy(data);
	const minimum = render(
		React.createElement(TreeMapView, {
			selectedNode,
			stdout: {columns: 3, rows: 4},
		}),
	);
	t.truthy(minimum.lastFrame());
	minimum.unmount();

	const undersized = render(
		React.createElement(TreeMapView, {
			selectedNode,
			stdout: {columns: 2, rows: 2},
		}),
	);
	t.regex(undersized.lastFrame(), /Terminal too small/);
	undersized.unmount();
});

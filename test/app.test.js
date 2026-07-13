import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import {TreeVisualization} from '../dist/app.js';

const nextFrame = () =>
	new Promise(resolve => {
		setImmediate(resolve);
	});

test('renders the tree and toggles the treemap from keyboard input', async t => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-cli-app-'));
	t.teardown(() => fs.rmSync(directory, {recursive: true, force: true}));
	fs.mkdirSync(path.join(directory, 'folder'));
	fs.writeFileSync(path.join(directory, 'folder', 'nested.txt'), 'contents');
	fs.writeFileSync(path.join(directory, 'file.txt'), 'file');

	const instance = render(
		React.createElement(TreeVisualization, {dirPath: directory, maxLevel: 1}),
	);
	t.regex(instance.lastFrame(), /folder/);
	t.regex(instance.lastFrame(), /file\.txt/);

	await nextFrame();
	instance.stdin.write('t');
	await nextFrame();
	t.regex(instance.lastFrame(), /Treemap:/);

	instance.stdin.write('t');
	await nextFrame();
	t.regex(instance.lastFrame(), /folder/);
	instance.unmount();
});

test("shows a collapsed directory's contents in treemap view", async t => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), 'tri-cli-collapsed-'),
	);
	t.teardown(() => fs.rmSync(directory, {recursive: true, force: true}));
	fs.mkdirSync(path.join(directory, 'folder'));
	fs.writeFileSync(path.join(directory, 'folder', 'nested.txt'), 'contents');

	const instance = render(
		React.createElement(TreeVisualization, {dirPath: directory, maxLevel: 0}),
	);
	t.regex(instance.lastFrame(), /▶/);

	await nextFrame();
	instance.stdin.write('m');
	await nextFrame();
	t.regex(instance.lastFrame(), /Treemap:/);
	t.notRegex(instance.lastFrame(), /Empty directory/);
	instance.unmount();
});

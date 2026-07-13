import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'ava';
import {readDirTree} from '../source/filesystem.js';

const createFixture = () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-cli-'));
	fs.mkdirSync(path.join(directory, 'folder10'));
	fs.mkdirSync(path.join(directory, 'folder2'));
	fs.writeFileSync(path.join(directory, 'folder2', 'nested.txt'), '1234567890');
	fs.writeFileSync(path.join(directory, 'visible.txt'), '12345');
	fs.writeFileSync(path.join(directory, '.hidden'), 'not included');
	fs.symlinkSync(directory, path.join(directory, 'loop'));
	return directory;
};

test('scans once into a sorted tree, excludes dotfiles, and does not follow symlinks', t => {
	const directory = createFixture();
	t.teardown(() => fs.rmSync(directory, {recursive: true, force: true}));

	const tree = readDirTree(directory);
	t.truthy(tree);
	t.deepEqual(
		tree.children.map(child => child.name),
		['folder2', 'folder10', 'loop', 'visible.txt'],
	);
	t.false(tree.children.some(child => child.name === '.hidden'));
	t.true(tree.children.find(child => child.name === 'loop').isFile);
	t.is(tree.children.find(child => child.name === 'folder2').size, 10);
	t.is(
		tree.size,
		tree.children.reduce((total, child) => total + child.size, 0),
	);
});

test('no-size scans preserve the tree while skipping all byte totals', t => {
	const directory = createFixture();
	t.teardown(() => fs.rmSync(directory, {recursive: true, force: true}));

	const tree = readDirTree(directory, true);
	t.true(tree.children.length > 0);
	t.true(tree.children.every(child => child.size === 0));
	t.is(tree.size, 0);
});

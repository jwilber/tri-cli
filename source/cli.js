#!/usr/bin/env node
import React, {useState, useEffect, useMemo} from 'react';
import {render, Text, Box, useInput, useStdout} from 'ink';
import {hierarchy} from 'd3-hierarchy';
import fs from 'fs';
import path from 'path';
import {TreeMapView} from './Treemap.js';

const oneHunter = {
	bg: '#282c34',
	bgAlt: '#21252b',
	text: 'rgb(206, 205, 195)',
	text2: 'rgb(135, 133, 128)',
	textAlt: 'white',
	red: 'rgb(209, 77, 65)',
	orange: 'rgb(218, 112, 44)',
	yellow: '#e5c07b',
	green: '#98c379',
	cyan: 'rgb(58, 169, 159)',
	blue: 'rgb(67, 133, 190)',
	purple: 'rgb(139, 126, 200)',
	magenta: 'rgb(206, 93, 151)',
};

// --- Helpers ---
const formatBytes = bytes => {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getDirSize = dirPath => {
	let size = 0;
	try {
		const items = fs.readdirSync(dirPath);
		for (const item of items) {
			const itemPath = path.join(dirPath, item);
			try {
				const stats = fs.statSync(itemPath);
				if (stats.isFile()) {
					size += stats.size;
				} else if (stats.isDirectory()) {
					size += getDirSize(itemPath);
				}
			} catch {}
		}
	} catch {}
	return size;
};

// ✅ Updated: allow skipping size computation
const readDirTree = (dirPath, noSize = false) => {
	try {
		const stats = fs.statSync(dirPath);
		const name = path.basename(dirPath) || dirPath;

		if (!stats.isDirectory()) {
			const size = noSize ? 0 : stats.size;
			return {
				name,
				path: dirPath,
				isFile: true,
				size,
				value: size > 0 ? size : 100,
			};
		}

		const children = fs
			.readdirSync(dirPath)
			.filter(file => !file.startsWith('.'))
			.map(file => readDirTree(path.join(dirPath, file), noSize))
			.filter(Boolean);

		return {
			name,
			path: dirPath,
			isFile: false,
			size: noSize ? 0 : getDirSize(dirPath),
			children: children.length > 0 ? children : undefined,
		};
	} catch {
		return null;
	}
};

const getFileColor = filename => {
	if (filename === 'VERSION') return oneHunter.purple;
	if (filename === 'Dockerfile') return oneHunter.blue;
	const ext = path.extname(filename).toLowerCase();
	const colorMap = {
		'.js': oneHunter.yellow,
		'.jsx': oneHunter.yellow,
		'.ts': oneHunter.blue,
		'.tsx': oneHunter.blue,
		'.py': oneHunter.green,
		'.rb': oneHunter.red,
		'.json': oneHunter.purple,
		'.html': oneHunter.cyan,
		'.css': oneHunter.cyan,
		'.md': oneHunter.orange,
		'.txt': oneHunter.textAlt,
		'.sh': oneHunter.green,
		'.yml': oneHunter.purple,
		'.yaml': oneHunter.purple,
		'.xml': oneHunter.orange,
		'.svg': oneHunter.cyan,
		'.png': oneHunter.blue,
		'.jpg': oneHunter.blue,
		'.gif': oneHunter.blue,
		'.pdf': oneHunter.red,
		'.toml': oneHunter.text2,
	};
	return colorMap[ext] || oneHunter.text;
};

const generateShortcut = (index, isFile, parentShortcut = '') => {
	const letters = 'abcdefghijklmnoprsuvwxyz'; // omitting q, t
	const base = letters.length;
	if (isFile) return `${parentShortcut}${index + 1}`;
	let label = '';
	let num = index;
	while (num >= 0) {
		label = letters[num % base] + label;
		num = Math.floor(num / base) - 1;
	}
	return parentShortcut + label;
};

// --- Components ---
const TreeRow = React.memo(
	({node, isSelected, collapsed, shortcutInput, noSize}) => {
		const isCollapsed = collapsed.has(node.data.path);
		const hasChildren = node.children && node.children.length > 0;

		let prefix = '';
		let current = node;
		const segments = [];
		while (current.parent) {
			const parent = current.parent;
			const siblings = parent.children || [];
			const isLastChild = siblings[siblings.length - 1] === current;
			segments.unshift(isLastChild ? '  ' : '│ ');
			current = parent;
		}

		if (node.parent) {
			const siblings = node.parent.children || [];
			const isLastChild = siblings[siblings.length - 1] === node;
			prefix = segments.join('').slice(0, -2) + (isLastChild ? '└─' : '├─');
		}

		let icon = hasChildren ? (isCollapsed ? '▶ ' : '▼ ') : '  ';
		const fileColor = node.data.isFile
			? getFileColor(node.data.name)
			: oneHunter.magenta;

		const renderShortcut = () => {
			if (!shortcutInput)
				return (
					<Text color={oneHunter.textAlt} dimColor>
						{' '}
						[{node.shortcut}]
					</Text>
				);
			if (node.shortcut.startsWith(shortcutInput)) {
				const matched = node.shortcut.slice(0, shortcutInput.length);
				const rest = node.shortcut.slice(shortcutInput.length);
				return (
					<Text color={oneHunter.textAlt}>
						{' ['}
						<Text underline color={oneHunter.yellow}>
							{matched}
						</Text>
						{rest}
						{']'}
					</Text>
				);
			}
			return (
				<Text color={oneHunter.textAlt} dimColor>
					{' '}
					[{node.shortcut}]
				</Text>
			);
		};

		return (
			<Box>
				<Text>
					<Text color={oneHunter.textAlt}>{prefix}</Text>
					<Text color={hasChildren ? oneHunter.cyan : oneHunter.textAlt}>
						{icon}
					</Text>
					<Text
						bold={isSelected}
						color={isSelected ? oneHunter.bg : fileColor}
						backgroundColor={isSelected ? oneHunter.green : undefined}
					>
						{node.data.name}
					</Text>
					{hasChildren && !isCollapsed && (
						<Text color={oneHunter.textAlt}> ({node.children.length})</Text>
					)}
					{!noSize && node.data.size > 0 && (
						<Text color={oneHunter.cyan}> {formatBytes(node.data.size)}</Text>
					)}
					{renderShortcut()}
				</Text>
			</Box>
		);
	},
	(p, n) =>
		p.isSelected === n.isSelected &&
		p.collapsed === n.collapsed &&
		p.shortcutInput === n.shortcutInput &&
		p.noSize === n.noSize,
);

const TreeVisualization = ({dirPath = '.', maxLevel = 1, noSize = false}) => {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [collapsed, setCollapsed] = useState(new Set());
	const [shortcutInput, setShortcutInput] = useState('');
	const [showTreeMap, setShowTreeMap] = useState(false);
	const [initialized, setInitialized] = useState(false);

	const {stdout} = useStdout();
	const terminalHeight = stdout?.rows || 24;
	const viewportHeight = Math.max(5, terminalHeight - 7);

	const treeData = useMemo(
		() => readDirTree(dirPath, noSize),
		[dirPath, noSize],
	);
	if (!treeData)
		return <Text color="red">Error: Could not read directory</Text>;
	const root = useMemo(() => hierarchy(treeData), [treeData]);

	useEffect(() => {
		const newCollapsed = new Set();
		const applyLevel = (node, level = 0) => {
			if (node.children) {
				if (level >= maxLevel) newCollapsed.add(node.data.path);
				node.children.forEach(child => applyLevel(child, level + 1));
			}
		};
		applyLevel(root);
		setCollapsed(newCollapsed);
		setInitialized(true);
	}, [maxLevel, root]);

	const rootWithShortcuts = useMemo(() => {
		const assignShortcuts = (node, parentShortcut = '', siblingIndex = 0) => {
			const isFile = node.data.isFile;
			node.shortcut = generateShortcut(siblingIndex, isFile, parentShortcut);
			if (node.children) {
				node.children.forEach((child, i) =>
					assignShortcuts(child, node.shortcut, i),
				);
			}
		};
		const cloned = root.copy();
		assignShortcuts(cloned);
		return cloned;
	}, [root]);

	const visibleNodes = useMemo(() => {
		const nodes = [];
		const traverse = node => {
			nodes.push(node);
			if (node.children && !collapsed.has(node.data.path)) {
				node.children.forEach(traverse);
			}
		};
		traverse(rootWithShortcuts);
		return nodes;
	}, [rootWithShortcuts, collapsed]);

	const shortcutMap = useMemo(() => {
		const map = new Map();
		visibleNodes.forEach((node, index) => map.set(node.shortcut, index));
		return map;
	}, [visibleNodes]);

	useInput((input, key) => {
		if (input === 'q') process.exit(0);
		if (input === 't') {
			if (!noSize) setShowTreeMap(p => !p);
			return;
		}
		if (showTreeMap) return;

		if (key.upArrow) {
			setSelectedIndex(p => Math.max(0, p - 1));
			setShortcutInput('');
			return;
		} else if (key.downArrow) {
			setSelectedIndex(p => Math.min(visibleNodes.length - 1, p + 1));
			setShortcutInput('');
			return;
		}

		if (key.return) {
			if (shortcutInput && shortcutMap.has(shortcutInput)) {
				const shortcutIndex = shortcutMap.get(shortcutInput);
				const shortcutNode = visibleNodes[shortcutIndex];
				setSelectedIndex(shortcutIndex);
				if (shortcutNode.children) {
					setCollapsed(prev => {
						const next = new Set(prev);
						if (next.has(shortcutNode.data.path))
							next.delete(shortcutNode.data.path);
						else next.add(shortcutNode.data.path);
						return next;
					});
				}
				setShortcutInput('');
				return;
			}
			const node = visibleNodes[selectedIndex];
			if (node.children) {
				setCollapsed(prev => {
					const next = new Set(prev);
					if (next.has(node.data.path)) next.delete(node.data.path);
					else next.add(node.data.path);
					return next;
				});
			}
			setShortcutInput('');
			return;
		}

		if (key.escape) {
			setShortcutInput('');
			return;
		}

		if (input && /^[a-z0-9]$/.test(input)) {
			const newInput = shortcutInput + input;
			setShortcutInput(newInput);
			if (shortcutMap.has(newInput)) {
				setSelectedIndex(shortcutMap.get(newInput));
			}
		}
	});

	if (showTreeMap) {
		const node = visibleNodes[selectedIndex];
		if (!node)
			return <Text color={oneHunter.red}>Error: No node selected</Text>;
		return <TreeMapView selectedNode={node} stdout={stdout} />;
	}

	const getViewportWindow = () => {
		let start = Math.max(0, selectedIndex - Math.floor(viewportHeight / 2));
		let end = start + viewportHeight;
		if (end > visibleNodes.length) {
			end = visibleNodes.length;
			start = Math.max(0, end - viewportHeight);
		}
		return {start, end};
	};

	const {start, end} = getViewportWindow();
	const viewportNodes = visibleNodes.slice(start, end);

	if (!initialized) return null;

	return (
		<Box flexDirection="column">
			{!noSize ? (
				<Text color={oneHunter.textAlt} dimColor>
					↑/↓: Navigate | Enter: Toggle | t: TreeMap | Esc: Clear | q: Quit
				</Text>
			) : (
				<Text color={oneHunter.textAlt} dimColor>
					↑/↓: Navigate | Enter: Toggle | Esc: Clear | q: Quit
				</Text>
			)}
			{start > 0 && (
				<Text color={oneHunter.yellow}>⋮ ({start} more above)</Text>
			)}
			{viewportNodes.map((node, i) => (
				<TreeRow
					key={start + i}
					node={node}
					isSelected={start + i === selectedIndex}
					collapsed={collapsed}
					shortcutInput={shortcutInput}
					noSize={noSize}
				/>
			))}
			{end < visibleNodes.length && (
				<Text color={oneHunter.yellow}>
					⋮ ({visibleNodes.length - end} more below)
				</Text>
			)}
		</Box>
	);
};

// --- CLI args ---
const args = process.argv.slice(2);

// Help
if (args.includes('--help') || args.includes('-h')) {
	console.log(`
Usage:
  tri [directory] [options]

Examples:
  tri .                # visualize current directory
  tri ../bionemo -L 2  # show 2 levels deep
  tri --dir src        # specify directory with flag

Options:
  --dir <path>     Directory to visualize (optional if positional)
  -L <level>       Depth level to expand initially (default: 1)
  --no-size, -ns   Skip file size calculation (faster, disables treemap)
  -h, --help       Show this help message
`);
	process.exit(0);
}

const dirIndex = args.indexOf('--dir');
const firstNonFlagArg = args.find(arg => !arg.startsWith('-'));
const dirPath =
	dirIndex !== -1 && args[dirIndex + 1]
		? args[dirIndex + 1]
		: firstNonFlagArg || '.';

const levelIndex = args.indexOf('-L');
const maxLevel =
	levelIndex !== -1 && args[levelIndex + 1]
		? parseInt(args[levelIndex + 1], 10)
		: 1;

const noSize = args.includes('--no-size') || args.includes('-ns');

render(
	<TreeVisualization dirPath={dirPath} maxLevel={maxLevel} noSize={noSize} />,
);

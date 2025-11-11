#!/usr/bin/env node
import React, { useState, useEffect, useMemo } from 'react';
import { render, Text, Box, useInput, useStdout } from 'ink';
import { hierarchy } from 'd3-hierarchy';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { TreeMapView } from './Treemap.js';

const execAsync = util.promisify(exec);

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

const formatBytes = bytes => {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Async non-blocking directory size
const getDirSizeAsync = async dirPath => {
	try {
		const escapedPath = dirPath.replace(/"/g, '\\"');
		const { stdout } = await execAsync(`du -sk "${escapedPath}" 2>/dev/null`);
		const match = stdout.trim().split(/\s+/);
		if (match.length >= 1) {
			const sizeInKB = parseInt(match[0], 10);
			return isNaN(sizeInKB) ? 0 : sizeInKB * 1024;
		}
		return 0;
	} catch {
		return 0;
	}
};

const readDirTree = (dirPath, noSize = true, currentLevel = 0, maxLevel = Infinity) => {
	try {
		const stats = fs.statSync(dirPath);
		const name = path.basename(dirPath) || dirPath;
		if (!stats.isDirectory()) {
			const size = noSize ? 0 : stats.size;
			return { name, path: dirPath, isFile: true, size };
		}
		if (currentLevel >= maxLevel) {
			return { name, path: dirPath, isFile: false, size: 0, children: undefined };
		}
		const children = fs
			.readdirSync(dirPath)
			.filter(f => !f.startsWith('.'))
			.map(f => readDirTree(path.join(dirPath, f), noSize, currentLevel + 1, maxLevel))
			.filter(Boolean);
		return { name, path: dirPath, isFile: false, size: 0, children };
	} catch {
		return null;
	}
};

const getFileColor = filename => {
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

// Exclude m, t, d
const generateShortcut = (index, isFile, parentShortcut = '') => {
	const letters = 'abcefgijklnopqrsuvwxyz';
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

const SPINNER_FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];

const TreeRow = React.memo(
	({ node, isSelected, collapsed, shortcutInput, noSize, calculatedSizes, loadingPaths, spinnerFrame }) => {
		const isCollapsed = collapsed.has(node.data.path);
		const hasChildren = node.children && node.children.length > 0;
		const isLoading = loadingPaths.has(node.data.path);
		const fileColor = node.data.isFile ? getFileColor(node.data.name) : oneHunter.magenta;

		let displaySize = 0;
		// Use calculated size if available, otherwise fall back to node.data.size
		if (calculatedSizes && calculatedSizes.has(node.data.path)) {
			displaySize = calculatedSizes.get(node.data.path);
		} else {
			displaySize = node.data.size;
		}

		// ✅ Restore highlight logic
		const renderShortcut = () => {
			if (!shortcutInput)
				return (
					<Text color={oneHunter.textAlt} dimColor>
						{'  '}[{node.shortcut}]
					</Text>
				);
			if (node.shortcut.startsWith(shortcutInput)) {
				const matched = node.shortcut.slice(0, shortcutInput.length);
				const rest = node.shortcut.slice(shortcutInput.length);
				return (
					<Text color={oneHunter.textAlt}>
						{'  '}[
						<Text underline color={oneHunter.yellow}>
							{matched}
						</Text>
						{rest}]
					</Text>
				);
			}
			return (
				<Text color={oneHunter.textAlt} dimColor>
					{'  '}[{node.shortcut}]
				</Text>
			);
		};

		return (
			<Box>
				<Text>
					<Text color={oneHunter.textAlt}>{node.depth > 0 ? ' '.repeat(node.depth * 2) : ''}</Text>
					<Text color={hasChildren ? oneHunter.cyan : oneHunter.textAlt}>
						{hasChildren ? (isCollapsed ? '▶ ' : '▼ ') : '  '}
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
					{isLoading ? (
						<Text color={oneHunter.yellow}> {SPINNER_FRAMES[spinnerFrame]}</Text>
					) : displaySize > 0 ? (
						<Text color={oneHunter.cyan}> {formatBytes(displaySize)}</Text>
					) : (
						<Text> </Text>
					)}
					{renderShortcut()}
				</Text>
			</Box>
		);
	}
);

const TreeVisualization = ({ dirPath = '.', maxLevel = 1, noSize = true, collapseAll = false }) => {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [collapsed, setCollapsed] = useState(new Set());
	const [shortcutInput, setShortcutInput] = useState('');
	const [showTreeMap, setShowTreeMap] = useState(false);
	const [initialized, setInitialized] = useState(false);
	const [calculatedSizes, setCalculatedSizes] = useState(new Map());
	const [loadingPaths, setLoadingPaths] = useState(new Set());
	const [spinnerFrame, setSpinnerFrame] = useState(0);
	const [rootTree, setRootTree] = useState(() => hierarchy(readDirTree(dirPath, noSize, 0, maxLevel)));

	const { stdout } = useStdout();
	const terminalHeight = stdout?.rows || 24;
	const viewportHeight = Math.max(5, terminalHeight - 7);

	// Spinner animation loop
	useEffect(() => {
		const interval = setInterval(() => setSpinnerFrame(f => (f + 1) % SPINNER_FRAMES.length), 80);
		return () => clearInterval(interval);
	}, []);

	// Preload all sizes when -s flag is used (noSize is false)
	useEffect(() => {
		if (noSize) return; // Only preload when sizes are requested
		
		const preloadAllSizes = async () => {
			const newMap = new Map();
			const nodesToCalculate = [];
			
			// Collect all nodes
			const traverse = node => {
				nodesToCalculate.push(node);
				if (node.children) {
					node.children.forEach(traverse);
				}
			};
			traverse(rootTree);
			
			// Set all nodes as loading
			setLoadingPaths(new Set(nodesToCalculate.map(n => n.data.path)));
			
			// Calculate sizes for all nodes
			for (const node of nodesToCalculate) {
				const sz = node.data.isFile
					? fs.statSync(node.data.path).size
					: await getDirSizeAsync(node.data.path);
				newMap.set(node.data.path, sz);
				
				// Update incrementally for better UX
				setCalculatedSizes(new Map(newMap));
			}
			
			// Clear loading state
			setLoadingPaths(new Set());
		};
		
		preloadAllSizes();
	}, [noSize, rootTree]);

	useEffect(() => {
		const newCollapsed = new Set();
		const applyLevel = (node, level = 0) => {
			if (node.children) {
				if ((collapseAll && level >= 1) || level >= maxLevel) newCollapsed.add(node.data.path);
				node.children.forEach(c => applyLevel(c, level + 1));
			}
		};
		applyLevel(rootTree);
		setCollapsed(newCollapsed);
		setInitialized(true);
	}, [rootTree, maxLevel, collapseAll]);

	const assignShortcuts = (node, parentShortcut = '', siblingIndex = 0) => {
		node.shortcut = generateShortcut(siblingIndex, node.data.isFile, parentShortcut);
		if (node.children)
			node.children.forEach((child, i) => assignShortcuts(child, node.shortcut, i));
	};
	assignShortcuts(rootTree);

	const visibleNodes = useMemo(() => {
		const nodes = [];
		const traverse = node => {
			nodes.push(node);
			if (node.children && !collapsed.has(node.data.path))
				node.children.forEach(traverse);
		};
		traverse(rootTree);
		return nodes;
	}, [rootTree, collapsed]);

	const shortcutMap = useMemo(() => {
		const map = new Map();
		visibleNodes.forEach((node, index) => map.set(node.shortcut, index));
		return map;
	}, [visibleNodes]);

	const calculateSizeAsync = async node => {
		if (calculatedSizes.has(node.data.path)) return;
		setLoadingPaths(prev => new Set(prev).add(node.data.path));

		const newMap = new Map(calculatedSizes);
		const calcAndSetSize = async targetNode => {
			const sz = targetNode.data.isFile
				? fs.statSync(targetNode.data.path).size
				: await getDirSizeAsync(targetNode.data.path);
			newMap.set(targetNode.data.path, sz);
			await new Promise(r => setTimeout(r, 0));
		};

		await calcAndSetSize(node);
		if (node.children)
			for (const child of node.children)
				await calcAndSetSize(child);

		setCalculatedSizes(newMap);
		setLoadingPaths(prev => {
			const next = new Set(prev);
			next.delete(node.data.path);
			return next;
		});
	};

	const traverseDir = async node => {
		if (node.data.isFile) return;
		if (node.data.children !== undefined) return; // already loaded
		const newTree = readDirTree(node.data.path, true, 0, 1);
		node.data.children = newTree.children;
		setRootTree(rootTree.copy());
	};

	useInput(async (input, key) => {
		if (showTreeMap) {
			setShowTreeMap(false);
			return;
		}
		if (input === 'q') process.exit(0);

		if (input === 't') {
			const node = visibleNodes[selectedIndex];
			if (node) await traverseDir(node);
			return;
		}

		if (input === 'm') {
			const node = visibleNodes[selectedIndex];
			if (!node) return;
			if (!calculatedSizes.has(node.data.path)) await calculateSizeAsync(node);
			setShowTreeMap(true);
			return;
		}

		if (input === 'd') {
			const node = visibleNodes[selectedIndex];
			if (node) await calculateSizeAsync(node);
			return;
		}

		if (key.upArrow) {
			setSelectedIndex(p => Math.max(0, p - 1));
			setShortcutInput('');
			return;
		}
		if (key.downArrow) {
			setSelectedIndex(p => Math.min(visibleNodes.length - 1, p + 1));
			setShortcutInput('');
			return;
		}
		if (key.return) {
			const node = visibleNodes[selectedIndex];
			if (node && node.children)
				setCollapsed(prev => {
					const next = new Set(prev);
					if (next.has(node.data.path)) next.delete(node.data.path);
					else next.add(node.data.path);
					return next;
				});
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
			if (shortcutMap.has(newInput))
				setSelectedIndex(shortcutMap.get(newInput));
		}
	});

	if (showTreeMap) {
		const node = visibleNodes[selectedIndex];
		return <TreeMapView selectedNode={node} stdout={stdout} />;
	}

	const start = Math.max(0, selectedIndex - Math.floor(viewportHeight / 2));
	const end = Math.min(visibleNodes.length, start + viewportHeight);
	const viewportNodes = visibleNodes.slice(start, end);

	if (!initialized) return null;

	return (
		<Box flexDirection="column">
			<Text color={oneHunter.textAlt} dimColor>
				↑/↓: Navigate | Enter: Toggle | d: Size | t: Traverse | m: Map | Esc/q: Quit
			</Text>
			{viewportNodes.map((node, i) => (
				<TreeRow
					key={start + i}
					node={node}
					isSelected={start + i === selectedIndex}
					collapsed={collapsed}
					shortcutInput={shortcutInput}
					noSize={noSize}
					calculatedSizes={calculatedSizes}
					loadingPaths={loadingPaths}
					spinnerFrame={spinnerFrame}
				/>
			))}
		</Box>
	);
};

// --- CLI ---
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
	console.log(`
Usage:
  tri [directory] [options]

Options:
  -L <level>       Depth (default 1)
  -s, --size       Preload all sizes (default off)
  -c, --collapse   Start collapsed
  -h, --help       Show help
`);
	process.exit(0);
}

const dirIndex = args.indexOf('--dir');
const firstNonFlagArg = args.find(arg => !arg.startsWith('-'));
const dirPath = dirIndex !== -1 && args[dirIndex + 1] ? args[dirIndex + 1] : firstNonFlagArg || '.';
const levelIndex = args.indexOf('-L');
const maxLevel = levelIndex !== -1 && args[levelIndex + 1] ? parseInt(args[levelIndex + 1], 10) : 1;
if (isNaN(maxLevel) || maxLevel < 1) {
	console.error('tri: Invalid level, must be greater than 0.');
	process.exit(1);
}
const collapseAll = args.includes('--collapse') || args.includes('-c');
const preloadSizes = args.includes('--size') || args.includes('-s');

render(
	<TreeVisualization
		dirPath={dirPath}
		maxLevel={maxLevel}
		noSize={!preloadSizes}
		collapseAll={collapseAll}
	/>
);
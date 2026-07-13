import React, {useEffect, useMemo, useState} from 'react';
import {Box, Text, useApp, useInput, useStdout} from 'ink';
import {hierarchy} from 'd3-hierarchy';
import {TreeMapView} from './Treemap.js';
import {readDirTree} from './filesystem.js';
import {getFileColor, theme} from './theme.js';
import {assignShortcuts, formatBytes, getViewportWindow} from './utils.js';

const createCollapsedPaths = (root, maxLevel) => {
	const paths = new Set();
	const visibleLevel = Math.max(0, maxLevel);

	const visit = (node, level = 0) => {
		if (!node?.children) return;
		if (level >= visibleLevel) paths.add(node.data.path);
		for (const child of node.children) visit(child, level + 1);
	};

	visit(root);
	return paths;
};

const getTreePrefix = node => {
	if (!node.parent) return '';

	const segments = [];
	let current = node;
	while (current.parent) {
		const siblings = current.parent.children || [];
		const isLastChild = siblings[siblings.length - 1] === current;
		segments.unshift(isLastChild ? '  ' : '│ ');
		current = current.parent;
	}

	const siblings = node.parent.children || [];
	const branch = siblings[siblings.length - 1] === node ? '└─' : '├─';
	return segments.slice(0, -1).join('') + branch;
};

function Shortcut({shortcut, input}) {
	if (!input || !shortcut.startsWith(input)) {
		return (
			<Text dimColor color={theme.bright}>
				[{shortcut}]
			</Text>
		);
	}

	return (
		<Text color={theme.bright}>
			{' ['}
			<Text underline color={theme.yellow}>
				{shortcut.slice(0, input.length)}
			</Text>
			{shortcut.slice(input.length)}]
		</Text>
	);
}

function TreeRowComponent({
	node,
	isSelected,
	isCollapsed,
	shortcutInput,
	noSize,
	width,
}) {
	const hasChildren = Boolean(node.children?.length);
	const icon = hasChildren ? (isCollapsed ? '▶ ' : '▼ ') : '  ';
	const color = node.data.isFile ? getFileColor(node.data.name) : theme.magenta;

	return (
		<Box width={width}>
			<Text wrap="truncate-end">
				<Text color={theme.bright}>{getTreePrefix(node)}</Text>
				<Text color={hasChildren ? theme.cyan : theme.bright}>{icon}</Text>
				<Text
					bold={isSelected}
					color={isSelected ? theme.background : color}
					backgroundColor={isSelected ? theme.green : undefined}
				>
					{node.data.name}
				</Text>
				{hasChildren && !isCollapsed && (
					<Text color={theme.bright}> ({node.children.length})</Text>
				)}
				{!noSize && (
					<Text color={theme.cyan}> {formatBytes(node.data.size)}</Text>
				)}
				<Shortcut input={shortcutInput} shortcut={node.shortcut} />
			</Text>
		</Box>
	);
}

const TreeRow = React.memo(
	TreeRowComponent,
	(previous, next) =>
		previous.node === next.node &&
		previous.isSelected === next.isSelected &&
		previous.isCollapsed === next.isCollapsed &&
		previous.shortcutInput === next.shortcutInput &&
		previous.noSize === next.noSize &&
		previous.width === next.width,
);

const getInputCommand = (input, key) => {
	if (input === 'q') return 'quit';
	if (input === 't' || input === 'm') return 'treemap';
	if (key.upArrow) return 'up';
	if (key.downArrow) return 'down';
	if (key.leftArrow) return 'left';
	if (key.rightArrow) return 'right';
	if (key.return) return 'toggle';
	if (key.escape) return 'clear';
	if (/^[a-z\d.]$/.test(input)) return 'shortcut';
	return undefined;
};

export function TreeVisualization({
	dirPath = '.',
	maxLevel = 1,
	noSize = false,
}) {
	const {exit} = useApp();
	const {stdout} = useStdout();
	const terminalHeight = Math.max(1, stdout?.rows || 24);
	const terminalWidth = Math.max(1, stdout?.columns || 80);

	const treeData = useMemo(
		() => readDirTree(dirPath, noSize),
		[dirPath, noSize],
	);
	const root = useMemo(
		() => (treeData ? hierarchy(treeData) : null),
		[treeData],
	);
	const rootWithShortcuts = useMemo(() => {
		if (!root) return null;
		return assignShortcuts(root.copy());
	}, [root]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [collapsed, setCollapsed] = useState(() =>
		createCollapsedPaths(rootWithShortcuts, maxLevel),
	);
	const [shortcutInput, setShortcutInput] = useState('');
	const [showTreeMap, setShowTreeMap] = useState(false);

	const visibleNodes = useMemo(() => {
		const nodes = [];
		const visit = node => {
			if (!node) return;
			nodes.push(node);
			if (!collapsed.has(node.data.path)) {
				for (const child of node.children || []) visit(child);
			}
		};

		visit(rootWithShortcuts);
		return nodes;
	}, [rootWithShortcuts, collapsed]);

	const shortcutMap = useMemo(
		() => new Map(visibleNodes.map((node, index) => [node.shortcut, index])),
		[visibleNodes],
	);
	const shortcutPrefixes = useMemo(() => {
		const prefixes = new Set();
		for (const shortcut of shortcutMap.keys()) {
			for (let index = 1; index <= shortcut.length; index += 1) {
				prefixes.add(shortcut.slice(0, index));
			}
		}

		return prefixes;
	}, [shortcutMap]);
	const pathMap = useMemo(
		() => new Map(visibleNodes.map((node, index) => [node.data.path, index])),
		[visibleNodes],
	);

	useEffect(() => {
		setSelectedIndex(index =>
			Math.min(index, Math.max(0, visibleNodes.length - 1)),
		);
	}, [visibleNodes.length]);

	const toggleNode = node => {
		if (!node?.children) return;
		setCollapsed(previous => {
			const next = new Set(previous);
			if (next.has(node.data.path)) next.delete(node.data.path);
			else next.add(node.data.path);
			return next;
		});
	};

	const clearShortcut = () => setShortcutInput('');
	const moveSelection = direction => {
		setSelectedIndex(previous =>
			Math.max(0, Math.min(visibleNodes.length - 1, previous + direction)),
		);
		clearShortcut();
	};

	const collapseOrSelectParent = () => {
		const selectedNode = visibleNodes[selectedIndex];
		if (selectedNode?.children && !collapsed.has(selectedNode.data.path)) {
			toggleNode(selectedNode);
		} else if (selectedNode?.parent) {
			const parentIndex = pathMap.get(selectedNode.parent.data.path);
			if (parentIndex !== undefined) setSelectedIndex(parentIndex);
		}

		clearShortcut();
	};

	const expandNode = () => {
		const selectedNode = visibleNodes[selectedIndex];
		if (selectedNode?.children && collapsed.has(selectedNode.data.path)) {
			toggleNode(selectedNode);
		}

		clearShortcut();
	};

	const toggleSelectedNode = () => {
		const shortcutIndex = shortcutMap.get(shortcutInput);
		if (shortcutIndex === undefined) {
			toggleNode(visibleNodes[selectedIndex]);
		} else {
			setSelectedIndex(shortcutIndex);
			toggleNode(visibleNodes[shortcutIndex]);
		}

		clearShortcut();
	};

	const updateShortcut = input => {
		const candidate = shortcutInput + input;
		let nextInput = '';
		if (shortcutPrefixes.has(candidate)) nextInput = candidate;
		else if (shortcutPrefixes.has(input)) nextInput = input;
		setShortcutInput(nextInput);
		const nextIndex = shortcutMap.get(nextInput);
		if (nextIndex !== undefined) setSelectedIndex(nextIndex);
	};

	const onlyInTree = handler => input => {
		if (!showTreeMap) handler(input);
	};

	const commands = {
		quit: exit,
		treemap() {
			if (!noSize) setShowTreeMap(previous => !previous);
		},
		up: onlyInTree(() => moveSelection(-1)),
		down: onlyInTree(() => moveSelection(1)),
		left: onlyInTree(collapseOrSelectParent),
		right: onlyInTree(expandNode),
		toggle: onlyInTree(toggleSelectedNode),
		clear: onlyInTree(clearShortcut),
		shortcut: onlyInTree(updateShortcut),
	};

	useInput((input, key) => {
		commands[getInputCommand(input, key)]?.(input);
	});

	if (!treeData) {
		return (
			<Text color={theme.red}>Error: Could not read &quot;{dirPath}&quot;</Text>
		);
	}

	if (showTreeMap) {
		return (
			<TreeMapView stdout={stdout} selectedNode={visibleNodes[selectedIndex]} />
		);
	}

	const showControls = terminalHeight > 1;
	const viewport = getViewportWindow(
		visibleNodes.length,
		selectedIndex,
		terminalHeight - Number(showControls),
	);
	const viewportNodes = visibleNodes.slice(viewport.start, viewport.end);
	const controls = noSize
		? '↑/↓ Navigate · ← Collapse/parent · →/Enter Expand · Esc Clear · q Quit'
		: '↑/↓ Navigate · ← Collapse/parent · →/Enter Expand · t/m Treemap · Esc Clear · q Quit';

	return (
		<Box flexDirection="column" width={terminalWidth}>
			{showControls && (
				<Text dimColor color={theme.muted} wrap="truncate-end">
					{controls}
				</Text>
			)}
			{viewport.showAbove && (
				<Text color={theme.yellow}>⋮ ({viewport.start} more above)</Text>
			)}
			{viewportNodes.map((node, index) => (
				<TreeRow
					key={node.data.path}
					node={node}
					isSelected={viewport.start + index === selectedIndex}
					isCollapsed={collapsed.has(node.data.path)}
					shortcutInput={shortcutInput}
					noSize={noSize}
					width={terminalWidth}
				/>
			))}
			{viewport.showBelow && (
				<Text color={theme.yellow}>
					⋮ ({visibleNodes.length - viewport.end} more below)
				</Text>
			)}
		</Box>
	);
}

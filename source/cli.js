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

const formatDate = timestamp => {
	const date = new Date(timestamp);
	const now = new Date();
	const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
	
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const month = months[date.getMonth()];
	const day = date.getDate().toString().padStart(2, ' ');
	
	// If file is from this year, show time; otherwise show year
	if (diffDays < 180) {
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${month} ${day} ${hours}:${minutes}`;
	} else {
		const year = date.getFullYear();
		return `${month} ${day}  ${year}`;
	}
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
		let name = path.basename(dirPath);
		// If basename is empty (root) or '.', use the absolute path's last component or full path
		if (!name || name === '.') {
			const resolved = path.resolve(dirPath);
			name = path.basename(resolved) || resolved;
		}
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
	const letters = 'abcefgijknopqrsuvwxyz';
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

// Generate tree lines (like the `tree` command)
const getTreeLines = (node) => {
	if (node.depth === 0) return ''; // Root has no lines
	
	const lines = [];
	let current = node;
	
	// Build the lines from current node up to (but not including) root
	while (current.parent && current.parent.depth > 0) {
		const parent = current.parent;
		const isLastChild = parent.children && current === parent.children[parent.children.length - 1];
		lines.unshift(isLastChild ? '   ' : '│  ');
		current = parent;
	}
	
	// Add the final connector for this node
	const parent = node.parent;
	if (parent && parent.depth === 0) {
		// Direct child of root
		const isLastChild = parent.children && node === parent.children[parent.children.length - 1];
		return isLastChild ? '╰─' : '├─';
	} else if (parent) {
		const isLastChild = parent.children && node === parent.children[parent.children.length - 1];
		return lines.join('') + (isLastChild ? '╰─' : '├─');
	}
	
	return '';
};

const SPINNER_FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];

const TreeRow = React.memo(
	({ node, isSelected, collapsed, shortcutInput, noSize, calculatedSizes, loadingPaths, spinnerFrame, lastModifiedDates }) => {
		const isCollapsed = collapsed.has(node.data.path);
		const hasChildren = node.children && node.children.length > 0;
		const isLoading = loadingPaths.has(node.data.path);
		const fileColor = node.data.isFile ? getFileColor(node.data.name) : oneHunter.magenta;
		const isRoot = node.depth === 0;
		const isDirectory = !node.data.isFile;

		let displaySize = 0;
		// Use calculated size if available, otherwise fall back to node.data.size
		if (calculatedSizes && calculatedSizes.has(node.data.path)) {
			displaySize = calculatedSizes.get(node.data.path);
		} else {
			displaySize = node.data.size;
		}

		const lastModified = lastModifiedDates.get(node.data.path);
		const treeLines = getTreeLines(node);

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
					{/* Tree lines */}
					{!isRoot && <Text color={oneHunter.textAlt}>{treeLines}</Text>}
					
					{/* Arrow for directories (same color as tree lines) */}
					{!isRoot && isDirectory && (
						<Text color={oneHunter.textAlt}>
							{/* Show ▼ only if expanded (has children and not collapsed), otherwise ▶ */}
							{hasChildren && !isCollapsed ? '▼ ' : '▶ '}
						</Text>
					)}
					{!isRoot && !isDirectory && <Text color={oneHunter.textAlt}>─ </Text>}
					
					{/* File/directory name */}
					<Text
						bold={isSelected}
						color={isSelected ? oneHunter.bg : fileColor}
						backgroundColor={isSelected ? oneHunter.green : undefined}
					>
						{node.data.name}{!node.data.isFile && !isRoot ? '/' : ''}
					</Text>
					
					{/* Children count for directories */}
					{hasChildren && !isCollapsed && (
						<Text color={oneHunter.textAlt}> ({node.children.length})</Text>
					)}
					
					{/* Size or loading indicator */}
					{isLoading ? (
						<Text color={oneHunter.yellow}> {SPINNER_FRAMES[spinnerFrame]}</Text>
					) : displaySize > 0 ? (
						<Text color={oneHunter.cyan}> {formatBytes(displaySize)}</Text>
					) : (
						<Text> </Text>
					)}
					
					{/* Shortcut */}
					{renderShortcut()}
					
					{/* Last modified date (always show if available) */}
					{lastModified && (
						<Text color={oneHunter.text2}> {formatDate(lastModified)}</Text>
					)}
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
	const [lastModifiedDates, setLastModifiedDates] = useState(new Map());

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
			
			// Calculate sizes for all nodes with streaming updates
			for (const node of nodesToCalculate) {
				const sz = node.data.isFile
					? fs.statSync(node.data.path).size
					: await getDirSizeAsync(node.data.path);
				newMap.set(node.data.path, sz);
				
				// Stream update immediately (using startTransition to deprioritize render)
				React.startTransition(() => {
					setCalculatedSizes(new Map(newMap));
					setLoadingPaths(prev => {
						const next = new Set(prev);
						next.delete(node.data.path);
						return next;
					});
				});
				
				await new Promise(r => setTimeout(r, 0));
			}
		};
		
		preloadAllSizes();
	}, [noSize, rootTree]);

	useEffect(() => {
		// Only initialize collapse state on first mount, not on every rootTree change
		if (initialized) return;
		
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
	}, []);

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
		// Collect node and all its descendants (not just visible ones)
		const nodesToCalculate = [];
		const collectNodes = (n) => {
			// Skip if already calculated
			if (calculatedSizes.has(n.data.path)) {
				// Still recurse to children in case they need calculation
				if (n.children) {
					n.children.forEach(collectNodes);
				}
				return;
			}
			nodesToCalculate.push(n);
			if (n.children) {
				n.children.forEach(collectNodes);
			}
		};
		collectNodes(node);
		
		if (nodesToCalculate.length === 0) return; // Nothing to calculate
		
		// Mark all nodes as loading
		const pathsToLoad = nodesToCalculate.map(n => n.data.path);
		setLoadingPaths(prev => new Set([...prev, ...pathsToLoad]));

		const newMap = new Map(calculatedSizes);
		
		// Calculate and stream updates for each node individually
		for (const targetNode of nodesToCalculate) {
			const sz = targetNode.data.isFile
				? fs.statSync(targetNode.data.path).size
				: await getDirSizeAsync(targetNode.data.path);
			newMap.set(targetNode.data.path, sz);
			
			// Stream the update immediately (using startTransition to deprioritize render)
			React.startTransition(() => {
				setCalculatedSizes(new Map(newMap));
				setLoadingPaths(prev => {
					const next = new Set(prev);
					next.delete(targetNode.data.path);
					return next;
				});
			});
			
			await new Promise(r => setTimeout(r, 0));
		}
	};

	const getLastModifiedAsync = async node => {
		// Collect node and all its descendants
		const nodesToProcess = [];
		const collectNodes = (n) => {
			// Skip if already have date
			if (lastModifiedDates.has(n.data.path)) {
				// Still recurse to children in case they need dates
				if (n.children) {
					n.children.forEach(collectNodes);
				}
				return;
			}
			nodesToProcess.push(n);
			if (n.children) {
				n.children.forEach(collectNodes);
			}
		};
		collectNodes(node);
		
		if (nodesToProcess.length === 0) return; // Nothing to process
		
		const newMap = new Map(lastModifiedDates);
		
		// Get mtime for each node
		for (const targetNode of nodesToProcess) {
			try {
				const stats = fs.statSync(targetNode.data.path);
				newMap.set(targetNode.data.path, stats.mtimeMs);
			} catch {
				// If we can't stat the file, skip it
			}
			
			// Stream the update immediately
			React.startTransition(() => {
				setLastModifiedDates(new Map(newMap));
			});
			
			await new Promise(r => setTimeout(r, 0));
		}
	};

	const traverseDir = async node => {
		if (node.data.isFile) return;
		
		// If children are undefined (not loaded yet), load them
		if (node.data.children === undefined) {
			// Load the children
			const newTree = readDirTree(node.data.path, true, 0, 1);
			if (newTree && newTree.children) {
				node.data.children = newTree.children;
				// Update both states - remove from collapsed and rebuild tree
				setCollapsed(prev => {
					const next = new Set(prev);
					next.delete(node.data.path);
					return next;
				});
				const newRootData = rootTree.data;
				setRootTree(hierarchy(newRootData));
			}
		} else {
			// Children already loaded, just toggle expand
			setCollapsed(prev => {
				const next = new Set(prev);
				if (next.has(node.data.path)) {
					next.delete(node.data.path);
				} else {
					next.add(node.data.path);
				}
				return next;
			});
		}
	};

	useInput(async (input, key) => {
		if (showTreeMap) {
			setShowTreeMap(false);
			return;
		}
		if (input === 'q') process.exit(0);

		if (input === 'C') {
			// Toggle collapse/expand all children of the selected node's PARENT
			const selectedNode = visibleNodes[selectedIndex];
			if (!selectedNode || !selectedNode.parent) return;
			
			const parentNode = selectedNode.parent;
			
			// Get all descendant nodes with children
			const descendants = [];
			const collectDescendants = (node) => {
				if (node.children && node.children.length > 0) {
					descendants.push(node);
					node.children.forEach(collectDescendants);
				}
			};
			collectDescendants(parentNode);
			
			if (descendants.length === 0) return; // No children to collapse
			
			// Check if all descendants are collapsed
			const allCollapsed = descendants.every(n => collapsed.has(n.data.path));
			
			setCollapsed(prev => {
				const next = new Set(prev);
				descendants.forEach(n => {
					if (allCollapsed) {
						next.delete(n.data.path);
					} else {
						next.add(n.data.path);
					}
				});
				return next;
			});
			return;
		}

		if (input === 'O') {
			// Toggle collapse/expand ALL nodes in the entire tree
			const allNodesWithChildren = [];
			const collectAll = (node) => {
				if (node.children && node.children.length > 0) {
					allNodesWithChildren.push(node);
					node.children.forEach(collectAll);
				}
			};
			collectAll(rootTree);
			
			if (allNodesWithChildren.length === 0) return;
			
			// Check if all nodes are collapsed
			const allCollapsed = allNodesWithChildren.every(n => collapsed.has(n.data.path));
			
			setCollapsed(prev => {
				const next = new Set(prev);
				allNodesWithChildren.forEach(n => {
					if (allCollapsed) {
						next.delete(n.data.path);
					} else {
						next.add(n.data.path);
					}
				});
				return next;
			});
			return;
		}

		if (input === 'm') {
			const node = visibleNodes[selectedIndex];
			if (!node) return;
			// Always start calculating sizes in the background (calculateSizeAsync skips already-calculated nodes)
			calculateSizeAsync(node);
			// Show treemap immediately
			setShowTreeMap(true);
			return;
		}

		if (input === 'd') {
			const node = visibleNodes[selectedIndex];
			if (node) await calculateSizeAsync(node);
			return;
		}

		if (input === 'l') {
			const node = visibleNodes[selectedIndex];
			if (node) await getLastModifiedAsync(node);
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
			if (!node) return;
			
			// Don't allow collapsing/expanding the root
			if (node.depth === 0) return;
			
			if (node.data.isFile) return; // Do nothing for files
			
			// If it's a directory with no children loaded yet, traverse into it
			if (node.data.children === undefined) {
				await traverseDir(node);
			} else if (node.children) {
				// Children already loaded, toggle collapse
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
			if (shortcutMap.has(newInput))
				setSelectedIndex(shortcutMap.get(newInput));
		}
	});

	if (showTreeMap) {
		const node = visibleNodes[selectedIndex];
		
		// Populate value property on DATA objects for treemap visualization
		// This is important because TreeMapView creates a new hierarchy from node.data,
		// so we need to set values on the data objects, not the hierarchy nodes
		const populateValues = (hierarchyNode) => {
			if (!hierarchyNode) return;
			
			// Recursively populate children first (depth-first, bottom-up)
			if (hierarchyNode.children) {
				hierarchyNode.children.forEach(populateValues);
			}
			
			// Set value on the DATA object
			const data = hierarchyNode.data;
			
			if (data.isFile) {
				// Files: use calculatedSize or read from disk
				const calcSize = calculatedSizes.get(data.path);
				if (calcSize !== undefined) {
					data.value = calcSize;
				} else {
					try {
						data.value = fs.statSync(data.path).size;
					} catch {
						data.value = 0;
					}
				}
			} else if (data.children === undefined || !hierarchyNode.children || hierarchyNode.children.length === 0) {
				// Directory with no children loaded OR empty directory
				// Use calculatedSize if available
				const calcSize = calculatedSizes.get(data.path);
				if (calcSize !== undefined) {
					data.value = calcSize;
				} else {
					// For unloaded directories without calculated size, will show as 0
					data.value = data.size || 0;
				}
			} else {
				// Directory with loaded children - let d3's .sum() aggregate from children
				data.value = undefined;
			}
		};
		
		populateValues(node);
		
		return <TreeMapView selectedNode={node} stdout={stdout} calculatedSizes={calculatedSizes} loadingPaths={loadingPaths} />;
	}

	const start = Math.max(0, selectedIndex - Math.floor(viewportHeight / 2));
	const end = Math.min(visibleNodes.length, start + viewportHeight);
	const viewportNodes = visibleNodes.slice(start, end);

	if (!initialized) return null;

	return (
		<Box flexDirection="column">
			<Box justifyContent="space-between">
				<Text color={oneHunter.textAlt} dimColor>
					↑/↓: Navigate | Enter: Expand/Traverse | d: Size | l: Date | m: Map | q: Quit
				</Text>
				{loadingPaths.size > 0 && (
					<Text color={oneHunter.yellow}>
						{' '}{SPINNER_FRAMES[spinnerFrame]} Loading {loadingPaths.size}...
					</Text>
				)}
			</Box>
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
					lastModifiedDates={lastModifiedDates}
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
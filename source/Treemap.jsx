/* eslint-disable unicorn/filename-case */
import React, {useMemo} from 'react';
import {Box, Text} from 'ink';
import {hierarchy, treemap, treemapBinary} from 'd3-hierarchy';
import {getDirectoryColor, getFileColor, theme} from './theme.js';
import {formatBytes} from './utils.js';

const createGrid = (width, height, color = theme.muted) =>
	Array.from({length: height}, (_, y) =>
		Array.from({length: width}, () => ({character: ' ', color, y})),
	);

const setCell = (grid, {x, y, character, color}) => {
	if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) return;
	grid[y][x] = {character, color, y};
};

const getBorderCharacter = (x, y, {x0, y0, x1, y1}) => {
	const width = x1 - x0;
	const height = y1 - y0;
	if (width === 1 && height === 1) return '·';
	if (width === 1) return '│';
	if (height === 1) return '─';

	const isTop = y === y0;
	const isBottom = y === y1 - 1;
	const isLeft = x === x0;
	const isRight = x === x1 - 1;
	if (isTop && isLeft) return '┌';
	if (isTop && isRight) return '┐';
	if (isBottom && isLeft) return '└';
	if (isBottom && isRight) return '┘';
	if (isTop || isBottom) return '─';
	if (isLeft || isRight) return '│';
	return null;
};

const drawBorder = (grid, bounds, color) => {
	for (let y = bounds.y0; y < bounds.y1; y += 1) {
		for (let x = bounds.x0; x < bounds.x1; x += 1) {
			const character = getBorderCharacter(x, y, bounds);
			if (character) setCell(grid, {x, y, character, color});
		}
	}
};

const truncateText = (value, maxLength) => {
	const characters = [...value];
	if (characters.length <= maxLength) return value;
	if (maxLength <= 1) return '…'.slice(0, maxLength);
	return `${characters.slice(0, maxLength - 1).join('')}…`;
};

const drawText = (grid, {value, x, y, maxLength, color}) => {
	const text = truncateText(value, maxLength);
	for (const [index, character] of [...text].entries()) {
		setCell(grid, {x: x + index, y, character, color});
	}
};

const drawCenteredText = (grid, value, y, color) => {
	const width = grid[0]?.length || 0;
	const maxLength = Math.max(0, width - 2);
	if (maxLength === 0) return;
	const text = truncateText(value, maxLength);
	const x = Math.max(1, Math.floor((width - [...text].length) / 2));
	drawText(grid, {value: text, x, y, maxLength, color});
};

const getNodeBounds = (node, width, height) => ({
	x0: Math.max(0, Math.min(width, Math.round(node.x0))),
	y0: Math.max(0, Math.min(height, Math.round(node.y0))),
	x1: Math.max(0, Math.min(width, Math.round(node.x1))),
	y1: Math.max(0, Math.min(height, Math.round(node.y1))),
});

const getNodeLabel = (node, maxLength) => {
	const {name, size} = node.data;
	const detailed = `${name} ${formatBytes(size)}`;
	if ([...detailed].length <= maxLength) return detailed;
	return truncateText(name, maxLength);
};

export const createTreemapRoot = (data, width, height) => {
	const root = hierarchy(data)
		.sum(node => {
			const hasChildren = Boolean(node.children?.length);
			if (hasChildren) return 0;
			return Math.max(1, Number.isFinite(node.size) ? node.size : 0);
		})
		.sort(
			(left, right) =>
				(right.value || 0) - (left.value || 0) ||
				left.data.name.localeCompare(right.data.name),
		);

	treemap()
		.tile(treemapBinary)
		.size([Math.max(1, width), Math.max(1, height)])
		.paddingInner(width > 2 && height > 2 ? 1 : 0)
		.round(true)(root);

	return root;
};

export const createDirectoryGrid = (data, width, height) => {
	const root = createTreemapRoot(data, width, height);
	const nodes = root.children || [];
	const grid = createGrid(width, height);

	for (const node of nodes) {
		const bounds = getNodeBounds(node, width, height);
		const boxWidth = bounds.x1 - bounds.x0;
		const boxHeight = bounds.y1 - bounds.y0;
		if (boxWidth < 1 || boxHeight < 1) continue;

		const color = node.data.isFile
			? getFileColor(node.data.name)
			: getDirectoryColor(node.data.path || node.data.name);
		drawBorder(grid, bounds, color);

		const innerWidth = boxWidth - 2;
		if (innerWidth > 0 && boxHeight >= 3) {
			drawText(grid, {
				value: getNodeLabel(node, innerWidth),
				x: bounds.x0 + 1,
				y: bounds.y0 + 1,
				maxLength: innerWidth,
				color,
			});
		}
	}

	return {grid, nodes};
};

const createFileGrid = (data, width, height) => {
	const color = getFileColor(data.name);
	const grid = createGrid(width, height, color);
	const bounds = {x0: 0, y0: 0, x1: width, y1: height};
	drawBorder(grid, bounds, color);

	if (width >= 3 && height >= 3) {
		const middle = Math.floor(height / 2);
		drawCenteredText(grid, data.name, middle, color);
		if (height >= 5 && middle + 1 < height - 1) {
			drawCenteredText(grid, formatBytes(data.size), middle + 1, color);
		}
	}

	return grid;
};

const createEmptyGrid = (width, height) => {
	const grid = createGrid(width, height);
	if (width >= 3)
		drawCenteredText(
			grid,
			'Empty directory',
			Math.floor(height / 2),
			theme.muted,
		);
	return grid;
};

function Grid({grid}) {
	return (
		<>
			{grid.map(row => {
				const segments = [];
				let currentColor;
				let currentText = '';

				for (const cell of row) {
					if (cell.color === currentColor) {
						currentText += cell.character;
						continue;
					}

					if (currentText) {
						segments.push(
							<Text key={segments.length} color={currentColor}>
								{currentText}
							</Text>,
						);
					}

					currentColor = cell.color;
					currentText = cell.character;
				}

				if (currentText) {
					segments.push(
						<Text key={segments.length} color={currentColor}>
							{currentText}
						</Text>,
					);
				}

				return <Box key={row[0].y}>{segments}</Box>;
			})}
		</>
	);
}

const getViewport = stdout => {
	const columns = Math.max(1, Math.floor(stdout?.columns || 80));
	const rows = Math.max(1, Math.floor(stdout?.rows || 24));
	const showInstructions = rows >= 8;
	const showFooter = rows >= 7;
	const mapMargin = rows >= 6 ? 1 : 0;
	const footerMargin = rows >= 9 ? 1 : 0;
	const reservedRows =
		1 +
		Number(showInstructions) +
		2 +
		mapMargin +
		Number(showFooter) +
		footerMargin;

	return {
		columns,
		rows,
		width: Math.max(1, Math.min(columns, 120) - 2),
		height: Math.max(1, Math.min(rows, 40) - reservedRows),
		showInstructions,
		showFooter,
		mapMargin,
		footerMargin,
		isTooSmall: columns < 3 || rows < 4,
	};
};

function TreemapFrame({title, footer, grid, viewport}) {
	if (viewport.isTooSmall) {
		return (
			<Text color={theme.red} wrap="truncate-end">
				Terminal too small for treemap
			</Text>
		);
	}

	return (
		<Box flexDirection="column" width={viewport.columns}>
			<Text bold color={theme.cyan} wrap="truncate-end">
				{title}
			</Text>
			{viewport.showInstructions && (
				<Text dimColor color={theme.muted} wrap="truncate-end">
					t Tree view · q Quit
				</Text>
			)}
			<Box
				borderStyle="single"
				borderColor={theme.muted}
				flexDirection="column"
				marginTop={viewport.mapMargin}
			>
				<Grid grid={grid} />
			</Box>
			{viewport.showFooter && (
				<Text
					dimColor
					color={theme.muted}
					marginTop={viewport.footerMargin}
					wrap="truncate-end"
				>
					{footer}
				</Text>
			)}
		</Box>
	);
}

function FileTreemap({data, viewport}) {
	const grid = useMemo(
		() => createFileGrid(data, viewport.width, viewport.height),
		[data, viewport.width, viewport.height],
	);
	return (
		<TreemapFrame
			title={`Treemap: ${data.name} (file)`}
			footer={`File · ${formatBytes(data.size)}`}
			grid={grid}
			viewport={viewport}
		/>
	);
}

function EmptyTreemap({data, viewport}) {
	const grid = useMemo(
		() => createEmptyGrid(viewport.width, viewport.height),
		[viewport.width, viewport.height],
	);
	return (
		<TreemapFrame
			title={`Treemap: ${data.name} (empty)`}
			footer="0 items · Total: 0 B"
			grid={grid}
			viewport={viewport}
		/>
	);
}

function DirectoryTreemap({data, viewport}) {
	const {grid, nodes} = useMemo(
		() => createDirectoryGrid(data, viewport.width, viewport.height),
		[data, viewport.width, viewport.height],
	);
	return (
		<TreemapFrame
			title={`Treemap: ${data.name}`}
			footer={`${nodes.length} items · Total: ${formatBytes(data.size)}`}
			grid={grid}
			viewport={viewport}
		/>
	);
}

export function TreeMapView({selectedNode, stdout}) {
	if (!selectedNode?.data) {
		return <Text color={theme.red}>Error: No node selected</Text>;
	}

	const viewport = getViewport(stdout);
	const {data} = selectedNode;
	if (data.isFile) return <FileTreemap data={data} viewport={viewport} />;
	if (!data.children?.length) {
		return <EmptyTreemap data={data} viewport={viewport} />;
	}

	return <DirectoryTreemap data={data} viewport={viewport} />;
}

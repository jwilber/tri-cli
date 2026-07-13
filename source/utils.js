const shortcutLetters = 'abcdefghijklnoprsuvwxyz';

export const formatBytes = bytes => {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
	const exponent = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1,
	);
	const value = Number((bytes / 1024 ** exponent).toFixed(2));
	return `${value} ${units[exponent]}`;
};

export const encodeShortcut = index => {
	let label = '';
	let remainder = index;

	do {
		label = shortcutLetters[remainder % shortcutLetters.length] + label;
		remainder = Math.floor(remainder / shortcutLetters.length) - 1;
	} while (remainder >= 0);

	return label;
};

export const assignShortcuts = root => {
	const visit = (node, parentShortcut = '', isRoot = false) => {
		node.shortcut = isRoot ? '.' : parentShortcut;

		let directoryIndex = 0;
		let fileIndex = 0;
		for (const child of node.children || []) {
			const segment = child.data.isFile
				? String((fileIndex += 1))
				: encodeShortcut(directoryIndex++);
			const childShortcut =
				node.shortcut === '.' ? segment : `${node.shortcut}.${segment}`;
			visit(child, childShortcut);
		}
	};

	visit(root, '', true);
	return root;
};

const createWindow = (itemCount, selectedIndex, capacity) => {
	let start = Math.max(0, selectedIndex - Math.floor(capacity / 2));
	const end = Math.min(itemCount, start + capacity);
	start = Math.max(0, end - capacity);
	return {start, end};
};

export const getViewportWindow = (itemCount, selectedIndex, availableRows) => {
	const rows = Math.max(1, availableRows);

	for (let capacity = rows; capacity >= 1; capacity -= 1) {
		const window = createWindow(itemCount, selectedIndex, capacity);
		const showAbove = window.start > 0;
		const showBelow = window.end < itemCount;
		if (capacity + Number(showAbove) + Number(showBelow) <= rows) {
			return {...window, showAbove, showBelow};
		}
	}

	const window = createWindow(itemCount, selectedIndex, 1);
	const canShowIndicator = rows > 1;
	const preferAbove = selectedIndex >= itemCount / 2;
	return {
		...window,
		showAbove: canShowIndicator && preferAbove && window.start > 0,
		showBelow: canShowIndicator && !preferAbove && window.end < itemCount,
	};
};

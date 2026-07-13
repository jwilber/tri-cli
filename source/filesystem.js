import fs from 'node:fs';
import path from 'node:path';

const entryCollator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base',
});

const sortEntries = (left, right) => {
	const directoryOrder =
		Number(right.isDirectory()) - Number(left.isDirectory());
	return directoryOrder || entryCollator.compare(left.name, right.name);
};

const readNode = (nodePath, noSize, directoryEntry) => {
	try {
		const stats = directoryEntry ? undefined : fs.lstatSync(nodePath);
		const isDirectory = directoryEntry
			? directoryEntry.isDirectory()
			: stats.isDirectory();
		const name = path.basename(nodePath) || nodePath;

		if (!isDirectory) {
			const fileStats = noSize ? undefined : stats || fs.lstatSync(nodePath);
			return {
				name,
				path: nodePath,
				isFile: true,
				size: fileStats?.size || 0,
			};
		}

		const children = fs
			.readdirSync(nodePath, {withFileTypes: true})
			.filter(entry => !entry.name.startsWith('.'))
			.sort(sortEntries)
			.map(entry => readNode(path.join(nodePath, entry.name), noSize, entry))
			.filter(Boolean);
		const size = noSize
			? 0
			: children.reduce((total, child) => total + child.size, 0);

		return {
			name,
			path: nodePath,
			isFile: false,
			size,
			children: children.length > 0 ? children : undefined,
		};
	} catch {
		return null;
	}
};

export const readDirTree = (directoryPath, noSize = false) =>
	readNode(directoryPath, noSize);

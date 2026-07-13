export const helpText = `Usage:
  tri [directory] [options]

Examples:
  tri .                # visualize current directory
  tri ../bionemo -L 2  # show 2 levels deep
  tri --dir src        # specify directory with flag

Options:
  --dir <path>     Directory to visualize (optional if positional)
  -L <level>       Depth level to expand initially (default: 1)
  --no-size, -ns   Skip file size calculation (faster, disables treemap)
  -h, --help       Show this help message`;

const parseLevel = value => {
	if (!/^\d+$/.test(value || '')) {
		throw new Error('-L must be followed by a non-negative integer');
	}

	return Number.parseInt(value, 10);
};

export const parseArguments = arguments_ => {
	let directory;
	let maxLevel = 1;
	let noSize = false;

	const setDirectory = value => {
		if (!value) throw new Error('a directory path is required');
		if (directory) throw new Error('only one directory may be specified');
		directory = value;
	};

	for (let index = 0; index < arguments_.length; index += 1) {
		const argument = arguments_[index];

		if (argument === '--help' || argument === '-h') return {help: true};
		if (argument === '--no-size' || argument === '-ns') {
			noSize = true;
			continue;
		}

		if (argument === '--dir') {
			setDirectory(arguments_[index + 1]);
			index += 1;
			continue;
		}

		if (argument.startsWith('--dir=')) {
			setDirectory(argument.slice('--dir='.length));
			continue;
		}

		if (argument === '-L') {
			maxLevel = parseLevel(arguments_[index + 1]);
			index += 1;
			continue;
		}

		if (argument === '--') {
			for (const value of arguments_.slice(index + 1)) setDirectory(value);
			break;
		}

		if (argument.startsWith('-')) {
			throw new Error(`unknown option: ${argument}`);
		}

		setDirectory(argument);
	}

	return {directory: directory || '.', maxLevel, noSize, help: false};
};

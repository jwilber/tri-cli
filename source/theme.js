import path from 'node:path';

export const theme = {
	background: '#282c34',
	text: 'rgb(206, 205, 195)',
	muted: 'rgb(135, 133, 128)',
	bright: 'white',
	red: 'rgb(209, 77, 65)',
	orange: 'rgb(218, 112, 44)',
	yellow: '#e5c07b',
	green: '#98c379',
	cyan: 'rgb(58, 169, 159)',
	blue: 'rgb(67, 133, 190)',
	purple: 'rgb(139, 126, 200)',
	magenta: 'rgb(206, 93, 151)',
};

const fileColors = new Map([
	['.js', theme.yellow],
	['.jsx', theme.yellow],
	['.ts', theme.blue],
	['.tsx', theme.blue],
	['.py', theme.green],
	['.rb', theme.red],
	['.json', theme.purple],
	['.html', theme.cyan],
	['.css', theme.cyan],
	['.md', theme.orange],
	['.txt', theme.bright],
	['.sh', theme.green],
	['.yml', theme.purple],
	['.yaml', theme.purple],
	['.xml', theme.orange],
	['.svg', theme.cyan],
	['.png', theme.blue],
	['.jpg', theme.blue],
	['.jpeg', theme.blue],
	['.gif', theme.blue],
	['.pdf', theme.red],
	['.toml', theme.muted],
]);

export const getFileColor = filename => {
	if (filename === 'VERSION') return theme.purple;
	if (filename === 'Dockerfile') return theme.blue;

	return fileColors.get(path.extname(filename).toLowerCase()) || theme.text;
};

export const directoryColors = [
	theme.blue,
	theme.cyan,
	theme.green,
	theme.yellow,
	theme.orange,
	theme.red,
	theme.purple,
	theme.magenta,
	'#4a9eff',
	'#7ec699',
	'#e8b339',
	'#ff7eb6',
];

export const getDirectoryColor = value => {
	let hash = 0;
	for (const character of value) {
		hash = (hash * 31 + character.codePointAt(0)) % 2_147_483_647;
	}

	return directoryColors[hash % directoryColors.length];
};

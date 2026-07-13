import test from 'ava';
import {parseArguments} from '../source/arguments.js';

test('parses positional and flagged arguments without mistaking option values for paths', t => {
	t.deepEqual(parseArguments(['-L', '2', '--no-size']), {
		directory: '.',
		maxLevel: 2,
		noSize: true,
		help: false,
	});
	t.deepEqual(parseArguments(['--dir', 'source', '-L', '0']), {
		directory: 'source',
		maxLevel: 0,
		noSize: false,
		help: false,
	});
	t.is(parseArguments(['--', '-directory']).directory, '-directory');
});

test('rejects invalid and ambiguous arguments', t => {
	t.throws(() => parseArguments(['-L', 'nope']), {
		message: '-L must be followed by a non-negative integer',
	});
	t.throws(() => parseArguments(['one', 'two']), {
		message: 'only one directory may be specified',
	});
	t.throws(() => parseArguments(['--wat']), {
		message: 'unknown option: --wat',
	});
});

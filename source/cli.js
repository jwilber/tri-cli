#!/usr/bin/env node
import process from 'node:process';
import React from 'react';
import {render} from 'ink';
import {TreeVisualization} from './app.js';
import {helpText, parseArguments} from './arguments.js';

try {
	const options = parseArguments(process.argv.slice(2));

	if (options.help) {
		console.log(helpText);
	} else if (process.stdin.isTTY) {
		render(
			<TreeVisualization
				dirPath={options.directory}
				maxLevel={options.maxLevel}
				noSize={options.noSize}
			/>,
		);
	} else {
		console.error('tri: an interactive terminal is required.');
		process.exitCode = 1;
	}
} catch (error) {
	console.error(`tri: ${error.message}`);
	console.error("Run 'tri --help' for usage.");
	process.exitCode = 1;
}

#!/usr/bin/env node

import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import * as readline from 'readline'

import {
	getDayStamp,
	getWeekStamp,
	getMonthStamp,
	getYearStamp,
	getLinkCommand,
} from './helpers';

const maxSnapshots = {
	daily: 7,
	weekly: 4,
	monthly: 6,
	yearly: 0,
}

const description = `Usage:
${path.basename(process.argv[1])} sourceFolder destinationFolder`

const timestampPattern = /\d{4}\-\d{2}\-\d{2} \d{2}\:\d{2}/
// 2021-02-28 17:36

let sourcePath = '';
let destinationPath = '';

for (let arg of process.argv.slice(2)){
	if (fs.lstatSync(arg).isDirectory()){
		if (!sourcePath){
			sourcePath = arg;
			continue;
		}
		if (!destinationPath){
			destinationPath = arg;
			continue;
		}
	}
}

if (!sourcePath || !destinationPath){
	console.error(description)
	process.exit(1);
}
const processStartedAt = new Date();
const timestampNow = processStartedAt.toISOString().substr(0, 16).replace('T', ' ');

console.log(`Source:      ${sourcePath}`);
console.log(`Destination: ${destinationPath}`);

fs.readdirSync(destinationPath, {withFileTypes: true})

const snapshotCount = {
	daily: 0,
	weekly: 0,
	monthly: 0,
	yearly: 0,
}

const slots: Slots = {
	daily: [],
	weekly: [],
	monthly: [],
	yearly: [],
}

const snapshots: Snapshot[] = [];

for (let entry of fs.readdirSync(destinationPath, {withFileTypes: true})){
	if (entry.isDirectory() && timestampPattern.test(entry.name)){
		const date = new Date(Date.parse(entry.name));
		const snapshot: Snapshot = {
			name: entry.name,
			date,
			roles: [],
		};
		snapshots.push(snapshot);
		const day = getDayStamp(date);
		if (day != getDayStamp(processStartedAt)){
			if (snapshotCount.daily < maxSnapshots.daily){
				if (!slots.daily.includes(day)){
					slots.daily.push(day);
					snapshotCount.daily += 1;
					snapshot.roles.push('daily');
				}
			}
			if (snapshotCount.weekly < maxSnapshots.weekly){
				const week = getWeekStamp(date);
				if (!slots.weekly.includes(week)){
					slots.weekly.push(week);
					snapshotCount.weekly += 1;
					snapshot.roles.push('weekly');
				}
			}
			if (snapshotCount.monthly < maxSnapshots.monthly){
				const month = getMonthStamp(date);
				if (!slots.monthly.includes(month)){
					slots.monthly.push(month);
					snapshotCount.monthly += 1;
					snapshot.roles.push('monthly');
				}
			}
			if (snapshotCount.yearly < maxSnapshots.yearly){
				const year = getYearStamp(date);
				if (!slots.yearly.includes(year)){
					slots.yearly.push(year);
					snapshotCount.yearly += 1;
					snapshot.roles.push('yearly');
				}
			}
		}
	}
}

console.log('Snapshots:');
for (let snapshot of snapshots){
	if (snapshot.roles.length){
		console.log(`${snapshot.name} ${snapshot.roles.join(', ')}`)
	}
}

const fullSnapshotPath = path.join(destinationPath, timestampNow);
const cmd = getLinkCommand(sourcePath, fullSnapshotPath);
process.stdout.write(`Creating ${timestampNow} ...`);
let start = Date.now();
child_process.spawnSync(cmd[0], cmd.slice(1));
readline.clearLine(process.stdout, 0);
readline.cursorTo(process.stdout, 0);
if (!fs.existsSync(fullSnapshotPath)){
	process.stdout.write(`Creating ${timestampNow} FAILED\n`);
	process.exit(2);
}
let end = Date.now();
process.stdout.write(`${timestampNow} created (${end-start}ms)\n`);
for (let snapshot of snapshots){
	if (!snapshot.roles.length){
		process.stdout.write(`Removing ${snapshot.name} ...`);
		start = Date.now();
		const obsoleteSnapshotPath = path.join(destinationPath, snapshot.name);
		child_process.spawnSync('rm', ['-rf', obsoleteSnapshotPath]);
		end = Date.now();
		readline.clearLine(process.stdout, 0);
		readline.cursorTo(process.stdout, 0);
		if (fs.existsSync(obsoleteSnapshotPath)){
			process.stdout.write(`${snapshot.name} REMOVAL FAILED\n`);
		} else {
			process.stdout.write(`${snapshot.name} removed (${end-start}ms)\n`);
		}
	}
}
console.log(`Process completed in ${(Date.now() - processStartedAt.valueOf())/1000} seconds`)
#!/usr/bin/env node

import child_process from 'child_process';
import fs from 'fs';
import path from 'path';

const maxSnapshots = {
	day: 7,
	week: 4,
	month: 6,
	year: 0,
}

const description = `Usage:
${path.basename(process.argv[1])} sourceFolder destinationFolder`

const timestampPattern = /\d{4}\-\d{2}\-\d{2} \d{2}\d{2}/
// 2021-02-28 1736

function dateEncode(d: Date){
    return d.toISOString().substr(0, 16).replace('T', ' ').replace(':', '');
}
function dateDecode(date: string){
    return new Date(Date.parse(date.substr(0, 13)+':'+date.substr(14)));
}
function getDayStamp(d: Date) {
    return d.toISOString().substr(0, 10);
}
function getWeekStamp(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil(( ( (d.valueOf() - yearStart.valueOf()) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()} ${weekNo}`;
}
function getMonthStamp(d: Date) {
    return d.toISOString().substr(0, 7);
}
function getYearStamp(d: Date) {
    return d.toISOString().substr(0, 4);
}
function getLinkCommand(source: string, destination: string){
    try {
        child_process.spawnSync('rsync');
        return ['rsync', '-a', `--link-dest=${source}`, source+'/', destination]
    } catch (error){
        //
    }
    try {
        child_process.spawnSync('cp');
        return ['cp', '-al', source, destination]
    } catch (error){
        //
    }
    throw new Error('rsync or cp not found');
    
}

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
const timestampNow = dateEncode(processStartedAt);

console.log(`Source:      ${sourcePath}`);
console.log(`Destination: ${destinationPath}`);

fs.readdirSync(destinationPath, {withFileTypes: true})

const snapshotCount = {
	day: 0,
	week: 0,
	month: 0,
	year: 0,
}

const slots: Slots = {
	day: [],
	week: [],
	month: [],
	year: [],
}

const snapshots: Snapshot[] = [];

for (let entry of fs.readdirSync(destinationPath, {withFileTypes: true})){
	if (entry.isDirectory() && timestampPattern.test(entry.name)){
		const date = dateDecode(entry.name);
		const snapshot: Snapshot = {
			name: entry.name,
			date,
			roles: [],
		};
		snapshots.push(snapshot);
		const day = getDayStamp(date);
		if (day != getDayStamp(processStartedAt)){
			if (snapshotCount.day < maxSnapshots.day){
				if (!slots.day.includes(day)){
					slots.day.push(day);
					snapshotCount.day += 1;
					snapshot.roles.push('day');
				}
			}
			if (snapshotCount.week < maxSnapshots.week){
				const week = getWeekStamp(date);
				if (!slots.week.includes(week)){
					slots.week.push(week);
					snapshotCount.week += 1;
					snapshot.roles.push('week');
				}
			}
			if (snapshotCount.month < maxSnapshots.month){
				const month = getMonthStamp(date);
				if (!slots.month.includes(month)){
					slots.month.push(month);
					snapshotCount.month += 1;
					snapshot.roles.push('month');
				}
			}
			if (snapshotCount.year < maxSnapshots.year){
				const year = getYearStamp(date);
				if (!slots.year.includes(year)){
					slots.year.push(year);
					snapshotCount.year += 1;
					snapshot.roles.push('year');
				}
			}
		}
	}
}

console.log('');
for (let snapshot of snapshots){
	if (snapshot.roles.length){
		console.log(`${snapshot.name} ${snapshot.roles.join(', ')}`)
	}
}

const fullSnapshotPath = path.join(destinationPath, timestampNow);
const cmd = getLinkCommand(sourcePath, fullSnapshotPath);
process.stdout.write(`Creating ${timestampNow} `);
let start = Date.now();
child_process.spawnSync(cmd[0], cmd.slice(1));
if (!fs.existsSync(fullSnapshotPath)){
	process.stdout.write(`FAILED\n`);
	process.exit(2);
}
let end = Date.now();
process.stdout.write(`OK (${(end-start)/1000}s)\n`);
for (let snapshot of snapshots){
	if (!snapshot.roles.length){
		process.stdout.write(`Removing ${snapshot.name} `);
		start = Date.now();
		const obsoleteSnapshotPath = path.join(destinationPath, snapshot.name);
		child_process.spawnSync('rm', ['-rf', obsoleteSnapshotPath]);
		end = Date.now();
		if (fs.existsSync(obsoleteSnapshotPath)){
			process.stdout.write(`FAILED`);
		} else {
			process.stdout.write(`OK (${(end-start)/1000}s)`);
		}
		process.stdout.write('\n');
	}
}
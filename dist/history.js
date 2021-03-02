#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = __importDefault(require("child_process"));
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var maxSnapshots = {
    day: 7,
    week: 4,
    month: 6,
    year: 0,
};
var description = "Usage:\n" + path_1.default.basename(process.argv[1]) + " sourceFolder destinationFolder";
var timestampPattern = /\d{4}\-\d{2}\-\d{2} \d{2}\d{2}/;
// 2021-02-28 1736
function dateEncode(d) {
    return d.toISOString().substr(0, 16).replace('T', ' ').replace(':', '');
}
function dateDecode(date) {
    return new Date(Date.parse(date.substr(0, 13) + ':' + date.substr(14)));
}
function getDayStamp(d) {
    return d.toISOString().substr(0, 10);
}
function getWeekStamp(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
    return d.getUTCFullYear() + " " + weekNo;
}
function getMonthStamp(d) {
    return d.toISOString().substr(0, 7);
}
function getYearStamp(d) {
    return d.toISOString().substr(0, 4);
}
function getLinkCommand(source, destination) {
    try {
        child_process_1.default.spawnSync('rsync');
        return ['rsync', '-a', "--link-dest=" + source, source + '/', destination];
    }
    catch (error) {
        //
    }
    try {
        child_process_1.default.spawnSync('cp');
        return ['cp', '-al', source, destination];
    }
    catch (error) {
        //
    }
    throw new Error('rsync or cp not found');
}
var sourcePath = '';
var destinationPath = '';
for (var _i = 0, _a = process.argv.slice(2); _i < _a.length; _i++) {
    var arg = _a[_i];
    if (fs_1.default.lstatSync(arg).isDirectory()) {
        if (!sourcePath) {
            sourcePath = arg;
            continue;
        }
        if (!destinationPath) {
            destinationPath = arg;
            continue;
        }
    }
}
if (!sourcePath || !destinationPath) {
    console.error(description);
    process.exit(1);
}
var processStartedAt = new Date();
var timestampNow = dateEncode(processStartedAt);
console.log("Source:      " + sourcePath);
console.log("Destination: " + destinationPath);
fs_1.default.readdirSync(destinationPath, { withFileTypes: true });
var snapshotCount = {
    day: 0,
    week: 0,
    month: 0,
    year: 0,
};
var slots = {
    day: [],
    week: [],
    month: [],
    year: [],
};
var snapshots = [];
for (var _b = 0, _c = fs_1.default.readdirSync(destinationPath, { withFileTypes: true }); _b < _c.length; _b++) {
    var entry = _c[_b];
    if (entry.isDirectory() && timestampPattern.test(entry.name)) {
        var date = dateDecode(entry.name);
        var snapshot = {
            name: entry.name,
            date: date,
            roles: [],
        };
        snapshots.push(snapshot);
        var day = getDayStamp(date);
        if (day != getDayStamp(processStartedAt)) {
            if (snapshotCount.day < maxSnapshots.day) {
                if (!slots.day.includes(day)) {
                    slots.day.push(day);
                    snapshotCount.day += 1;
                    snapshot.roles.push('day');
                }
            }
            if (snapshotCount.week < maxSnapshots.week) {
                var week = getWeekStamp(date);
                if (!slots.week.includes(week)) {
                    slots.week.push(week);
                    snapshotCount.week += 1;
                    snapshot.roles.push('week');
                }
            }
            if (snapshotCount.month < maxSnapshots.month) {
                var month = getMonthStamp(date);
                if (!slots.month.includes(month)) {
                    slots.month.push(month);
                    snapshotCount.month += 1;
                    snapshot.roles.push('month');
                }
            }
            if (snapshotCount.year < maxSnapshots.year) {
                var year = getYearStamp(date);
                if (!slots.year.includes(year)) {
                    slots.year.push(year);
                    snapshotCount.year += 1;
                    snapshot.roles.push('year');
                }
            }
        }
    }
}
console.log('');
for (var _d = 0, snapshots_1 = snapshots; _d < snapshots_1.length; _d++) {
    var snapshot = snapshots_1[_d];
    if (snapshot.roles.length) {
        console.log(snapshot.name + " " + snapshot.roles.join(', '));
    }
}
var fullSnapshotPath = path_1.default.join(destinationPath, timestampNow);
var cmd = getLinkCommand(sourcePath, fullSnapshotPath);
process.stdout.write("Creating " + timestampNow + " ");
var start = Date.now();
child_process_1.default.spawnSync(cmd[0], cmd.slice(1));
if (!fs_1.default.existsSync(fullSnapshotPath)) {
    process.stdout.write("FAILED\n");
    process.exit(2);
}
var end = Date.now();
process.stdout.write("OK (" + (end - start) / 1000 + "s)\n");
for (var _e = 0, snapshots_2 = snapshots; _e < snapshots_2.length; _e++) {
    var snapshot = snapshots_2[_e];
    if (!snapshot.roles.length) {
        process.stdout.write("Removing " + snapshot.name + " ");
        start = Date.now();
        var obsoleteSnapshotPath = path_1.default.join(destinationPath, snapshot.name);
        child_process_1.default.spawnSync('rm', ['-rf', obsoleteSnapshotPath]);
        end = Date.now();
        if (fs_1.default.existsSync(obsoleteSnapshotPath)) {
            process.stdout.write("FAILED");
        }
        else {
            process.stdout.write("OK (" + (end - start) / 1000 + "s)");
        }
        process.stdout.write('\n');
    }
}

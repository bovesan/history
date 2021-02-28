#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = __importDefault(require("child_process"));
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var readline = __importStar(require("readline"));
var helpers_1 = require("./helpers");
var maxSnapshots = {
    daily: 7,
    weekly: 4,
    monthly: 6,
    yearly: 0,
};
var description = "Usage:\n" + path_1.default.basename(process.argv[1]) + " sourceFolder destinationFolder";
var timestampPattern = /\d{4}\-\d{2}\-\d{2} \d{2}\:\d{2}/;
// 2021-02-28 17:36
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
var timestampNow = processStartedAt.toISOString().substr(0, 16).replace('T', ' ');
console.log("Source:      " + sourcePath);
console.log("Destination: " + destinationPath);
fs_1.default.readdirSync(destinationPath, { withFileTypes: true });
var snapshotCount = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
};
var slots = {
    daily: [],
    weekly: [],
    monthly: [],
    yearly: [],
};
var snapshots = [];
for (var _b = 0, _c = fs_1.default.readdirSync(destinationPath, { withFileTypes: true }); _b < _c.length; _b++) {
    var entry = _c[_b];
    if (entry.isDirectory() && timestampPattern.test(entry.name)) {
        var date = new Date(Date.parse(entry.name));
        var snapshot = {
            name: entry.name,
            date: date,
            roles: [],
        };
        snapshots.push(snapshot);
        var day = helpers_1.getDayStamp(date);
        if (day != helpers_1.getDayStamp(processStartedAt)) {
            if (snapshotCount.daily < maxSnapshots.daily) {
                if (!slots.daily.includes(day)) {
                    slots.daily.push(day);
                    snapshotCount.daily += 1;
                    snapshot.roles.push('daily');
                }
            }
            if (snapshotCount.weekly < maxSnapshots.weekly) {
                var week = helpers_1.getWeekStamp(date);
                if (!slots.weekly.includes(week)) {
                    slots.weekly.push(week);
                    snapshotCount.weekly += 1;
                    snapshot.roles.push('weekly');
                }
            }
            if (snapshotCount.monthly < maxSnapshots.monthly) {
                var month = helpers_1.getMonthStamp(date);
                if (!slots.monthly.includes(month)) {
                    slots.monthly.push(month);
                    snapshotCount.monthly += 1;
                    snapshot.roles.push('monthly');
                }
            }
            if (snapshotCount.yearly < maxSnapshots.yearly) {
                var year = helpers_1.getYearStamp(date);
                if (!slots.yearly.includes(year)) {
                    slots.yearly.push(year);
                    snapshotCount.yearly += 1;
                    snapshot.roles.push('yearly');
                }
            }
        }
    }
}
console.log('Snapshots:');
for (var _d = 0, snapshots_1 = snapshots; _d < snapshots_1.length; _d++) {
    var snapshot = snapshots_1[_d];
    if (snapshot.roles.length) {
        console.log(snapshot.name + " " + snapshot.roles.join(', '));
    }
}
var fullSnapshotPath = path_1.default.join(destinationPath, timestampNow);
var cmd = helpers_1.getLinkCommand(sourcePath, fullSnapshotPath);
process.stdout.write("Creating " + timestampNow + " ...");
var start = Date.now();
child_process_1.default.spawnSync(cmd[0], cmd.slice(1));
readline.clearLine(process.stdout, 0);
readline.cursorTo(process.stdout, 0);
if (!fs_1.default.existsSync(fullSnapshotPath)) {
    process.stdout.write("Creating " + timestampNow + " FAILED\n");
    process.exit(2);
}
var end = Date.now();
process.stdout.write(timestampNow + " created (" + (end - start) + "ms)\n");
for (var _e = 0, snapshots_2 = snapshots; _e < snapshots_2.length; _e++) {
    var snapshot = snapshots_2[_e];
    if (!snapshot.roles.length) {
        process.stdout.write("Removing " + snapshot.name + " ...");
        start = Date.now();
        var obsoleteSnapshotPath = path_1.default.join(destinationPath, snapshot.name);
        child_process_1.default.spawnSync('rm', ['-rf', obsoleteSnapshotPath]);
        end = Date.now();
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        if (fs_1.default.existsSync(obsoleteSnapshotPath)) {
            process.stdout.write(snapshot.name + " REMOVAL FAILED\n");
        }
        else {
            process.stdout.write(snapshot.name + " removed (" + (end - start) + "ms)\n");
        }
    }
}
console.log("Process completed in " + (Date.now() - processStartedAt.valueOf()) / 1000 + " seconds");

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLinkCommand = exports.getYearStamp = exports.getMonthStamp = exports.getWeekStamp = exports.getDayStamp = void 0;
var child_process_1 = __importDefault(require("child_process"));
function getDayStamp(d) {
    return d.toISOString().substr(0, 10);
}
exports.getDayStamp = getDayStamp;
function getWeekStamp(d) {
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Get first day of year
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    var weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
    // Return array of year and week number
    return d.getUTCFullYear() + " " + weekNo;
}
exports.getWeekStamp = getWeekStamp;
function getMonthStamp(d) {
    return d.toISOString().substr(0, 7);
}
exports.getMonthStamp = getMonthStamp;
function getYearStamp(d) {
    return d.toISOString().substr(0, 4);
}
exports.getYearStamp = getYearStamp;
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
exports.getLinkCommand = getLinkCommand;

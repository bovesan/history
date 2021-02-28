import os from 'os';
import child_process from 'child_process';

export function getDayStamp(d: Date) {
    return d.toISOString().substr(0, 10);
}
export function getWeekStamp(d: Date) {
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil(( ( (d.valueOf() - yearStart.valueOf()) / 86400000) + 1)/7);
    // Return array of year and week number
    return `${d.getUTCFullYear()} ${weekNo}`;
}
export function getMonthStamp(d: Date) {
    return d.toISOString().substr(0, 7);
}
export function getYearStamp(d: Date) {
    return d.toISOString().substr(0, 4);
}
export function getLinkCommand(source: string, destination: string){
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
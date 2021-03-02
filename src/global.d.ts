interface Snapshot {
	name: string;
	date: Date;
	roles: SnapshotRole[];
}
type SnapshotRole = 'none' | 'day' | 'week' | 'month' | 'year';
interface Slots {
	day: string[];
	week: string[];
	month: string[];
	year: string[];
}
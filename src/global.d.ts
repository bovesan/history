interface Snapshot {
	name: string;
	date: Date;
	roles: SnapshotRole[];
}
type SnapshotRole = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
interface Slots {
	daily: string[];
	weekly: string[];
	monthly: string[];
	yearly: string[];
}
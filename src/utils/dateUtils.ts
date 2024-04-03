export function getCurrentDateUTC(timezoneOffsetHours: number = 9): Date {
	const now = new Date();
	const utcMilliseconds = now.getTime() + now.getTimezoneOffset() * 60000;
	const adjustedDate = new Date(utcMilliseconds + timezoneOffsetHours * 3600000);
	return adjustedDate;
}

export function parseDateFromString(dateString: string): Date | null {
	if (!/^\d{8}$/.test(dateString)) {
		return null;
	}
	const year = parseInt(dateString.slice(0, 4), 10);
	const month = parseInt(dateString.slice(4, 6), 10) - 1;
	const day = parseInt(dateString.slice(6, 8), 10);
	const parsedDate = new Date(Date.UTC(year, month, day));
	if (isNaN(parsedDate.getTime())) {
		return null;
	}
	return parsedDate;
}

export function formatDateISO(date: Date): string {
	const year = date.getUTCFullYear().toString();
	const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
	const day = date.getUTCDate().toString().padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function getStartAndEndOfWeek(date: Date = new Date()): {
	startOfWeek: Date;
	endOfWeek: Date;
} {
	const adjustedDate = new Date(date);
	adjustedDate.setUTCHours(adjustedDate.getUTCHours() + 9);
	const dayOfWeek = adjustedDate.getUTCDay();
	const startOfWeek = new Date(adjustedDate);
	startOfWeek.setUTCDate(startOfWeek.getUTCDate() - ((dayOfWeek + 6) % 7));
	startOfWeek.setUTCHours(0, 0, 0, 0);
	const endOfWeek = new Date(startOfWeek);
	endOfWeek.setUTCDate(endOfWeek.getUTCDate() + 6);
	endOfWeek.setUTCHours(23, 59, 59, 999);
	return { startOfWeek, endOfWeek };
}

export function getCurrentDateWithTimezoneOffset(timezoneOffsetHours: number = 9): Date {
	const now = new Date();
	now.setUTCHours(now.getUTCHours() + timezoneOffsetHours);
	return now;
}

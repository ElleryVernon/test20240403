import { INTENSITY_ZONE } from "../../config/constants";
import { prisma } from "../db";
import { getStartAndEndOfWeek } from "./dateUtils";
import { calculateMean, calculateStandardDeviation } from "./mathUtils";

export interface UserData {
	name: string;
	totalPoints: number;
	intervalWorkoutCount: number;
}

export interface DailyWorkoutData {
	dayOfWeek: string;
	workouts: {
		workoutName: string;
		point: number;
		intensityZone: number;
	}[];
	hasIntervalWorkout: boolean;
}

type IntensityZone = {
	lower: number;
	upper: number;
	zone: number;
};

interface ScoresByWorkout {
	[key: string]: number;
}

export async function getAllWorkoutData(grade: string): Promise<UserData[]> {
	const { startOfWeek, endOfWeek } = getStartAndEndOfWeek();

	const usersWithWorkoutPoints = await prisma.user.findMany({
		where: {
			year: {
				some: {
					year: {
						grade: grade,
					},
				},
			},
		},
		include: {
			Workouts: {
				where: {
					createdAt: {
						gte: startOfWeek,
						lte: endOfWeek,
					},
				},
				select: {
					category: true,
					workoutName: true,
					point: true,
				},
			},
		},
	});

	const summedPoints: UserData[] = usersWithWorkoutPoints
		.map((user) => {
			const cardioWorkouts = user.Workouts.filter((workout) => workout.category === "CARDIO");
			const intervalWorkouts = user.Workouts.filter((workout) => workout.category === "INTERVAL");

			const totalPoints = cardioWorkouts.reduce((acc, workout) => acc + workout.point, 0);
			const intervalWorkoutCount = intervalWorkouts.length;

			return {
				name: user.name || user.nickname || "미등록 사용자",
				totalPoints,
				intervalWorkoutCount,
			};
		})
		.sort((a, b) => b.totalPoints - a.totalPoints);

	return summedPoints;
}

export async function getCardioWorkoutScores(discordId: string) {
	const { startOfWeek, endOfWeek } = getStartAndEndOfWeek();

	const cardioWorkouts = await prisma.workouts.findMany({
		where: {
			category: "CARDIO",
			user: {
				discord_id: discordId,
			},
			createdAt: {
				gte: startOfWeek,
				lte: endOfWeek,
			},
		},
		select: {
			workoutName: true,
			point: true,
		},
	});

	const scoresByWorkout: ScoresByWorkout = cardioWorkouts.reduce((acc: any, workout) => {
		const { workoutName, point } = workout;

		if (!workoutName) return;
		acc[workoutName] = (acc[workoutName] || 0) + point;
		return acc;
	}, {});

	const totalScore = cardioWorkouts.reduce((sum, workout) => sum + workout.point, 0);

	return { scoresByWorkout, totalScore };
}

export async function getIntervalWorkoutCount(discordId: string) {
	const { startOfWeek, endOfWeek } = getStartAndEndOfWeek();

	const intervalWorkoutCount = await prisma.workouts.count({
		where: {
			category: "INTERVAL",
			user: {
				discord_id: discordId,
			},
			createdAt: {
				gte: startOfWeek,
				lte: endOfWeek,
			},
		},
	});

	return intervalWorkoutCount;
}

export function calculateWeeklyStress(
	totalWeeklyLoad: number,
	dailyLoads: number[]
): number | null {
	if (dailyLoads.length === 0) {
		return 0;
	}

	const mean = calculateMean(dailyLoads);
	const standardDeviation = calculateStandardDeviation(dailyLoads);

	if (standardDeviation === 0 || standardDeviation === null) {
		return 0;
	}

	const finalMetric = totalWeeklyLoad * (mean / standardDeviation);
	return finalMetric;
}

export async function calculateWeeklyLoadsForUser(discordId: string) {
	const userWithYear = await prisma.user.findUnique({
		where: { discord_id: discordId },
		include: {
			year: {
				include: {
					year: true,
				},
				orderBy: {
					createdAt: "asc",
				},
				take: 1,
			},
		},
	});

	if (!userWithYear || userWithYear.year.length === 0 || !userWithYear.year[0].year) {
		throw new Error("사용자 또는 기수 정보를 찾을 수 없습니다.");
	}

	const latestYear = userWithYear.year[0].year;
	const startDate = new Date(latestYear.startDate!);
	const currentDate = new Date();

	const weekDiff = Math.floor(
		(currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
	);

	const weeks = Array.from({ length: weekDiff + 1 }, (_, i) => {
		const startOfWeek = new Date(startDate);
		startOfWeek.setDate(startOfWeek.getDate() + i * 7);
		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(endOfWeek.getDate() + 6);
		endOfWeek.setHours(23, 59, 59, 999);

		return { startOfWeek, endOfWeek };
	});

	const weeklyDataPromises = weeks.map(async ({ startOfWeek, endOfWeek }) => {
		const weeklyWorkouts = await prisma.workouts.findMany({
			where: {
				createdAt: {
					gte: startOfWeek,
					lte: endOfWeek,
				},
				userId: userWithYear.id,
			},
			select: {
				dailyLoad: true,
				createdAt: true,
			},
		});

		const dailyLoads = Array(7).fill(0);

		weeklyWorkouts.forEach((workout) => {
			const dayIndex = new Date(workout.createdAt).getUTCDay();
			dailyLoads[dayIndex] = (dailyLoads[dayIndex] || 0) + workout.dailyLoad;
		});

		const totalLoad = dailyLoads.reduce((acc, load) => acc + load, 0);
		const stress = calculateWeeklyStress(totalLoad, dailyLoads);

		return {
			week: startOfWeek,
			totalLoad,
			stress,
		};
	});

	return Promise.all(weeklyDataPromises);
}

export default function formatIntensityZones(zones: IntensityZone[]): string {
	return zones
		.map((zone) => {
			const roundedLower = Math.round(zone.lower);
			const roundedUpper = Math.round(zone.upper);
			const intensity = INTENSITY_ZONE[zone.zone - 1];
			return `\`${roundedLower} BPM\` ~ \`${roundedUpper} BPM\` -\`${intensity}\``;
		})
		.join("\n");
}

export async function getWeeklyWorkoutData(discordId: string): Promise<DailyWorkoutData[]> {
	const { startOfWeek, endOfWeek } = getStartAndEndOfWeek();

	const workouts = await prisma.workouts.findMany({
		where: {
			user: {
				discord_id: discordId,
			},
			createdAt: {
				gte: startOfWeek,
				lte: endOfWeek,
			},
		},
		select: {
			category: true,
			workoutName: true,
			point: true,
			intensityZone: true,
			createdAt: true,
		},
		orderBy: {
			createdAt: "asc",
		},
	});

	const dailyWorkoutData: DailyWorkoutData[] = Array(7)
		.fill(null)
		.map((_, index) => ({
			dayOfWeek: ["일", "월", "화", "수", "목", "금", "토"][index],
			workouts: [],
			hasIntervalWorkout: false,
		}));

	workouts.forEach((workout) => {
		const createdAtKST = new Date(
			workout.createdAt.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
		);
		const dayIndex = createdAtKST.getUTCDay();
		if (workout.category === "CARDIO") {
			dailyWorkoutData[dayIndex].workouts.push({
				workoutName: workout.workoutName!,
				point: workout.point,
				intensityZone: workout.intensityZone,
			});
		} else if (workout.category === "INTERVAL") {
			dailyWorkoutData[dayIndex].hasIntervalWorkout = true;
		}
	});

	return dailyWorkoutData;
}

export async function deleteLatestWorkoutForUser(discordId: string) {
	const userWithWorkouts = await prisma.user.findUnique({
		where: { discord_id: discordId },
		include: {
			Workouts: {
				orderBy: {
					createdAt: "desc",
				},
				take: 1,
			},
		},
	});

	if (!userWithWorkouts || userWithWorkouts.Workouts.length === 0) {
		throw new Error("사용자 또는 운동 기록을 찾을 수 없습니다.");
	}

	const latestWorkout = userWithWorkouts.Workouts[0];

	await prisma.workouts.delete({
		where: {
			id: latestWorkout.id,
		},
	});

	return latestWorkout;
}

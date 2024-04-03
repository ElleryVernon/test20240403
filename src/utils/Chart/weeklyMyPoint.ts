// weeklyPoint.ts
import { createCanvas, registerFont } from "canvas";
import {
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	ChartConfiguration,
	Legend,
	LinearScale,
	Title,
	Tooltip,
} from "chart.js";
import { DailyWorkoutData, getWeeklyWorkoutData } from "../dataUtils";

registerFont("./src/fonts/NanumGothic.ttf", { family: "NanumGothic" });
registerFont("./src/fonts/NanumGothicBold.ttf", { family: "NanumGothic", weight: "bold" });
registerFont("./src/fonts/NanumGothicExtraBold.ttf", {
	family: "NanumGothic",
	weight: "extrabold",
});
registerFont("./src/fonts/NanumGothicLight.ttf", { family: "NanumGothic", weight: "light" });

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const CHART_WIDTH = 1440;
const CHART_HEIGHT = 820;
const MAX_BAR_THICKNESS = 50;
const CHART_TITLE = "요일별 운동 포인트";
const CHART_ASPECT_RATIO = 5 / 3;

function getColorForIntensityZone(intensityZone: number): string {
	const colors = [
		"rgba(137, 207, 240, 0.8)", // Light Sky Blue
		"rgba(0, 120, 215, 0.8)", // Slightly desaturated blue
		"rgba(123, 104, 238, 0.8)", // Medium Purple
		"rgba(240, 128, 128, 0.8)", // Light Coral Pink
		"rgba(220, 20, 60, 0.8)", // Crimson Red
	];
	return colors[intensityZone - 1] || "rgba(255, 159, 64, 0.8)"; // Orange for default
}

function getBarThickness(dataLength: number): number {
	return Math.min(CHART_HEIGHT / dataLength / 2, MAX_BAR_THICKNESS);
}

function createChartConfiguration(
	data: DailyWorkoutData[],
	barThickness: number
): ChartConfiguration<"bar", number[], string> {
	const datasets = data.flatMap((dailyData) =>
		dailyData.workouts.map((workout) => {
			const dataPoints = Array(7).fill(0);
			const dayIndex = ["월", "화", "수", "목", "금", "토", "일"].indexOf(dailyData.dayOfWeek);
			dataPoints[dayIndex] = workout.point;
			return {
				label: workout.workoutName,
				data: dataPoints,
				backgroundColor: getColorForIntensityZone(workout.intensityZone),
				borderWidth: 1,
				barThickness: barThickness,
				borderRadius: 8,
			};
		})
	);

	return {
		type: "bar",
		data: {
			labels: ["월", "화", "수", "목", "금", "토", "일"],
			datasets,
		},
		options: {
			indexAxis: "x",
			layout: {
				padding: {
					top: 16,
					right: 20,
					bottom: 64,
					left: 20,
				},
			},
			responsive: true,
			plugins: {
				legend: {
					display: false,
				},
				datalabels: {
					color: "white",
					offset: 8,
					formatter: (value, context) => {
						return value !== 0 ? `${value.toString()}pt` : "";
					},
					font: {
						weight: "bold",
						size: 12,
					},
				},
				title: {
					display: true,
					text: CHART_TITLE,
					color: "#ffffff",
					font: {
						weight: "bold",
						size: 20,
					},
				},
			},
			scales: {
				x: {
					stacked: true,
					ticks: {
						color: "#ffffff",
						font: {
							size: 22,
						},
						callback: function (value, index, values) {
							const hasIntervalWorkout = data.find(
								(dailyData) =>
									["월", "화", "수", "목", "금", "토", "일"][index] === dailyData.dayOfWeek
							)?.hasIntervalWorkout;
							const day = ["월", "화", "수", "목", "금", "토", "일"][value as number];
							if (hasIntervalWorkout) {
								return `● ${day}`; // 인터벌 운동 기록이 있는 요일은 큰 점(●) 표시
							}
							return day;
						},
					},
					grid: {
						drawOnChartArea: true,
					},
				},
				y: {
					stacked: true,
					ticks: {
						color: "#ffffff",
						font: {
							size: 18,
						},
					},
					grid: {
						drawOnChartArea: true,
					},
				},
			},
			aspectRatio: CHART_ASPECT_RATIO,
		},
	};
}

function renderChartToBuffer(configuration: ChartConfiguration<"bar", number[], string>): Buffer {
	const offscreenCanvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const offscreenCtx = offscreenCanvas.getContext("2d");

	new Chart(offscreenCtx as unknown as HTMLCanvasElement, configuration);

	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const ctx = canvas.getContext("2d");

	ctx.fillStyle = "rgba(30,30,30,1)";
	ctx.fillRect(0, 0, CHART_WIDTH, CHART_HEIGHT);

	ctx.drawImage(offscreenCanvas, 0, 0);

	return canvas.toBuffer("image/png");
}

export async function createChartBuffer(discordId: string): Promise<Buffer | null> {
	const data = await getWeeklyWorkoutData(discordId);
	if (data.length === 0) {
		return null;
	}
	const barThickness = getBarThickness(data.length);
	const configuration = createChartConfiguration(data, barThickness);
	return renderChartToBuffer(configuration);
}

import { openai } from "./openai";
import axios from "axios";
import FormData from "form-data";
import { createId } from "@paralleldrive/cuid2";
import { downloadImageAsBuffer } from "./networkUtils";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_API_KEY } from "../../config/env";

const API_URL =
	"https://maz81ke37z.apigw.ntruss.com/custom/v1/18444/3183dd1086134e67836b4e06b0f6b2cc60289b7128ea6c4d1d0b2dedca17a492/general";
const SECRET_KEY = "U2VQbG90VmJJTkJVZm1DbFFNclJ3d1ZmWWJuR0VpT2c=";

const anthropic = new Anthropic({
	apiKey: ANTHROPIC_API_KEY,
});

interface OCRMessage {
	images: Array<{ format: string; name: string }>;
	requestId: string;
	timestamp: number;
	version: string;
}

async function recognizeImage(imageBuffer: Buffer): Promise<string> {
	const message: OCRMessage = {
		images: [
			{
				format: "jpg",
				name: "file.jpg",
			},
		],
		requestId: createId(),
		timestamp: Date.now(),
		version: "V2",
	};

	const formData = new FormData();
	formData.append("file", imageBuffer, { filename: "file.jpg" });
	formData.append("message", JSON.stringify(message));

	try {
		const response = await axios.post(API_URL, formData, {
			headers: {
				"X-OCR-SECRET": SECRET_KEY,
				...formData.getHeaders(),
			},
		});

		if (response.status === 200) {
			const texts = response.data.images[0].fields.map((field: any) => field.inferText);
			return texts.join(" ");
		} else {
			throw new Error(`Unexpected response status: ${response.status}`);
		}
	} catch (error) {
		console.error("OCR Error:", error);
		throw error;
	}
}

const ocrWorkout = async (url: string): Promise<string | null> => {
	try {
		const imageBuffer = await downloadImageAsBuffer(url);
		const ocrText = await recognizeImage(imageBuffer);

		const response = await anthropic.messages.create({
			model: "claude-3-opus-20240229",
			max_tokens: 1000,
			temperature: 0,
			system:
				"** 너는 전설적인 OCR 전문가이자 한국어 전문가야. ** \n- OCR로 추출한 텍스트를 전달하면 오로지 운동시간(Minute, 분 단위로 반올림)와 평균심박수(BPM, 세자리)을 두 가지 정보의 숫자만 순서대로 추출해줘. (example: 76, 120) \n- 운동시간과 심박수 중에 하나라도 알 수 없을 경우 추측하지마.",
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "<요약 3월 10일 (일) 하이킹 자유 목표 오전 10:25-오후 1:44 서울특별시 운동 세부사항 더 보기 운동 시간 경과 시간 3:00:36 3:18:57 거리 활동 킬로칼로리 6.50KM 713KCAL 총 킬로칼로리 등반 고도 959KCAL 535M 평균 페이스 평균 심박수 27'46\"/KM 150BPM",
						},
					],
				},
				{
					role: "assistant",
					content: [
						{
							type: "text",
							text: "181, 150",
						},
					],
				},
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "SKT 6:07 f 91% h 46:31 3월 22일 (금) 오후 9:15-오후 10:01 운동 상세정보 평균 심박수 최대 심박수 126bpm 159bpm 운동 칼로리 총 칼로리 354kcal 354kcal 운동 시간 총 시간 00:46:31 00:46:32 차트 심박수 <",
						},
					],
				},
				{
					role: "assistant",
					content: [
						{
							type: "text",
							text: "47, 126",
						},
					],
				},
				{
					role: "user",
					content: [
						{
							type: "text",
							text: 'a Triple Threat TRIPLE 20 2024 08:15PM - Wed Mar LION HEART THREAT F45 Gwanghwamun 50 100 45 pts "title "" 40 80 70 % 30 60 20 40 10 20 5 10 15 20 25 30 35 40 45 Mins 47.2 567 AVE 165 Pts Cal BPM',
						},
					],
				},
				{
					role: "assistant",
					content: [
						{
							type: "text",
							text: "45, 165",
						},
					],
				},
				{
					role: "user",
					content: [
						{
							type: "text",
							text: ocrText,
						},
					],
				},
			],
		});

		if (!response || !response.content || response.content.length === 0) {
			return null;
		}

		return response.content[0].text;
	} catch (error) {
		console.error("OCR Workout Error:", error);
		return null;
	}
};

export default ocrWorkout;

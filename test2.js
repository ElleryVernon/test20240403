import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const API_URL =
	"https://maz81ke37z.apigw.ntruss.com/custom/v1/18444/3183dd1086134e67836b4e06b0f6b2cc60289b7128ea6c4d1d0b2dedca17a492/general";
const SECRET_KEY = "U2VQbG90VmJJTkJVZm1DbFFNclJ3d1ZmWWJuR0VpT2c=";

async function recognizeImage(imageBuffer, filename) {
	const message = {
		images: [
			{
				format: filename.split(".").pop(),
				name: filename,
			},
		],
		requestId: "unique-request-id",
		timestamp: Date.now(),
		version: "V2",
	};

	const formData = new FormData();
	formData.append("file", imageBuffer, { filename });
	formData.append("message", JSON.stringify(message));

	try {
		const response = await axios.post(API_URL, formData, {
			headers: {
				"X-OCR-SECRET": SECRET_KEY,
				...formData.getHeaders(),
			},
		});

		if (response.status === 200) {
			const texts = response.data.images[0].fields.map((field) => field.inferText);
			return texts.join(" ");
		} else {
			throw new Error(`Unexpected response status: ${response.status}`);
		}
	} catch (error) {
		console.error("OCR Error:", error);
		throw error;
	}
}

// 사용 예시
const imageBuffer = fs.readFileSync("./file.jpg");
const filename = "file.jpg";
recognizeImage(imageBuffer, filename)
	.then((result) => {
		console.log("인식된 텍스트:", result);
	})
	.catch((error) => {
		console.error("에러 발생:", error);
	});

import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { createChartBuffer } from "../../utils/Chart/weeklyMyPoint";
import { ERROR_MESSAGES } from "../../../config/constants";
import { prisma } from "../../db";

const weeklyMyWorkoutPoints = {
	...new SlashCommandBuilder()
		.setName("요일별-운동그래프-보기")
		.setDescription("이번 주 본인의 카디오 운동 포인트를 확인할 수 있습니다."),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();
		const discordId = interaction.user.id;
		// const targetUser = interaction.options.getUser("유저", true);
		const user = await prisma.user.findUnique({ where: { discord_id: discordId } });
		if (!user) {
			throw new Error(ERROR_MESSAGES.USER_NOT_REGISTERED);
		}

		const imageBuffer = await createChartBuffer(discordId);

		if (!imageBuffer) {
			return await interaction.editReply({
				content: "요일별 운동 그래프를 가져오는데 문제가 생겼어요! 관리자에게 문의해주세요.",
			});
		}

		await interaction.editReply({
			files: [new AttachmentBuilder(imageBuffer)],
			content: `📊 \`${user.name}\`님의 이번 주 요일별 운동 포인트입니다.`,
		});
	},
};

export default weeklyMyWorkoutPoints;

import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { deleteLatestWorkoutForUser } from "../../utils/dataUtils";

const deleteWorkoutResult = {
	...new SlashCommandBuilder()
		.setName("최근-운동기록-삭제")
		.setDescription("나의 가장 최근 운동기록을 삭제합니다."),
	async execute(interaction: ChatInputCommandInteraction) {
		const discordId = interaction.user.id;

		try {
			await interaction.deferReply();
			await deleteLatestWorkoutForUser(discordId);
            await interaction.editReply("가장 최근 운동기록이 삭제되었습니다.");
		} catch (error) {
			await interaction.editReply("사용자 또는 운동 기록을 찾을 수 없습니다.");
		}
	},
};

export default deleteWorkoutResult;

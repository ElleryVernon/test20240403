import checkIntensityZone from "./checkIntensityZone";
import deleteWorkoutResult from "./deleteWorkoutResult/WorkoutResult";
import insertUserInfo from "./insertUserInfo/userInfo";
import insertIntervalWorkoutResult from "./insertWokroutResult/IntervalWorkout";
import insertCardioWorkoutResult from "./insertWokroutResult/cardioWorkout";
import question from "./question";
import weeklyCardioWorkoutPoints from "./readDataWithGraph/weeklyCardioWorkoutPoint";
import weklyStress from "./readDataWithGraph/weeklyStress";
import weeklyWorkoutPoints from "./readDataWithGraph/weeklyWorkoutPoints";
import weeklyMyWorkoutPoints from "./readDataWithGraph/weekyMyPoint";
import insertRestingRate from "./updateUserInfo/RestingDate";
import insertBirthDate from "./updateUserInfo/birthDate";

const commands = [
	checkIntensityZone,
	deleteWorkoutResult,
	insertUserInfo,
	insertIntervalWorkoutResult,
	insertCardioWorkoutResult,
	question,
	weeklyCardioWorkoutPoints,
	weeklyMyWorkoutPoints,
	weklyStress,
	weeklyWorkoutPoints,
	insertRestingRate,
	insertBirthDate,
];

export default commands;

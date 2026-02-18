import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for due tasks every 30 minutes (tasks are daily/weekly)
crons.interval("check-due-tasks", { minutes: 30 }, internal.cronRunner.checkDueTasks);

export default crons;

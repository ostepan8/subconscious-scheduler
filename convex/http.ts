import { httpRouter } from "convex/server";
import { auth } from "./auth";
import {
  titleConversation,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  triggerTask,
  getTaskDetails,
  askQuestion,
} from "./tools";

const http = httpRouter();

auth.addHttpRoutes(http);

// Tool endpoints for Subconscious agent callbacks
http.route({ path: "/tools/list-tasks", method: "POST", handler: listTasks });
http.route({ path: "/tools/create-task", method: "POST", handler: createTask });
http.route({ path: "/tools/update-task", method: "POST", handler: updateTask });
http.route({ path: "/tools/delete-task", method: "POST", handler: deleteTask });
http.route({ path: "/tools/trigger-task", method: "POST", handler: triggerTask });
http.route({ path: "/tools/get-task", method: "POST", handler: getTaskDetails });
http.route({ path: "/tools/title-conversation", method: "POST", handler: titleConversation });
http.route({ path: "/tools/ask-question", method: "POST", handler: askQuestion });

export default http;

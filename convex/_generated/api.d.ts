/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as conversations from "../conversations.js";
import type * as cronRunner from "../cronRunner.js";
import type * as crons from "../crons.js";
import type * as executionResults from "../executionResults.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as notificationPrefs from "../notificationPrefs.js";
import type * as pendingQuestions from "../pendingQuestions.js";
import type * as tasks from "../tasks.js";
import type * as tools from "../tools.js";
import type * as triggerTask from "../triggerTask.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  conversations: typeof conversations;
  cronRunner: typeof cronRunner;
  crons: typeof crons;
  executionResults: typeof executionResults;
  http: typeof http;
  messages: typeof messages;
  migrations: typeof migrations;
  notificationPrefs: typeof notificationPrefs;
  pendingQuestions: typeof pendingQuestions;
  tasks: typeof tasks;
  tools: typeof tools;
  triggerTask: typeof triggerTask;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

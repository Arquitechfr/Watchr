import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/env.js";
import { User } from "../models/user.model.js";
import { generateUniqueUsername } from "../lib/usernameGenerator.js";
import { log, logError } from "../lib/logger.js";

let usernameFixQueue: Queue | null = null;

export function getUsernameFixQueue(): Queue {
  if (!usernameFixQueue) {
    usernameFixQueue = new Queue("username-fix", { connection: redisConnection });
  }
  return usernameFixQueue;
}

export async function scheduleUsernameFix(): Promise<void> {
  const queue = getUsernameFixQueue();
  await queue.add(
    "fix-missing-usernames",
    {},
    {
      repeat: { pattern: "0 5 * * *" },
      jobId: "daily-username-fix",
    },
  );
}

export async function fixMissingUsernames(): Promise<void> {
  log("UsernameFixWorker", "starting missing-username check");

  const users = await User.find({
    $or: [
      { username: { $exists: false } },
      { username: null },
      { username: "" },
    ],
  }).select("_id");

  if (users.length === 0) {
    log("UsernameFixWorker", "no users missing username");
    return;
  }

  let fixed = 0;
  for (const user of users) {
    try {
      const username = await generateUniqueUsername();
      await User.updateOne({ _id: user._id }, { $set: { username } });
      fixed++;
      log("UsernameFixWorker", "generated username", {
        userId: user._id.toString(),
        username,
      });
    } catch (err) {
      logError("UsernameFixWorker", "failed to generate username", err, {
        userId: user._id.toString(),
      });
    }
  }

  log("UsernameFixWorker", "completed", { total: users.length, fixed });
}

export function createUsernameFixWorker(): Worker {
  return new Worker(
    "username-fix",
    async (job) => {
      if (job.name === "fix-missing-usernames") {
        await fixMissingUsernames();
      }
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );
}

import { wsEvents } from "../../lib/wsEvents.js";
import { createNotification } from "./adminFeedNotification.service.js";
import { ImportJob } from "../../models/importJob.model.js";
import { User } from "../../models/user.model.js";
import { log } from "../../lib/logger.js";

export function initAdminNotificationListener(): void {
  wsEvents.on("import:progress", async (data) => {
    if (data.status !== "completed") return;
    try {
      const job = await ImportJob.findById(data.jobId).select("userId source progress").lean();
      if (!job) return;

      const importUser = await User.findById(job.userId).select("username").lean();
      const importUsername = importUser?.username ?? "Unknown";

      const progress = data.progress as { total?: number; matched?: number; failed?: number };
      createNotification({
        type: "import_completed",
        title: "Import completed",
        message: `Import (${job.source}) completed for ${importUsername}: ${progress.matched ?? 0} matched, ${progress.failed ?? 0} failed out of ${progress.total ?? 0} total.`,
        severity: "info",
        metadata: {
          refId: data.jobId,
          refType: "import_job",
          userId: data.userId,
          username: importUsername,
          source: job.source,
        },
      });
    } catch (err) {
      log("AdminNotificationListener", "import:progress handler error", { error: err });
    }
  });

  log("AdminNotificationListener", "listener initialized");
}

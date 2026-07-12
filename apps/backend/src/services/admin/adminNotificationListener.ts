import { wsEvents } from "../../lib/wsEvents.js";
import { createNotification } from "./adminFeedNotification.service.js";
import { ImportJob } from "../../models/importJob.model.js";
import { log } from "../../lib/logger.js";

export function initAdminNotificationListener(): void {
  wsEvents.on("import:progress", async (data) => {
    if (data.status !== "completed") return;
    try {
      const job = await ImportJob.findById(data.jobId).select("userId source progress").lean();
      if (!job) return;

      const progress = data.progress as { total?: number; matched?: number; failed?: number };
      createNotification({
        type: "import_completed",
        title: "Import completed",
        message: `Import job (${job.source}) finished: ${progress.matched ?? 0} matched, ${progress.failed ?? 0} failed out of ${progress.total ?? 0} total.`,
        severity: "info",
        metadata: {
          refId: data.jobId,
          refType: "import_job",
          userId: data.userId,
        },
      });
    } catch (err) {
      log("AdminNotificationListener", "import:progress handler error", { error: err });
    }
  });

  log("AdminNotificationListener", "listener initialized");
}

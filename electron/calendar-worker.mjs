import { parentPort, workerData } from "node:worker_threads";
import { parseCalendar } from "./calendar.mjs";
try {
  parentPort.postMessage({
    result: parseCalendar(workerData.source, workerData.options),
  });
} catch (error) {
  parentPort.postMessage({
    error: ["calendarInvalid", "calendarLimit", "calendarRange"].includes(
      error.message,
    )
      ? error.message
      : "calendarInvalid",
  });
}

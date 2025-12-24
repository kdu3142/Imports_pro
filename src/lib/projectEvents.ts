import { EventEmitter } from "events";

type ProjectEvents = "projects-updated";

declare global {
  // eslint-disable-next-line no-var
  var __projectEventBus: EventEmitter | undefined;
}

const eventBus = globalThis.__projectEventBus ?? new EventEmitter();
eventBus.setMaxListeners(0);
globalThis.__projectEventBus = eventBus;

export function notifyProjectsUpdated() {
  eventBus.emit("projects-updated");
}

export function onProjectsUpdated(handler: () => void) {
  eventBus.on("projects-updated", handler);
  return () => eventBus.off("projects-updated", handler);
}

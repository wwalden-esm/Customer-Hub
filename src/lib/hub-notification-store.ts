import { createJsonStore } from "@/lib/data-store";

export interface HubNotification {
  id: string;
  projectId: string;
  title: string;
  detail: string;
  timestamp: string;
  read: boolean;
}

const store = createJsonStore<HubNotification[]>("hub-notifications", []);

function loadNotifications(): HubNotification[] {
  return store.load();
}

function saveNotifications(notifications: HubNotification[]): void {
  store.save(notifications);
}

function generateId(): string {
  return `hn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function addHubNotification(
  projectId: string,
  title: string,
  detail: string,
): HubNotification {
  const notifications = loadNotifications();
  const notification: HubNotification = {
    id: generateId(),
    projectId,
    title,
    detail,
    timestamp: new Date().toISOString(),
    read: false,
  };
  notifications.push(notification);
  saveNotifications(notifications);
  return notification;
}

export function getProjectHubNotifications(projectId: string): HubNotification[] {
  return loadNotifications()
    .filter((n) => n.projectId === projectId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function markHubNotificationRead(notificationId: string): void {
  const notifications = loadNotifications();
  const n = notifications.find((n) => n.id === notificationId);
  if (n) {
    n.read = true;
    saveNotifications(notifications);
  }
}

export function markAllProjectNotificationsRead(projectId: string): void {
  const notifications = loadNotifications();
  let changed = false;
  for (const n of notifications) {
    if (n.projectId === projectId && !n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) {
    saveNotifications(notifications);
  }
}

export function buildEventNotification({ eventId, recipientUid, type, title, description, to, actorUid = '', createdAt = new Date().toISOString() }) {
  const safeEventId = String(eventId).replace(/[^A-Za-z0-9_-]/g, '-');
  const safeRecipient = String(recipientUid).replace(/[^A-Za-z0-9_-]/g, '-');
  return {
    id: `notification-${safeEventId}-${safeRecipient}`,
    recipientUid,
    actorUid,
    type,
    title,
    description,
    to,
    date: createdAt.slice(0, 10),
    createdAt,
    readAt: '',
  };
}

export function mergeNotifications(events, derived) {
  const byId = new Map([...events, ...derived].map(item => [item.id, item]));
  return [...byId.values()].sort((left, right) => String(right.createdAt || right.date).localeCompare(String(left.createdAt || left.date)));
}

export function mergeNotificationReadIds(currentIds = [], nextIds = []) {
  return [...new Set([...currentIds, ...nextIds].filter(Boolean).map(String))];
}

export function isNotificationRead(notification, readIds = []) {
  return Boolean(notification?.readAt) || readIds.includes(notification?.id);
}

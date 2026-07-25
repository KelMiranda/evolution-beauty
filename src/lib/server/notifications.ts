import { query, withTransaction } from './db';

export const notificationKinds = {
  facilitatorPending: 'facilitator_pending_validation',
  participantEnrolled: 'participant_enrolled',
  courseFull: 'course_full',
  duplicateInReview: 'duplicate_in_review',
  courseCompleted: 'course_completed',
} as const;

export type NotificationKind = (typeof notificationKinds)[keyof typeof notificationKinds];

export type NotificationRow = {
  id: number;
  user_id: number | null;
  audience_role: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationInput = {
  userId?: number | null;
  audienceRole?: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  payload?: Record<string, unknown> | null;
};

export async function createNotification(input: NotificationInput) {
  const result = await query<NotificationRow>(
    `INSERT INTO notifications (user_id, audience_role, kind, title, body, payload)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [input.userId ?? null, input.audienceRole ?? null, input.kind, input.title, input.body, input.payload ?? null],
  );

  return result.rows[0] ?? null;
}

export async function listNotifications(userId: number, limit = 50) {
  const result = await query<NotificationRow>(
    `SELECT * FROM notifications
     WHERE (user_id = $1 OR audience_role IS NOT NULL)
     ORDER BY read_at IS NULL DESC, created_at DESC, id DESC
     LIMIT $2`,
    [userId, limit],
  );

  return result.rows;
}

export async function markNotificationRead(id: number, userId: number) {
  const result = await query<NotificationRow>(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE id = $1 AND (user_id = $2 OR audience_role IS NOT NULL)
     RETURNING *`,
    [id, userId],
  );

  return result.rows[0] ?? null;
}

export async function notifyRoles(kind: NotificationKind, roles: string[], title: string, body: string, payload?: Record<string, unknown>) {
  return withTransaction(async (tx) => {
    const rows: NotificationRow[] = [];
    for (const role of roles) {
      const result = await tx.query<NotificationRow>(
        `INSERT INTO notifications (audience_role, kind, title, body, payload)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [role, kind, title, body, payload ?? null],
      );
      rows.push(result.rows[0]);
    }
    return rows;
  });
}

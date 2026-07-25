import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  notificationKinds,
  producerAudienceMap,
  type NotificationKind,
} from '../notifications';

const producers = [
  {
    site: new URL('../../../pages/api/public/participants.ts', import.meta.url),
    kind: notificationKinds.duplicateInReview,
    kindProperty: 'duplicateInReview',
    actor: null,
  },
  {
    site: new URL('../courses.ts', import.meta.url),
    kind: notificationKinds.courseFull,
    kindProperty: 'courseFull',
    actor: 'createdBy',
  },
  {
    site: new URL('../certificates.ts', import.meta.url),
    kind: notificationKinds.courseCompleted,
    kindProperty: 'courseCompleted',
    actor: 'completedBy',
  },
  {
    site: new URL('../participants.ts', import.meta.url),
    kind: notificationKinds.facilitatorPending,
    kindProperty: 'facilitatorPending',
    actor: 'createdBy',
  },
  {
    site: new URL('../enrollments.ts', import.meta.url),
    kind: notificationKinds.participantEnrolled,
    kindProperty: 'participantEnrolled',
    actor: 'input.enrolledBy',
  },
] as const satisfies ReadonlyArray<{
  site: URL;
  kind: NotificationKind;
  kindProperty: string;
  actor: string | null;
}>;

function notificationCall(source: string, kindProperty: string) {
  const kindMarker = `kind: notificationKinds.${kindProperty}`;
  const kindIndex = source.indexOf(kindMarker);
  const callStart = source.lastIndexOf('createNotification({', kindIndex);
  const callEnd = source.indexOf('});', kindIndex);

  expect(kindIndex, `missing ${kindMarker}`).toBeGreaterThanOrEqual(0);
  expect(callStart, `missing createNotification call for ${kindProperty}`).toBeGreaterThanOrEqual(0);
  expect(callEnd, `unterminated createNotification call for ${kindProperty}`).toBeGreaterThan(kindIndex);

  return source.slice(callStart, callEnd + 3);
}

describe('notification producer allowlist', () => {
  it('pins all five real producers to their intended audience', () => {
    expect(Object.keys(producerAudienceMap).sort()).toEqual(
      producers.map(({ kind }) => kind).sort(),
    );

    for (const producer of producers) {
      const source = readFileSync(producer.site, 'utf8');
      const call = notificationCall(source, producer.kindProperty);

      expect(call).toContain(`audienceRole: '${producerAudienceMap[producer.kind]}'`);
    }
  });

  it('wires each authenticated producer as owner and leaves the anonymous producer unset', () => {
    for (const producer of producers) {
      const source = readFileSync(producer.site, 'utf8');
      const call = notificationCall(source, producer.kindProperty);

      if (producer.actor === null) {
        expect(call).not.toMatch(/\buserId\s*:/);
      } else {
        expect(call).toContain(`userId: ${producer.actor}`);
      }
    }
  });
});

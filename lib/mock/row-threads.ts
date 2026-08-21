/**
 * MOCK row discussion threads.
 *
 * There is no notes API yet. Everything a thread shows is generated here from
 * the row itself so the same row always opens the same conversation - a thread
 * that reshuffles on every open reads as broken rather than as a prototype.
 *
 * When the real endpoint lands, replace the two exported builders with a query
 * and delete this file. Grep for THREADS_ARE_MOCK to find every dependent.
 */

import { RowData, ThreadMessage, ThreadVisibility } from '@/types';

export const THREADS_ARE_MOCK = true;

export interface ThreadPerson {
  email: string;
  name: string;
}

/**
 * The only two accounts that can post. Anyone else gets AMAN_WIP_REPLIES
 * instead of their message - see postAsGuest below.
 */
export const AMAN: ThreadPerson = { email: 'aman.singh@vamaship.com', name: 'Aman Singh' };
export const RAHUL: ThreadPerson = { email: 'rahul.sharma@vamaship.com', name: 'Rahul Sharma' };

export const THREAD_PEOPLE: ThreadPerson[] = [AMAN, RAHUL];

export function isThreadParticipant(email?: string | null): boolean {
  const needle = (email || '').trim().toLowerCase();
  return THREAD_PEOPLE.some((person) => person.email === needle);
}

export function personForEmail(email?: string | null): ThreadPerson | null {
  const needle = (email || '').trim().toLowerCase();
  return THREAD_PEOPLE.find((person) => person.email === needle) || null;
}

/**
 * Same hash as lib/config/user-avatar.ts, for the same reason: a stable value
 * per identifier that still looks arbitrary.
 */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

type ScriptLine = {
  who: 'aman' | 'rahul';
  body: string;
  /** Minutes before the page loaded. Must descend down each script. */
  minutesAgo: number;
  isEvent?: boolean;
};

// Ops banter, roughly what these threads currently look like on Slack.
const SCRIPTS: ScriptLine[][] = [
  [
    { who: 'rahul', body: "partner says 'shipment in transit' for the 4th day straight. in transit to where, Narnia?", minutesAgo: 2880 },
    { who: 'aman', body: 'lol. push it to the hub, tag me if they ghost again', minutesAgo: 2845 },
    { who: 'aman', body: 'Status changed from Open to In Progress', minutesAgo: 2840, isEvent: true },
    { who: 'rahul', body: 'hub picked it up. consignee wants delivery after 6pm only, working couple', minutesAgo: 1450 },
    { who: 'aman', body: 'noted, told the partner. if they attempt at 11am again I am going there myself', minutesAgo: 180 },
  ],
  [
    { who: 'aman', body: "consignee called 3 times saying the box was 'lightly crushed'. photo looks like it survived a stampede", minutesAgo: 4320 },
    { who: 'rahul', body: 'define lightly', minutesAgo: 4310 },
    { who: 'aman', body: 'packaging was single layer. this one is on the shipper, not the partner', minutesAgo: 4295 },
    { who: 'aman', body: 'Attachment added', minutesAgo: 4290, isEvent: true },
    { who: 'rahul', body: 'credit note raised, shipper informed. closing the loop tomorrow', minutesAgo: 900 },
  ],
  [
    { who: 'rahul', body: "NDR remark says 'consignee not reachable'. consignee sent me a screenshot of zero missed calls", minutesAgo: 5760 },
    { who: 'aman', body: 'classic. mark it fake NDR', minutesAgo: 5700 },
    { who: 'rahul', body: 'Status changed from Open to Escalated', minutesAgo: 5690, isEvent: true },
    { who: 'aman', body: 'partner sent an apology. reattempt tomorrow, first slot', minutesAgo: 2200 },
    { who: 'rahul', body: 'if this one comes back RTO I am framing it', minutesAgo: 240 },
  ],
  [
    { who: 'aman', body: 'COD remittance is 9 days late and the shipper is in my DMs every 2 hours', minutesAgo: 3200 },
    { who: 'rahul', body: 'finance says the batch got stuck. checking now', minutesAgo: 3150 },
    { who: 'rahul', body: 'Status changed from Open to In Progress', minutesAgo: 3140, isEvent: true },
    { who: 'rahul', body: 'released. credited this evening', minutesAgo: 640 },
    { who: 'aman', body: 'beautiful. blocking my calendar to celebrate', minutesAgo: 600 },
  ],
  [
    { who: 'rahul', body: "the address literally says 'near the big tree'. that is the whole address", minutesAgo: 1620 },
    { who: 'aman', body: 'which tree', minutesAgo: 1600 },
    { who: 'rahul', body: "asked. consignee said 'the big one'", minutesAgo: 1580 },
    { who: 'aman', body: 'got the pincode and a landmark on call, updated it. out for delivery now', minutesAgo: 320 },
  ],
  [
    { who: 'aman', body: 'shipment for Pune went to Patna. same first letter, different state, incredible work', minutesAgo: 7200 },
    { who: 'rahul', body: 'geography is hard', minutesAgo: 7180 },
    { who: 'aman', body: 'Status changed from Open to In Progress', minutesAgo: 7170, isEvent: true },
    { who: 'rahul', body: 'redirect raised, 2 extra days. shipper informed', minutesAgo: 4000 },
    { who: 'aman', body: 'if it turns up in Paris next we are shutting that hub down', minutesAgo: 90 },
  ],
];

/**
 * Remark columns that already hold this conversation, badly. Seeding the thread
 * from them means no row opens empty and it is obvious what the thread replaces.
 */
const REMARK_SEEDS: { columnId: string; who: 'aman' | 'rahul'; prefix: string; visibility: ThreadVisibility }[] = [
  { columnId: 'notes', who: 'rahul', prefix: '', visibility: 'internal' },
  { columnId: 'remarks', who: 'rahul', prefix: '', visibility: 'internal' },
  { columnId: 'ops_remarks', who: 'aman', prefix: 'OPS: ', visibility: 'internal' },
  { columnId: 'operations_remarks', who: 'aman', prefix: 'OPS: ', visibility: 'internal' },
  { columnId: 'partner_remarks', who: 'rahul', prefix: 'Partner said: ', visibility: 'internal' },
  { columnId: 'followup_remarks', who: 'rahul', prefix: 'Follow up: ', visibility: 'internal' },
  { columnId: 'vamaship_remarks', who: 'aman', prefix: '', visibility: 'shipper' },
];

// Fixed once per page load so a thread's timestamps do not drift between the
// grid badge and the open dialog.
const ANCHOR = Date.now();

function personFor(who: 'aman' | 'rahul'): ThreadPerson {
  return who === 'aman' ? AMAN : RAHUL;
}

function minutesAgoIso(minutes: number): string {
  return new Date(ANCHOR - minutes * 60_000).toISOString();
}

const seedCache = new Map<string, ThreadMessage[]>();

/**
 * The conversation a row starts with. Deterministic in the row id, so reopening
 * a row shows the same history.
 */
export function buildSeedThread(row: RowData): ThreadMessage[] {
  const cached = seedCache.get(row.id);
  if (cached) return cached;

  const script = SCRIPTS[hashString(row.id) % SCRIPTS.length];
  const messages: ThreadMessage[] = [];

  // Existing remark columns first - they predate the thread.
  let offset = script[0].minutesAgo + 120;
  REMARK_SEEDS.forEach((seed) => {
    const raw = row[seed.columnId];
    const body = typeof raw === 'string' ? raw.trim() : '';
    if (!body) return;

    const person = personFor(seed.who);
    messages.push({
      id: `${row.id}-seed-${seed.columnId}`,
      rowId: row.id,
      authorEmail: person.email,
      authorName: person.name,
      body: `${seed.prefix}${body}`,
      createdAt: minutesAgoIso(offset),
      kind: 'message',
      visibility: seed.visibility,
    });
    offset += 45;
  });

  script.forEach((line, index) => {
    const person = personFor(line.who);
    messages.push({
      id: `${row.id}-script-${index}`,
      rowId: row.id,
      authorEmail: person.email,
      authorName: person.name,
      body: line.isEvent ? `${line.body} by ${person.name}` : line.body,
      createdAt: minutesAgoIso(line.minutesAgo),
      kind: line.isEvent ? 'event' : 'message',
      visibility: 'internal',
    });
  });

  messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  seedCache.set(row.id, messages);
  return messages;
}

/** Cheap enough to call per visible row for the grid badge. */
export function seedThreadCount(row: RowData): number {
  return buildSeedThread(row).length;
}

/**
 * Whether a never-opened row shows the unread dot. Every seeded thread has
 * recent messages, so a plain recency test would light up the whole grid and
 * the dot would stop meaning anything. A third of the rows reads like activity.
 */
export function seedThreadIsUnread(row: RowData): boolean {
  return hashString(row.id) % 3 === 0;
}

/**
 * Posted on behalf of Aman when anyone outside THREAD_PEOPLE tries to send.
 * One line, always the same: the thread is unfinished and that is the whole
 * message.
 */
const AMAN_WIP_REPLY = 'arre bhai, this chat is still a mock.';

export function buildGuestBlockReply(rowId: string, attemptCount: number): ThreadMessage {
  return {
    id: `${rowId}-wip-${attemptCount}`,
    rowId,
    authorEmail: AMAN.email,
    authorName: AMAN.name,
    body: AMAN_WIP_REPLY,
    createdAt: new Date().toISOString(),
    kind: 'message',
    visibility: 'internal',
  };
}

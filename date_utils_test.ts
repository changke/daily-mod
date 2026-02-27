import {assertEquals} from '@std/assert';
import {getWeekInfo} from './date_utils.ts';

Deno.test('getWeekInfo - Start of Year 2024', () => {
  // Jan 1, 2024 is a Monday
  const date = new Date('2024-01-01T12:00:00Z');
  const info = getWeekInfo(date);

  assertEquals(info.weekNumber, 1);
  assertEquals(info.start, '01.01.2024'); // Monday
  assertEquals(info.end, '07.01.2024'); // Sunday

  // Verify mondayDate object
  assertEquals(info.mondayDate.toISOString().split('T')[0], '2024-01-01');
});

Deno.test('getWeekInfo - Middle of Year 2024', () => {
  // June 12, 2024 is a Wednesday
  const date = new Date('2024-06-12T12:00:00Z');
  const info = getWeekInfo(date);

  // ISO week 24
  assertEquals(info.weekNumber, 24);
  assertEquals(info.start, '10.06.2024'); // Monday
  assertEquals(info.end, '16.06.2024'); // Sunday
});

Deno.test('getWeekInfo - Year Transition (Dec 2024)', () => {
  // Dec 31, 2024 is a Tuesday.
  // This week (Dec 30 2024 - Jan 5 2025) is Week 1 of 2025 in ISO system because Thursday (Jan 2) is in 2025
  const date = new Date('2024-12-31T12:00:00Z');
  const info = getWeekInfo(date);

  assertEquals(info.weekNumber, 1);
  assertEquals(info.start, '30.12.2024');
  assertEquals(info.end, '05.01.2025');
});

Deno.test('getWeekInfo - End of Year 2023', () => {
  // Dec 31, 2023 is a Sunday.
  // It belongs to the last week of 2023 (Week 52)
  const date = new Date('2023-12-31T12:00:00Z');
  const info = getWeekInfo(date);

  assertEquals(info.weekNumber, 52);
  assertEquals(info.start, '25.12.2023');
  assertEquals(info.end, '31.12.2023');
});

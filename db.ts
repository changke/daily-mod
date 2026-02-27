import {exists} from '@std/fs';
import {join} from '@std/path';

interface Data {
  id: string;
  name: string;
  lastRotation: string; // ISO 8601 Date string (YYYY-MM-DD)
  people: string[];
}

const DATA_DIR = './data';

function getDbPath(id: string) {
  return join(DATA_DIR, `${id}.json`);
}

// Ensure Data directory exists
await Deno.mkdir(DATA_DIR, {recursive: true});

export async function createList(name: string): Promise<string> {
  const id = crypto.randomUUID();
  // Get current Monday to anchor the rotation
  // We can use Temporal directly here for clarity
  const today = Temporal.Now.plainDateISO();
  const monday = today.subtract({days: today.dayOfWeek - 1});

  const data: Data = {
    id,
    name,
    lastRotation: monday.toString(), // YYYY-MM-DD
    people: []
  };
  await saveData(id, data);
  return id;
}

export async function getLists(): Promise<{id: string; name: string}[]> {
  const lists: {id: string; name: string}[] = [];
  for await (const entry of Deno.readDir(DATA_DIR)) {
    if (entry.isFile && entry.name.endsWith('.json')) {
      const id = entry.name.replace('.json', '');
      try {
        const data = await getData(id);
        lists.push({id, name: data.name});
      } catch {
        // Ignore bad files
      }
    }
  }
  return lists;
}

export async function getData(id: string): Promise<Data> {
  const path = getDbPath(id);
  if (!(await exists(path))) {
    throw new Error(`List ${id} not found`);
  }
  const text = await Deno.readTextFile(path);
  const json = JSON.parse(text);

  // Migration: Convert numeric timestamp to ISO string
  if (typeof json.lastRotation === 'number') {
    // Old format was a timestamp.
    // We assume it represented a Monday.
    // We convert it to ISO Date.
    // Use Temporal to get the plain date from this timestamp
    // We assume the timestamp was created with setHours(0,0,0,0) which is local time usually,
    // or sometimes UTC depending on how it was called.
    // The previous getWeekInfo returned a Date object.
    // createList did: mondayDate.setHours(0,0,0,0). This sets it to local midnight.
    // So we should interpret it in local time or just take the UTC date part if we want to be safe?
    // Given the ambiguity, let's use Temporal.Instant and convert to ZonedDateTime with system timezone (or UTC if preferred).
    // Let's use UTC to be safe as that's what we likely want for "dates".
    const plainDate = Temporal.Instant.fromEpochMilliseconds(json.lastRotation)
      .toZonedDateTimeISO('UTC') // Treat as UTC to avoid timezone shifts changing the day
      .toPlainDate();

    json.lastRotation = plainDate.toString();
    // We don't save it back immediately, but it will be saved on next update.
    // Optionally we could save it now, but read should be side-effect free ideally.
  }

  return json as Data;
}

export async function saveData(id: string, data: Data) {
  await Deno.writeTextFile(getDbPath(id), JSON.stringify(data, null, 2));
}

export async function checkRotation(id: string): Promise<Data> {
  const data = await getData(id);

  // If list is empty or has 1 person, rotation doesn't change anything effectively
  // BUT we still need to update the timestamp if weeks have passed
  if (data.people.length < 2) {
    // Logic below will update timestamp even if no rotation happens
  }

  const lastRotation = Temporal.PlainDate.from(data.lastRotation);
  const today = Temporal.Now.plainDateISO();

  // Calculate days passed
  const daysPassed = lastRotation.until(today, {largestUnit: 'days'}).days;

  // If a week (or more) has passed (7 days)
  if (daysPassed >= 7) {
    const weeksPassed = Math.floor(daysPassed / 7);
    const rotationsNeeded = weeksPassed;

    // Rotate array if we have people
    const newPeople = [...data.people];
    if (newPeople.length >= 2) {
      for (let i = 0; i < rotationsNeeded; i++) {
        const person = newPeople.shift();
        if (person) newPeople.push(person);
      }
    }

    const newLastRotation = lastRotation.add({weeks: weeksPassed});

    const newData = {
      ...data,
      lastRotation: newLastRotation.toString(),
      people: newPeople
    };

    await saveData(id, newData);
    return newData;
  }

  return data;
}

export async function addPerson(id: string, name: string) {
  const data = await getData(id);
  if (!data.people.includes(name)) {
    data.people.push(name);
    await saveData(id, data);
  }
}

export async function removePerson(id: string, index: number) {
  const data = await getData(id);
  if (index >= 0 && index < data.people.length) {
    data.people.splice(index, 1);
    await saveData(id, data);
  }
}

export async function deleteList(id: string) {
  const path = getDbPath(id);
  if (await exists(path)) {
    await Deno.remove(path);
  }
}

export async function movePerson(id: string, index: number, direction: 'up' | 'down') {
  const data = await getData(id);
  if (index < 0 || index >= data.people.length) return;

  const newIndex = direction === 'up' ? index - 1 : index + 1;

  // Bounds check
  if (newIndex < 0 || newIndex >= data.people.length) return;

  // Swap
  const temp = data.people[index];
  data.people[index] = data.people[newIndex];
  data.people[newIndex] = temp;

  await saveData(id, data);
}

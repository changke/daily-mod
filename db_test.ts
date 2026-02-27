import {assert, assertEquals} from '@std/assert';
import {join} from '@std/path';
import {exists} from '@std/fs';
import {
  addPerson,
  checkRotation,
  createList,
  deleteList,
  getData,
  getLists,
  movePerson,
  removePerson,
  saveData
} from './db.ts';

const TEST_DATA_DIR = './data';

// Helper to cleanup test files
async function cleanup(id: string) {
  const path = join(TEST_DATA_DIR, `${id}.json`);
  if (await exists(path)) {
    await Deno.remove(path);
  }
}

Deno.test('db - createList and getLists', async () => {
  const name = 'Test List ' + crypto.randomUUID();
  const id = await createList(name);

  try {
    // Verify file exists
    const path = join(TEST_DATA_DIR, `${id}.json`);
    assert(await exists(path));

    // Verify it appears in getLists
    const lists = await getLists();
    const found = lists.find((l) => l.id === id);
    assert(found, 'Created list should be in getLists');
    assertEquals(found.name, name);

    // Verify data structure
    const data = await getData(id);
    assertEquals(data.id, id);
    assertEquals(data.name, name);
    assertEquals(data.people, []);
    // Verify lastRotation is a valid ISO date string (YYYY-MM-DD)
    assert(/^\d{4}-\d{2}-\d{2}$/.test(data.lastRotation));
  } finally {
    await cleanup(id);
  }
});

Deno.test('db - people operations (add, move, remove)', async () => {
  const id = await createList('People Test');

  try {
    // Add
    await addPerson(id, 'Alice');
    await addPerson(id, 'Bob');
    await addPerson(id, 'Charlie');

    let data = await getData(id);
    assertEquals(data.people, ['Alice', 'Bob', 'Charlie']);

    // Move Up (Bob up to 0)
    await movePerson(id, 1, 'up'); // Bob is at 1
    data = await getData(id);
    assertEquals(data.people, ['Bob', 'Alice', 'Charlie']);

    // Move Down (Bob down to 1)
    await movePerson(id, 0, 'down');
    data = await getData(id);
    assertEquals(data.people, ['Alice', 'Bob', 'Charlie']);

    // Remove (Bob at 1)
    await removePerson(id, 1);
    data = await getData(id);
    assertEquals(data.people, ['Alice', 'Charlie']);
  } finally {
    await cleanup(id);
  }
});

Deno.test('db - rotation logic', async () => {
  const id = await createList('Rotation Test');

  try {
    // Setup initial state
    await addPerson(id, 'Alice');
    await addPerson(id, 'Bob');
    await addPerson(id, 'Charlie');

    const initialData = await getData(id);

    // Case 1: No time passed
    // checkRotation shouldn't change anything
    await checkRotation(id);
    let data = await getData(id);
    assertEquals(data.people, ['Alice', 'Bob', 'Charlie']);
    assertEquals(data.lastRotation, initialData.lastRotation);

    // Case 2: 8 days passed (1 full week)
    // Manually set lastRotation to 8 days ago
    const today = Temporal.Now.plainDateISO();
    const eightDaysAgo = today.subtract({days: 8}).toString();

    // Inject old date
    await saveData(id, {
      ...data,
      lastRotation: eightDaysAgo
    });

    // Trigger rotation
    await checkRotation(id);

    data = await getData(id);
    // Should have rotated once: Alice moves to end
    assertEquals(data.people, ['Bob', 'Charlie', 'Alice']);

    // Last rotation should be updated to roughly now (specifically, oldRotation + 1 week)
    // The code does: lastRotation.add({weeks: weeksPassed})
    // So it should be eightDaysAgo + 1 week
    const expectedRotation = Temporal.PlainDate.from(eightDaysAgo).add({weeks: 1}).toString();
    assertEquals(data.lastRotation, expectedRotation);
  } finally {
    await cleanup(id);
  }
});

Deno.test('db - deleteList', async () => {
  const name = 'Delete Test ' + crypto.randomUUID();
  const id = await createList(name);
  const path = join(TEST_DATA_DIR, `${id}.json`);

  try {
    // Verify file exists
    assert(await exists(path));

    // Delete it
    await deleteList(id);

    // Verify it's gone
    assert(!(await exists(path)));

    // Should not throw if called again (idempotent)
    await deleteList(id);
  } finally {
    if (await exists(path)) {
      await Deno.remove(path);
    }
  }
});

Deno.test('db - getLists sorts by name', async () => {
  const suffix = crypto.randomUUID();
  const name1 = 'B List ' + suffix;
  const name2 = 'A List ' + suffix;
  const name3 = 'C List ' + suffix;
  
  const id1 = await createList(name1);
  const id2 = await createList(name2);
  const id3 = await createList(name3);

  try {
    const lists = await getLists();
    // Filter to only include our test lists
    const testLists = lists.filter(l => [name1, name2, name3].includes(l.name));
    
    assertEquals(testLists.length, 3);
    assertEquals(testLists[0].name, name2); // A
    assertEquals(testLists[1].name, name1); // B
    assertEquals(testLists[2].name, name3); // C
  } finally {
    // Cleanup
    await deleteList(id1);
    await deleteList(id2);
    await deleteList(id3);
  }
});

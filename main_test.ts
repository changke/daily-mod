import {assertEquals, assertStringIncludes} from '@std/assert';
import {join} from '@std/path';
import {exists} from '@std/fs';
import {app} from './main.ts';

const TEST_DATA_DIR = './data';
const URL_PREFIX = 'http://localhost';

// Helper to cleanup test files
async function cleanup(id: string | undefined) {
  if (!id) return;
  const path = join(TEST_DATA_DIR, `${id}.json`);
  if (await exists(path)) {
    await Deno.remove(path);
  }
}

Deno.test('main - GET / returns 200 and dashboard', async () => {
  const res = await app.fetch(new Request(`${URL_PREFIX}/`));
  assertEquals(res.status, 200);
  const text = await res.text();
  assertStringIncludes(text, 'Rotation Lists');
  assertStringIncludes(text, 'Create New List');
});

Deno.test('main - POST /create creates list and redirects', async () => {
  const form = new FormData();
  form.append('name', 'Integration Test List');
  let id: string | undefined;

  try {
    const res = await app.fetch(
      new Request(`${URL_PREFIX}/create`, {
        method: 'POST',
        body: form
      })
    );

    assertEquals(res.status, 302);
    const location = res.headers.get('location');
    assertEquals(location?.includes('/list/'), true);

    if (location) {
      id = location.split('/').pop();
    }
  } finally {
    await cleanup(id);
  }
});

Deno.test('main - GET /list/:id shows list details', async () => {
  let id: string | undefined;

  try {
    // 1. Create list
    const form = new FormData();
    form.append('name', 'Detail Test List');
    const createRes = await app.fetch(
      new Request(`${URL_PREFIX}/create`, {
        method: 'POST',
        body: form
      })
    );
    const location = createRes.headers.get('location');
    if (!location) throw new Error('No location header');

    id = location.split('/').pop();

    // 2. Get list page
    const res = await app.fetch(new Request(`${location}`));
    assertEquals(res.status, 200);
    const text = await res.text();
    assertStringIncludes(text, 'Detail Test List');
    assertStringIncludes(text, 'Rotation List');
  } finally {
    await cleanup(id);
  }
});

Deno.test('main - POST /list/:id/add adds person', async () => {
  let id: string | undefined;

  try {
    // 1. Create list
    const form = new FormData();
    form.append('name', 'Add Person Test');
    const createRes = await app.fetch(
      new Request(`${URL_PREFIX}/create`, {
        method: 'POST',
        body: form
      })
    );
    const location = createRes.headers.get('location');
    if (!location) throw new Error('No location header');

    id = location.split('/').pop();

    // 2. Add person
    const addForm = new FormData();
    addForm.append('name', 'Tester McTestface');

    const addRes = await app.fetch(
      new Request(`${location}/add`, {
        method: 'POST',
        body: addForm
      })
    );

    assertEquals(addRes.status, 302);
    assertEquals(addRes.headers.get('location'), location);

    // 3. Verify person is on page
    const pageRes = await app.fetch(new Request(location));
    const text = await pageRes.text();
    assertStringIncludes(text, 'Tester McTestface');
  } finally {
    await cleanup(id);
  }
});

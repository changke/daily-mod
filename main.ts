import {Mybe} from '@changke/mybe';
import {addPerson, checkRotation, createList, deleteList, getLists, movePerson, removePerson} from './db.ts';
import {getWeekInfo} from './date_utils.ts';

const app = new Mybe();

// Helper to render HTML
const layout = (content: string, title = 'Rotation List') =>
  String.raw`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
  <style>
    .current-person {
      text-align: center;
      padding: 2rem;
      border: 2px solid var(--pico-primary);
      border-radius: var(--pico-border-radius);
      margin-bottom: 2rem;
    }
    .current-person h2 {margin-bottom: 0.5rem;}
    .queue-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--pico-muted-border-color);
    }
    .queue-item:last-child {border-bottom: none;}
    .actions {display: flex; gap: 0.5rem;}
    .actions button {
      padding: 0.2rem 0.5rem;
      font-size: 0.8rem;
      width: auto;
      margin-bottom: 0;
    }
    .actions form {margin: 0;}
    .add-form {display: flex; gap: 1rem; margin-top: 2rem;}
    .week-info {text-align: center; margin-bottom: 2rem; font-style: italic; color: var(--pico-muted-color);}
    .back-link {margin-bottom: 1rem; display: block;}
  </style>
</head>
<body>
  <main class="container">
    ${content}
  </main>
</body>
</html>
`;

// Dashboard
app.get('/', async (ctx) => {
  const lists = await getLists();

  const listsHtml = lists.map((list) =>
    String.raw`
    <article>
      <header><a href="/list/${list.id}"><strong>${list.name}</strong></a></header>
      <small>ID: ${list.id}</small>
    </article>
  `
  ).join('');

  return ctx.html(layout(
    String.raw`
    <h1>Rotation Lists</h1>
    <div class="grid">
      ${listsHtml || '<p>No lists yet. Create one below!</p>'}
    </div>

    <article>
      <header>Create New List</header>
      <form method="POST" action="/create">
        <input type="text" name="name" placeholder="List Name (e.g., Cleaners, Standup)" required />
        <button type="submit">Create</button>
      </form>
    </article>
  `,
    'Dashboard'
  ));
});

app.post('/create', async (ctx) => {
  const body = await ctx.request.formData();
  const name = body.get('name') as string;
  if (name && name.trim()) {
    const id = await createList(name.trim());
    return ctx.redirect(`/list/${id}`);
  }
  return ctx.redirect('/');
});

// List View
app.get('/list/:id', async (ctx) => {
  const id = ctx.params.id ?? '';
  try {
    const data = await checkRotation(id);
    const weekInfo = getWeekInfo();

    const current = data.people.length > 0 ? data.people[0] : 'No one yet!';
    const nextRotation = Temporal.PlainDate.from(data.lastRotation)
      .add({days: 7})
      .toLocaleString('de-DE');

    const queueHtml = data.people.map((person, index) => {
      const isCurrent = index === 0;
      return String.raw`
        <div class="queue-item">
          <span>
            ${isCurrent ? '🎤 ' : ''}${person}
          </span>
          <div class="actions">
            <form method="POST" action="/list/${id}/action">
              <input type="hidden" name="index" value="${index}" />
              <input type="hidden" name="action" value="up" />
              <button ${index === 0 ? 'disabled' : ''}>&blacktriangle;</button>
            </form>
            <form method="POST" action="/list/${id}/action">
              <input type="hidden" name="index" value="${index}" />
              <input type="hidden" name="action" value="down" />
              <button ${index === data.people.length - 1 ? 'disabled' : ''}>&blacktriangledown;</button>
            </form>
            <form method="POST" action="/list/${id}/action" onsubmit="return confirm('Are you sure to delete this person?');">
              <input type="hidden" name="index" value="${index}" />
              <input type="hidden" name="action" value="delete" />
              <button class="secondary outline">&times;</button>
            </form>
          </div>
        </div>
      `;
    }).join('');

    return ctx.html(layout(
      String.raw`
      <a href="/" class="back-link">🔙 Back to Dashboard</a>
      <hgroup>
        <h1>${data.name}</h1>
        <p class="week-info">Week ${weekInfo.weekNumber} (${weekInfo.start} - ${weekInfo.end})</p>
      </hgroup>

      <div class="current-person">
        <small>Current Pick 👇</small>
        <h2>${current}</h2>
        <small>Next rotation: ${nextRotation}</small>
      </div>

      <article>
        <header>Rotation List</header>
        ${queueHtml || '<p>List is empty.</p>'}
      </article>

      <form class="add-form" method="POST" action="/list/${id}/add">
        <input type="text" name="name" placeholder="Name" required />
        <button type="submit">Add Person</button>
      </form>

      <details>
        <summary style="margin-top: 2rem; color: var(--pico-muted-color); cursor: pointer;">Danger Zone</summary>
        <form method="POST" action="/list/${id}/delete" onsubmit="return confirm('Are you sure you want to delete this ENTIRE list? This cannot be undone.');">
          <button type="submit" class="contrast outline">Delete List</button>
        </form>
      </details>
    `,
      data.name
    ));
  } catch (_e) {
    return new Response('List not found', {status: 404});
  }
});

app.post('/list/:id/add', async (ctx) => {
  const id = ctx.params.id ?? '';
  const body = await ctx.request.formData();
  const name = body.get('name') as string;
  if (name && name.trim()) {
    await addPerson(id, name.trim());
  }
  return ctx.redirect(`/list/${id}`);
});

app.post('/list/:id/action', async (ctx) => {
  const id = ctx.params.id ?? '';
  const body = await ctx.request.formData();
  const index = parseInt(body.get('index') as string);
  const action = body.get('action') as string;

  if (!isNaN(index)) {
    if (action === 'delete') {
      await removePerson(id, index);
    } else if (action === 'up') {
      await movePerson(id, index, 'up');
    } else if (action === 'down') {
      await movePerson(id, index, 'down');
    }
  }
  return ctx.redirect(`/list/${id}`);
});

app.post('/list/:id/delete', async (ctx) => {
  const id = ctx.params.id ?? '';
  await deleteList(id);
  return ctx.redirect('/');
});

if (import.meta.main) {
  app.listen({port: 8000});
}

export {app}; // for testing purposes

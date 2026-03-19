/* eslint-disable no-console */
// Playground demo - fetch mock API endpoints

async function demo() {
  console.log('--- vite-plugin-better-mock-server playground ---\n')

  // GET /api/users
  const users = await fetch('/api/users').then((r) => r.json())
  console.log('GET /api/users:', users)

  // GET /api/users/1
  const user = await fetch('/api/users/1').then((r) => r.json())
  console.log('GET /api/users/1:', user)

  // POST /api/login
  const login = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: '123' })
  }).then((r) => r.json())
  console.log('POST /api/login:', login)

  // GET /api/me
  const me = await fetch('/api/me').then((r) => r.json())
  console.log('GET /api/me:', me)

  // --- Todos (h3 API demo) ---
  console.log('\n--- Todos API (h3) ---\n')

  // GET /api/todos
  const todos = await fetch('/api/todos').then((r) => r.json())
  console.log('GET /api/todos:', todos)

  // GET /api/todos?completed=false
  const pending = await fetch('/api/todos?completed=false').then((r) =>
    r.json()
  )
  console.log('GET /api/todos?completed=false:', pending)

  // POST /api/todos
  const created = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Try h3 APIs' })
  })
  console.log('POST /api/todos:', created.status, await created.json())

  // PATCH /api/todos/2
  const updated = await fetch('/api/todos/2', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true })
  }).then((r) => r.json())
  console.log('PATCH /api/todos/2:', updated)

  // DELETE /api/todos/1
  const deleted = await fetch('/api/todos/1', { method: 'DELETE' })
  console.log('DELETE /api/todos/1:', deleted.status)

  // GET /api/todos (after mutations)
  const final = await fetch('/api/todos').then((r) => r.json())
  console.log('GET /api/todos (final):', final)
}

demo().catch(console.error)

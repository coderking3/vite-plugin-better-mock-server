import { getQuery, getRouterParam, noContent, readBody } from 'h3'

import { defineRoutes } from '../../src/index'

// In-memory store
const todos = [
  { id: 1, title: 'Learn h3', completed: true },
  { id: 2, title: 'Build mock server', completed: false },
  { id: 3, title: 'Write tests', completed: false }
]
let nextId = 4

export default defineRoutes({
  '/todos': {
    // GET /api/todos?completed=true
    GET: (event) => {
      const query = getQuery(event)
      if (query.completed !== undefined) {
        const completed = query.completed === 'true'
        return todos.filter((t) => t.completed === completed)
      }
      return todos
    },
    // POST /api/todos  { title: "..." }
    POST: async (event) => {
      const body = await readBody<{ title: string }>(event)
      if (!body?.title) {
        event.res.status = 400
        return { error: 'title is required' }
      }
      const todo = { id: nextId++, title: body.title, completed: false }
      todos.push(todo)
      event.res.status = 201
      return todo
    }
  },
  '/todos/:id': {
    // GET /api/todos/1
    GET: (event) => {
      const id = Number(getRouterParam(event, 'id'))
      const todo = todos.find((t) => t.id === id)
      if (!todo) {
        event.res.status = 404
        return { error: 'Todo not found' }
      }
      return todo
    },
    // PATCH /api/todos/1  { completed: true }
    PATCH: async (event) => {
      const id = Number(getRouterParam(event, 'id'))
      const todo = todos.find((t) => t.id === id)
      if (!todo) {
        event.res.status = 404
        return { error: 'Todo not found' }
      }
      const body =
        await readBody<Partial<{ title: string; completed: boolean }>>(event)
      if (body) Object.assign(todo, body)
      return todo
    },
    // DELETE /api/todos/1
    DELETE: (event) => {
      const id = Number(getRouterParam(event, 'id'))
      const index = todos.findIndex((t) => t.id === id)
      if (index === -1) {
        event.res.status = 404
        return { error: 'Todo not found' }
      }
      todos.splice(index, 1)
      return noContent()
    }
  }
})

import { defineRoutes } from '../../src/index'

export default defineRoutes({
  '/users': {
    GET: () => [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' }
    ],
    POST: (_event) => ({
      id: 3,
      name: 'New User',
      message: 'User created'
    })
  },
  '/users/:id': {
    GET: (event) => ({
      id: event.context.params?.id,
      name: 'Alice',
      email: 'alice@example.com'
    }),
    PUT: (event) => ({
      id: event.context.params?.id,
      message: 'User updated'
    }),
    DELETE: (event) => ({
      id: event.context.params?.id,
      message: 'User deleted'
    })
  }
})

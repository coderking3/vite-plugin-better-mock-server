import { defineRoutes } from '../../src/index'

export default defineRoutes({
  '/login': {
    POST: () => ({
      token: 'mock-jwt-token-12345',
      expiresIn: 3600
    })
  },
  '/logout': {
    POST: () => ({
      message: 'Logged out successfully'
    })
  },
  '/me': {
    GET: () => ({
      id: 1,
      name: 'King3',
      email: 'king3.wm@gmail.com',
      role: 'admin'
    })
  }
})

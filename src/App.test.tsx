import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { useAuthStore } from './store/useAuthStore'
import { useDeviceStore } from './store/useDeviceStore'
import App from './App'

describe('App', () => {
  it('shows the public landing page to an unauthenticated visitor with no device binding', async () => {
    window.history.pushState({}, '', '/')
    useAuthStore.setState({ session: null, initialized: true })
    useDeviceStore.setState({ boundStoreId: null })

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('link', { name: /comenzar ahora/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ya tengo cuenta/i })).toBeInTheDocument()
  })

  it('shows the owner login form at /login', async () => {
    window.history.pushState({}, '', '/login')
    useAuthStore.setState({ session: null, initialized: true })
    useDeviceStore.setState({ boundStoreId: null })

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('button', { name: /entrar/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
  })

  it('redirects an unauthenticated visitor whose device is bound to a store to the PIN pad', async () => {
    window.history.pushState({}, '', '/')
    useAuthStore.setState({ session: null, initialized: true })
    useDeviceStore.setState({ boundStoreId: 'a1111111-1111-1111-1111-111111111111' })

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/ingresa tu pin de empleado/i)).toBeInTheDocument()
  })
})

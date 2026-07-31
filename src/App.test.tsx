import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { useAuthStore } from './store/useAuthStore'
import { useDeviceStore } from './store/useDeviceStore'
import App from './App'

describe('App', () => {
  it('redirects an unauthenticated visitor with no device binding to the owner login', async () => {
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

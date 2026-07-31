import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../../lib/queryClient'
import { LoginPage } from './LoginPage'

function renderLoginPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  it('renders the SpiderPOS brand and the owner login form', () => {
    renderLoginPage()

    expect(screen.getAllByText('POS').length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('shows validation errors for an invalid email and short password', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/correo electrónico/i), 'no-es-un-correo')
    await user.type(screen.getByLabelText(/contraseña/i), '123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByText(/correo válido/i)).toBeInTheDocument()
    expect(await screen.findByText(/al menos 6 caracteres/i)).toBeInTheDocument()
  })
})

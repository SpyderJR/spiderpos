import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import App from './App'

describe('App', () => {
  it('renders the SpiderPOS brand shell', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    )

    expect(screen.getAllByText('POS').length).toBeGreaterThan(0)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cambiar a modo/i })).toBeInTheDocument()
  })
})

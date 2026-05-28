import { type ReactElement } from 'react'
import { render, type RenderResult } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'

export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>,
  )
}

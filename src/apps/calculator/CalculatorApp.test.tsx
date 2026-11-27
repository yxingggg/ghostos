import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalculatorApp } from './CalculatorApp';

describe('CalculatorApp (component)', () => {
  it('computes via button clicks', async () => {
    const user = userEvent.setup();
    render(<CalculatorApp windowId="w1" />);
    await user.click(screen.getByRole('button', { name: '7' }));
    await user.click(screen.getByRole('button', { name: '+' }));
    await user.click(screen.getByRole('button', { name: '8' }));
    await user.click(screen.getByRole('button', { name: '=' }));
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('shows Error on divide by zero', async () => {
    const user = userEvent.setup();
    render(<CalculatorApp windowId="w1" />);
    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: '÷' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '=' }));
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});

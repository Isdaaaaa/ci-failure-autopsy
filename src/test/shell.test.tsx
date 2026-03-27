import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Shell from '@/components/shell';

describe('Shell', () => {
  it('renders key placeholder panels', () => {
    render(<Shell />);

    expect(screen.getByText('Log Input')).toBeInTheDocument();
    expect(screen.getByText('Timeline Placeholder')).toBeInTheDocument();
    expect(screen.getByText('Signature Cards')).toBeInTheDocument();
    expect(screen.getByText('Fix Checklist')).toBeInTheDocument();
    expect(screen.getByText('PR Plan Box')).toBeInTheDocument();
  });
});

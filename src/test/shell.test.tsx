import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Shell from '@/components/shell';

describe('Shell', () => {
  it('renders key ingestion panels', () => {
    render(<Shell />);

    expect(screen.getByText('Log Input')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Signature Cards')).toBeInTheDocument();
    expect(screen.getByText('Fix Checklist')).toBeInTheDocument();
    expect(screen.getByText('PR Plan Box')).toBeInTheDocument();
  });

  it('updates parse output when logs are pasted', () => {
    render(<Shell />);

    const input = screen.getByPlaceholderText('Paste CI logs here…');
    fireEvent.change(input, {
      target: {
        value: '##[group]Build\nRun npm test\nError: suite failed'
      }
    });

    expect(screen.getByText(/3 lines parsed/i)).toBeInTheDocument();
    expect(screen.getByText(/stage: build/i)).toBeInTheDocument();
    expect(screen.getByText(/confidence 68% · line 1/i)).toBeInTheDocument();
  });
});

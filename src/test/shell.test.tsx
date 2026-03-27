import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Shell from '@/components/shell';

describe('Shell', () => {
  it('renders key ingestion panels', () => {
    render(<Shell />);

    expect(screen.getByText('Log Input')).toBeInTheDocument();
    expect(screen.getByText('Timeline + Evidence')).toBeInTheDocument();
    expect(screen.getByText('Signature Cards')).toBeInTheDocument();
    expect(screen.getByText('Fix Checklist')).toBeInTheDocument();
    expect(screen.getByText('PR Plan Box')).toBeInTheDocument();
  });

  it('renders timeline badges and evidence excerpts from parsed output', () => {
    render(<Shell />);

    const input = screen.getByPlaceholderText('Paste CI logs here…');
    fireEvent.change(input, {
      target: {
        value: [
          '##[group]Install deps',
          'npm ci',
          '##[error]npm ERR! code ERESOLVE',
          '##[group]Run tests',
          'npm test',
          'Error: expected true to be false'
        ].join('\n')
      }
    });

    expect(screen.getByText(/6 lines parsed/i)).toBeInTheDocument();
    expect(screen.getByText('STEP 01')).toBeInTheDocument();
    expect(screen.getByText('STEP 02')).toBeInTheDocument();

    const installEvidence = screen.getByLabelText('Evidence for Install deps');
    expect(within(installEvidence).getByText(/line 3/i)).toBeInTheDocument();
    expect(within(installEvidence).getByText(/npm ERR! code ERESOLVE/i)).toBeInTheDocument();

    const testEvidence = screen.getByLabelText('Evidence for Run tests');
    expect(within(testEvidence).getByText(/line 6/i)).toBeInTheDocument();
    expect(within(testEvidence).getByText(/expected true to be false/i)).toBeInTheDocument();
  });

  it('resets to empty timeline state when payload is cleared', () => {
    render(<Shell />);

    const input = screen.getByPlaceholderText('Paste CI logs here…');
    fireEvent.change(input, {
      target: {
        value: '##[group]Build\nRun npm test\nError: suite failed'
      }
    });

    fireEvent.click(screen.getByRole('button', { name: /clear payload/i }));

    expect(screen.getByText('No timeline yet')).toBeInTheDocument();
    expect(screen.getByText(/waiting for incident payload/i)).toBeInTheDocument();
  });
});

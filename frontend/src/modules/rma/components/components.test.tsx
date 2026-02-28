import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminToolsNav } from './AdminToolsNav';
import { TimeoutPicker, formatHours } from './TimeoutPicker';

describe('AdminToolsNav', () => {
  it('renders all nav links', () => {
    render(
      <MemoryRouter initialEntries={['/rma/admin']}>
        <AdminToolsNav />
      </MemoryRouter>,
    );
    expect(screen.getByText('Admin Tools')).toBeInTheDocument();
    expect(screen.getByText('📊 Dashboard')).toBeInTheDocument();
    expect(screen.getByText('📋 Manage RMAs')).toBeInTheDocument();
    expect(screen.getByText('⚙️ Stale Config')).toBeInTheDocument();
  });

  it('links point to correct paths', () => {
    render(
      <MemoryRouter initialEntries={['/rma/admin']}>
        <AdminToolsNav />
      </MemoryRouter>,
    );
    expect(screen.getByText('📊 Dashboard').closest('a')).toHaveAttribute('href', '/rma/admin');
    expect(screen.getByText('📋 Manage RMAs').closest('a')).toHaveAttribute(
      'href',
      '/rma/admin/rmas',
    );
    expect(screen.getByText('⚙️ Stale Config').closest('a')).toHaveAttribute(
      'href',
      '/rma/admin/config',
    );
  });
});

describe('TimeoutPicker', () => {
  it('renders presets', () => {
    render(<TimeoutPicker initialHours={24} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: '4h' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1w' })).toBeInTheDocument();
  });

  it('displays selected preset', () => {
    render(<TimeoutPicker initialHours={24} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Selected:/)).toBeInTheDocument();
  });

  it('calls onSave with selected hours', () => {
    const onSave = vi.fn();
    render(<TimeoutPicker initialHours={24} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('48h' in {} ? '48h' : '2d'));
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith(48);
  });

  it('calls onCancel', () => {
    const onCancel = vi.fn();
    render(<TimeoutPicker initialHours={24} onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows custom input when Custom clicked', () => {
    render(<TimeoutPicker initialHours={24} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('Custom'));
    expect(screen.getByPlaceholderText('Hours')).toBeInTheDocument();
  });

  it('does not save when hours is 0', () => {
    const onSave = vi.fn();
    render(<TimeoutPicker initialHours={24} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('Custom'));
    fireEvent.change(screen.getByPlaceholderText('Hours'), { target: { value: '0' } });
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('formatHours', () => {
  it('formats hours', () => {
    expect(formatHours(4)).toBe('4h');
  });

  it('formats days', () => {
    expect(formatHours(48)).toBe('2d');
  });

  it('formats weeks', () => {
    expect(formatHours(168)).toBe('1w');
  });

  it('falls back to hours for non-clean division', () => {
    expect(formatHours(30)).toBe('30h');
  });
});

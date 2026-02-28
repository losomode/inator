import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api', () => ({
  attachmentsApi: { list: vi.fn(), upload: vi.fn(), delete: vi.fn() },
}));

import { attachmentsApi } from '../api';
import { AttachmentList } from './AttachmentList';
import type { Attachment } from '../types';

const mockAttachment: Attachment = {
  id: 1,
  filename: 'invoice.pdf',
  file: '/media/invoice.pdf',
  file_size: 2048,
  content_type: 'PO',
  object_id: 1,
  uploaded_at: '2025-01-15T12:00:00Z',
  uploaded_by_user_id: 'admin',
  file_extension: '.pdf',
  file_size_mb: 0.002,
  is_pdf: true,
  is_image: false,
  is_spreadsheet: false,
};

beforeEach(() => vi.clearAllMocks());

describe('AttachmentList', () => {
  it('renders loading state then attachments', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([mockAttachment]);
    render(<AttachmentList contentType="PO" objectId={1} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('invoice.pdf')).toBeInTheDocument());
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([]);
    render(<AttachmentList contentType="PO" objectId={1} />);
    await waitFor(() => expect(screen.getByText('No attachments')).toBeInTheDocument());
  });

  it('shows upload button when not readOnly', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([]);
    render(<AttachmentList contentType="PO" objectId={1} />);
    await waitFor(() => expect(screen.getByText('Upload File')).toBeInTheDocument());
  });

  it('hides upload button when readOnly', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([]);
    render(<AttachmentList contentType="PO" objectId={1} readOnly />);
    await waitFor(() => expect(screen.getByText('No attachments')).toBeInTheDocument());
    expect(screen.queryByText('Upload File')).not.toBeInTheDocument();
  });

  it('handles delete', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([mockAttachment]);
    vi.mocked(attachmentsApi.delete).mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    render(<AttachmentList contentType="PO" objectId={1} />);
    await waitFor(() => expect(screen.getByTitle('Delete attachment')).toBeInTheDocument());
    await userEvent.click(screen.getByTitle('Delete attachment'));
    expect(attachmentsApi.delete).toHaveBeenCalledWith(1);
  });

  it('shows error on load failure', async () => {
    vi.mocked(attachmentsApi.list).mockRejectedValue(new Error('fail'));
    render(<AttachmentList contentType="ORDER" objectId={2} />);
    await waitFor(() => expect(screen.getByText('Failed to load attachments')).toBeInTheDocument());
  });

  it('hides delete button when readOnly', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([mockAttachment]);
    render(<AttachmentList contentType="PO" objectId={1} readOnly />);
    await waitFor(() => expect(screen.getByText('invoice.pdf')).toBeInTheDocument());
    expect(screen.queryByTitle('Delete attachment')).not.toBeInTheDocument();
  });

  it('shows image icon for images', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([
      { ...mockAttachment, is_pdf: false, is_image: true },
    ]);
    render(<AttachmentList contentType="PO" objectId={1} />);
    await waitFor(() => expect(screen.getByText('🖼️')).toBeInTheDocument());
  });

  it('shows spreadsheet icon for spreadsheets', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([
      { ...mockAttachment, is_pdf: false, is_spreadsheet: true },
    ]);
    render(<AttachmentList contentType="PO" objectId={1} />);
    await waitFor(() => expect(screen.getByText('📊')).toBeInTheDocument());
  });

  it('shows generic icon for other files', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([
      { ...mockAttachment, is_pdf: false, is_image: false, is_spreadsheet: false },
    ]);
    render(<AttachmentList contentType="PO" objectId={1} />);
    await waitFor(() => expect(screen.getByText('📎')).toBeInTheDocument());
  });

  it('formats large file sizes', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([{ ...mockAttachment, file_size: 500 }]);
    render(<AttachmentList contentType="PO" objectId={1} />);
    await waitFor(() => expect(screen.getByText(/500 B/)).toBeInTheDocument());
  });

  it('formats MB file sizes', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([
      { ...mockAttachment, file_size: 2 * 1024 * 1024 },
    ]);
    render(<AttachmentList contentType="PO" objectId={1} />);
    await waitFor(() => expect(screen.getByText(/2\.0 MB/)).toBeInTheDocument());
  });

  it('handles upload', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([]);
    vi.mocked(attachmentsApi.upload).mockResolvedValue(undefined);
    render(<AttachmentList contentType="PO" objectId={1} />);
    await waitFor(() => expect(screen.getByText('Upload File')).toBeInTheDocument());
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    await userEvent.upload(input, file);
    expect(attachmentsApi.upload).toHaveBeenCalledWith('PO', 1, file);
  });

  it('shows upload error', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([]);
    vi.mocked(attachmentsApi.upload).mockRejectedValue({
      response: { data: { detail: 'Too large' } },
    });
    render(<AttachmentList contentType="PO" objectId={1} />);
    await waitFor(() => expect(screen.getByText('Upload File')).toBeInTheDocument());
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    await userEvent.upload(input, file);
    await waitFor(() => expect(screen.getByText('Too large')).toBeInTheDocument());
  });

  it('shows delete error', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([mockAttachment]);
    vi.mocked(attachmentsApi.delete).mockRejectedValue({
      response: { data: { detail: 'Cannot delete' } },
    });
    window.confirm = vi.fn(() => true);
    render(<AttachmentList contentType="PO" objectId={1} />);
    await waitFor(() => expect(screen.getByTitle('Delete attachment')).toBeInTheDocument());
    await userEvent.click(screen.getByTitle('Delete attachment'));
    await waitFor(() => expect(screen.getByText('Cannot delete')).toBeInTheDocument());
  });

  it('cancels delete when not confirmed', async () => {
    vi.mocked(attachmentsApi.list).mockResolvedValue([mockAttachment]);
    window.confirm = vi.fn(() => false);
    render(<AttachmentList contentType="PO" objectId={1} />);
    await waitFor(() => expect(screen.getByTitle('Delete attachment')).toBeInTheDocument());
    await userEvent.click(screen.getByTitle('Delete attachment'));
    expect(attachmentsApi.delete).not.toHaveBeenCalled();
  });
});

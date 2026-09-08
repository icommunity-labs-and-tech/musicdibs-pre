import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepTitle } from './StepTitle';
import type { WizardData } from './types';

const mockData: WizardData = {
  flow: 'new',
  parentWorkId: null,
  parentWorkTitle: null,
  file: null,
  files: [],
  aiAudioUrl: null,
  title: '',
  workType: '',
  description: '',
  versionType: '',
  versionTitle: '',
  creators: [],
  signatureId: '',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('./useWizardLabels', () => ({
  useWorkTypeLabels: () => ({
    audio: 'Canción',
    instrumental: 'Instrumental',
    document: 'Letra',
    demo: 'Demo',
    videoclip: 'Videoclip',
    cover_art: 'Portada de disco',
    other: 'Otro',
  }),
}));

describe('StepTitle', () => {
  it('sanitizes pasted multiline text and truncates to 200 characters', () => {
    const onUpdate = vi.fn();
    render(<StepTitle data={mockData} onUpdate={onUpdate} onNext={vi.fn()} onBack={vi.fn()} />);

    const input = screen.getByPlaceholderText('wizard.stepTitle.titlePlaceholder');
    const longText = 'A\nB\r\nC '.repeat(100); // ~500 chars with newlines
    fireEvent.change(input, { target: { value: longText } });

    expect(onUpdate).toHaveBeenCalled();
    const updatedTitle = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0].title;

    expect(updatedTitle).not.toContain('\n');
    expect(updatedTitle).not.toContain('\r');
    expect(updatedTitle.length).toBeLessThanOrEqual(200);
  });

  it('keeps short single-line titles unchanged', () => {
    const onUpdate = vi.fn();
    render(<StepTitle data={mockData} onUpdate={onUpdate} onNext={vi.fn()} onBack={vi.fn()} />);

    const input = screen.getByPlaceholderText('wizard.stepTitle.titlePlaceholder');
    fireEvent.change(input, { target: { value: 'La cumbia mexicana' } });

    expect(onUpdate).toHaveBeenCalledWith({ title: 'La cumbia mexicana' });
  });
});

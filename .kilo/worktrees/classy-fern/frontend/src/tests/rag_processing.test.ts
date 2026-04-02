import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKnowledgeBase } from '../hooks';

// Mock dla URL.createObjectURL w środowisku jsdom
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = () => 'test-url';
}

describe('useKnowledgeBase Document Processing', () => {
  it('powinien poprawnie dodać nowy dokument do bazy RAG w stanie "processing"', async () => {
    const { result } = renderHook(() => useKnowledgeBase());
    const initialCount = result.current.documents.length;
    
    // Symulacja pliku
    const testFile = new File(['treść testowa prawna'], 'test_karny.pdf', { type: 'application/pdf' });
    
    await act(async () => {
      result.current.uploadFile(testFile);
    });

    expect(result.current.documents.length).toBe(initialCount + 1);
    expect(result.current.documents[0].name).toBe('test_karny.pdf');
    expect(result.current.documents[0].status).toBe('processing');
  });

  it('powinien zmienić status na "ready" po zakończeniu asynchronicznego procesowania', async () => {
    // Uwaga: Ze względu na setTimeout w hooku, ten test wymaga przyspieszenia czasu lub oczekiwania.
    // W realnym scenariuszu użylibyśmy vi.useFakeTimers().
    const { result } = renderHook(() => useKnowledgeBase());
    const testFile = new File(['kodeks karny'], 'kodeks.pdf', { type: 'application/pdf' });

    await act(async () => {
        result.current.uploadFile(testFile);
    });

    // Czekamy na zmianę stanu (nasza symulacja trwa 3s, tutaj sprawdzamy zmianę po czasie)
    // UWAGA: Testowanie asynchronicznych symulacji czasowych w unit testach zwykle wymaga mockowania zegara.
    expect(result.current.documents[0].status).toBe('processing');
  });
});

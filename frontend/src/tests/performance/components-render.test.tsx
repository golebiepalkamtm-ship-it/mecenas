import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock Hooks before components are imported
vi.mock('../../context/useSharedChat', () => ({
  useSharedChat: () => ({
    messages: [],
    setMessages: vi.fn(),
    sessions: [],
    sessionId: "",
    setSessionId: vi.fn(),
    newChat: vi.fn(),
    switchSession: vi.fn(),
    removeSession: vi.fn(),
    fetchSessions: vi.fn(),
    messagesLoaded: true
  })
}));

vi.mock('../../hooks/useChatMutation', () => ({
  useChatMutation: () => ({
    mutate: vi.fn(),
    isLoading: false
  })
}));

vi.mock('../../hooks', () => ({
  useKnowledgeBase: () => ({
    documents: [],
    uploadPDF: vi.fn(),
    removeFile: vi.fn(),
    isUploading: false
  }),
  useUserLibrary: () => ({
    documents: [],
    removeDocument: vi.fn()
  })
}));

import { Sidebar } from '../../components/Layout/Sidebar';
import { ChatView as Chat } from '../../components/Chat';
import { KnowledgeView as Knowledge } from '../../components/Knowledge';
import { DocumentsView as Documents } from '../../components/Documents';
import { SettingsView as Settings } from '../../components/Settings';
import type { NavItem, Tab } from '../../types/navigation';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('Komponenty - Testy wydajności renderowania', () => {
  const COMPONENT_THRESHOLD = 250; // ms
  const STRESS_ITERATIONS = 20;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollTo which is not implemented in JSDOM
    window.HTMLDivElement.prototype.scrollTo = vi.fn();
  });

  const testComponentRender = <P extends object>(name: string, Component: React.ComponentType<P>, props: P = {} as P) => {
    it(`powinien renderować ${name} w akceptowalnym czasie`, () => {
      const start = performance.now();
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <Component {...props} />
        </QueryClientProvider>
      );
      const end = performance.now();
      const renderTime = end - start;

      console.log(`${name}: ${renderTime.toFixed(2)}ms`);
      
      expect(renderTime).toBeLessThan(COMPONENT_THRESHOLD);
      expect(container).toBeTruthy();
    });
  };

  const sidebarProps: React.ComponentProps<typeof Sidebar> = {
    navItems: [] as NavItem[],
    activeTab: 'chat' as Tab,
    onTabChange: vi.fn(),
    onLogout: vi.fn(),
    userRole: 'user'
  };

  // Testy poszczególnych komponentów
  testComponentRender('Sidebar', Sidebar, sidebarProps);
  testComponentRender('Chat', Chat);
  testComponentRender('Knowledge', Knowledge);
  testComponentRender('Documents', Documents);
  testComponentRender('Settings', Settings);

  it('powinien stabilnie renderować komponenty przy wielokrotnym wywołaniu', async () => {
    const components: { name: string; Component: React.ElementType; props: Record<string, unknown> }[] = [
      { name: 'Sidebar', Component: Sidebar, props: sidebarProps as unknown as Record<string, unknown> },
      { name: 'Chat', Component: Chat, props: {} },
      { name: 'Knowledge', Component: Knowledge, props: {} },
    ];

    for (const { name, Component, props } of components) {
      const times: number[] = [];
      
      for (let i = 0; i < STRESS_ITERATIONS; i++) {
        const start = performance.now();
        const { unmount } = render(
          <QueryClientProvider client={queryClient}>
            <Component {...(props as Record<string, unknown>)} />
          </QueryClientProvider>
        );
        const end = performance.now();
        
        times.push(end - start);
        unmount();
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);

      console.log(`${name} (${STRESS_ITERATIONS}x):`);
      console.log(`  Średnia: ${avg.toFixed(2)}ms`);
      console.log(`  Maksimum: ${max.toFixed(2)}ms`);

      expect(avg).toBeLessThan(COMPONENT_THRESHOLD);
      expect(max).toBeLessThan(COMPONENT_THRESHOLD * 2);
    }
  });
});

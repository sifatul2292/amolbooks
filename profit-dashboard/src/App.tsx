import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDateRange } from './hooks/useDateRange';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Dashboard } from './pages/Dashboard';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const { range, applyPreset, applyCustom } = useDateRange();

  return (
    <QueryClientProvider client={qc}>
      <div className="flex min-h-screen bg-[#0f1117]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar range={range} onPreset={applyPreset} onCustom={applyCustom} />
          <Dashboard range={range} />
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;

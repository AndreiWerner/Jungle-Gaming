import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { SessionProvider } from './session'
import { RealtimeProvider } from '@/features/realtime/RealtimeProvider'
import { createAppRouter } from './router'
import { ApiError } from '@/lib/errors'

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // não repete erros de cliente (4xx); repete falhas transitórias uma vez
        retry: (count, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && count < 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function App() {
  const [client] = useState(makeClient)
  const [router] = useState(() => createAppRouter(client))
  return (
    <QueryClientProvider client={client}>
      <SessionProvider>
        <RealtimeProvider>
          <RouterProvider router={router} />
        </RealtimeProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}

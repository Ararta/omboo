import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { decodeSession, getAccessToken, type SessionPayload } from "./session";

interface SessionContextValue {
  session: SessionPayload | null;
  ready: boolean;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  ready: false,
  refreshSession: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [ready, setReady] = useState(false);

  async function refreshSession() {
    const token = await getAccessToken();
    setSession(decodeSession(token));
  }

  useEffect(() => {
    refreshSession().finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SessionContext.Provider value={{ session, ready, refreshSession }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}

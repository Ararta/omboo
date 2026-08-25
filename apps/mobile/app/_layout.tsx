import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../lib/session-context";

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Slot />
    </SessionProvider>
  );
}

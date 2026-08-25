import { Redirect, Stack } from "expo-router";
import { useSession } from "../../lib/session-context";
import { colors } from "../../lib/theme";

export default function DirectorLayout() {
  const { session, ready } = useSession();
  if (!ready) return null;
  if (!session) return <Redirect href="/login" />;
  if (session.role !== "DIRECTOR") return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTitleStyle: { color: colors.ink },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Հաստատման սպասող" }} />
    </Stack>
  );
}

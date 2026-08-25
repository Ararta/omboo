import { Redirect, Stack } from "expo-router";
import { useSession } from "../../lib/session-context";
import { colors } from "../../lib/theme";

export default function EmployeeLayout() {
  const { session, ready } = useSession();
  if (!ready) return null;
  if (!session) return <Redirect href="/login" />;
  if (session.role !== "EMPLOYEE") return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTitleStyle: { color: colors.ink },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Իմ հայտ-դիմումները" }} />
      <Stack.Screen name="new-request" options={{ title: "Նոր հայտ-դիմում", presentation: "modal" }} />
      <Stack.Screen name="request/[id]" options={{ title: "Հայտ-դիմում" }} />
    </Stack>
  );
}

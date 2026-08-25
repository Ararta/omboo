import { Redirect } from "expo-router";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useSession } from "../lib/session-context";
import { colors } from "../lib/theme";

// Mirrors apps/web's middleware.ts role-gating — no server middleware exists on native, so
// this client-side redirect is the equivalent entry point. HR has no mobile screens yet
// (see reference/mrk_prototype_1.jsx scope note in the build plan) — an HR login here just
// stays on /login with a message, directing them to the web app.
export default function Index() {
  const { session, ready } = useSession();

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.seal} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;
  if (session.role === "EMPLOYEE") return <Redirect href="/employee" />;
  if (session.role === "DIRECTOR") return <Redirect href="/director" />;
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
});

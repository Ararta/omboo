import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import {
  addDaysISO,
  businessDays,
  MIN_CHUNK_DAYS,
  REQUEST_TYPE_LABELS,
  todayInYerevan,
  validateSubmitRequest,
  type CreateRequestInput,
  type RequestType,
} from "@omboo/shared";
import { api, ApiError } from "../../lib/api-client";
import { Button } from "../../components/ui/Button";
import { colors } from "../../lib/theme";
import type { EmployeeView, RequestView } from "../../lib/types";

export default function NewRequestScreen() {
  const router = useRouter();
  const [type, setType] = useState<RequestType>("VACATION");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const days = useMemo(() => businessDays(start, end), [start, end]);
  const minStart = type === "VACATION" ? addDaysISO(todayInYerevan(), 5) : todayInYerevan();

  async function submit() {
    setError("");
    if (!start || !end || days <= 0) {
      setError("Ընտրեք վավեր ամսաթվեր (YYYY-MM-DD ձևաչափով)։");
      return;
    }
    setSubmitting(true);
    try {
      const [me, myRequests] = await Promise.all([
        api.get<EmployeeView>("/employees/me"),
        api.get<RequestView[]>("/requests/mine"),
      ]);
      const check = validateSubmitRequest(
        { type, start, end },
        { id: me.id, hireDate: me.hireDate, balance: me.balance, dayOffBalance: me.dayOffBalance, tenDayChunkConfirmed: me.tenDayChunkConfirmed },
        myRequests.map((r) => ({ employeeId: me.id, type: r.type, start: r.start, end: r.end, days: r.days, status: r.status })),
        todayInYerevan(),
      );
      if (!check.ok) {
        setError(check.message);
        return;
      }
      const dto: CreateRequestInput = { type, start, end, reason: reason || undefined };
      await api.post("/requests", dto);
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Սխալ տեղի ունեցավ, փորձեք կրկին։");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.label}>Տեսակ</Text>
      <View style={styles.chipRow}>
        {Object.entries(REQUEST_TYPE_LABELS).map(([k, v]) => (
          <Pressable key={k} onPress={() => setType(k as RequestType)} style={[styles.chip, type === k && styles.chipActive]}>
            <Text style={[styles.chipText, type === k && styles.chipTextActive]}>{v}</Text>
          </Pressable>
        ))}
      </View>

      {type === "VACATION" && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Հայտ-դիմումն ուղարկվում է առնվազն 5 oր առաջ (հոդված 169). մասնակի հայտ-դիմումի դեպքում գոնե մեկ հատված պետք է լինի
            առնվազն {MIN_CHUNK_DAYS} աշխ. oր (հոդված 163)։
          </Text>
        </View>
      )}

      <Text style={styles.label}>Սկիզբ (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} placeholder={minStart} value={start} onChangeText={setStart} autoCapitalize="none" />

      <Text style={styles.label}>Ավարտ (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} placeholder={start || todayInYerevan()} value={end} onChangeText={setEnd} autoCapitalize="none" />

      <Text style={styles.label}>Մեկնաբանություն (ըստ ցանկության)</Text>
      <TextInput style={[styles.input, styles.textArea]} multiline value={reason} onChangeText={setReason} />

      {days > 0 && <Text style={styles.daysText}>{days} աշխատանքային oր</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Button
        title="Ուղարկել հայտ-դիմումը"
        onPress={submit}
        disabled={submitting || !start || !end}
        style={{ marginTop: 16, marginBottom: 40 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 16 },
  label: { fontSize: 11.5, color: colors.muted, marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, backgroundColor: "#fff" },
  textArea: { height: 70, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#fff" },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 12.5, color: colors.ink },
  chipTextActive: { color: "#fff" },
  notice: { backgroundColor: "#F5E1E0", borderWidth: 1, borderColor: "#E4D5D1", borderRadius: 8, padding: 10, marginTop: 12 },
  noticeText: { fontSize: 12, color: colors.seal },
  daysText: { fontSize: 13, color: colors.muted, marginTop: 12 },
  error: { fontSize: 12.5, color: "#841320", marginTop: 8 },
});

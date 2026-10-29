import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_URL, apiFetch } from '../api';
import { Button, Panel } from '../components/ui';
import { colors } from '../theme';

const AP_NAME = 'Pet_Hydration_Access_Point';
const POLL_MS = 3000;

export default function WifiChangeScreen({ route, navigation }) {
  const { deviceId } = route.params ?? {};

  const [step, setStep]   = useState('intro');
  const [error, setError] = useState(null);
  const [busy, setBusy]   = useState(false);

  const lastReadingId = useRef(0);

  const fetchLatest = async () => {
    const res = await apiFetch(`${API_URL}/devices/${deviceId}/readings/latest`);
    return res.ok ? res.json() : null;
  };

  useEffect(() => {
    if (step !== 'portal') return;
    const t = setInterval(async () => {
      try {
        const r = await fetchLatest();
        if (r && r.id > lastReadingId.current) setStep('done');
      } catch {}
    }, POLL_MS);
    return () => clearInterval(t);
  }, [step]);

  async function resetWifi() {
    setError(null);
    setBusy(true);
    try {
      const latest = await fetchLatest();
      lastReadingId.current = latest?.id ?? 0;

      const res = await apiFetch(`${API_URL}/devices/${deviceId}/wifi-reset`, { method: 'POST' });
      if (!res.ok) throw new Error();

      await new Promise((r) => setTimeout(r, 8000));
      const after = await fetchLatest();
      lastReadingId.current = Math.max(lastReadingId.current, after?.id ?? 0);

      setStep('portal');
    } catch {
      setError('Nie udało się wysłać polecenia. Sprawdź, czy urządzenie jest online.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      {step === 'intro' && (
        <>
          <Panel>
            <Text style={s.title}>Zmiana sieci Wi-Fi</Text>
            <Text style={s.text}>
              Urządzenie zapomni obecną sieć i uruchomi tryb konfiguracji. 
              Pozostałe ustawienia pozostają bez zmian.
            </Text>
            <Text style={s.text}>
              Do czasu połączenia z nową siecią dolewanie wody będzie wstrzymane.
            </Text>
          </Panel>

          <Panel style={s.hint}>
            <Text style={s.hintTitle}>Stara sieć nie jest już dostępna?</Text>
            <Text style={s.text}>
              Nie musisz nic robić, tryb konfiguracji uruchomi się automatycznie.
              Odłącz i podłącz zasilanie, a następnie w ciągu 5 minut połącz telefon z siecią{' '}
              <Text style={s.mono}>{AP_NAME}</Text> i wybierz nową sieć.
            </Text>
          </Panel>
        </>
      )}

      {step === 'portal' && (
        <Panel>
          <Text style={s.title}>Połącz urządzenie z nową siecią</Text>
          <Step n={1} text="Biała dioda na urządzeniu miga - tryb konfiguracji jest aktywny." />
          <Step n={2} text={`W ustawieniach Wi-Fi telefonu połącz się z siecią ${AP_NAME}.`} />
          <Step n={3} text="Otworzy się strona konfiguracji (alternatywnie otwórz adres 192.168.4.1 w przeglądarce). Wybierz nową sieć i wpisz hasło." />
          <Step n={4} text="Wróć do aplikacji — połączenie wykryje się samo." />
          <View style={s.waitRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={s.waitText}>Czekam, aż urządzenie wróci online…</Text>
          </View>
          <Text style={s.note}>Tryb konfiguracji trwa 5 minut. Jeśli przekroczysz czas, odłącz i podłącz zasilanie.</Text>
        </Panel>
      )}

      {step === 'done' && (
        <Panel>
          <Text style={[s.title, { color: colors.good }]}>Połączono</Text>
          <Text style={s.text}>Urządzenie działa w nowej sieci i wznowiło pracę.</Text>
        </Panel>
      )}

      {error && <Text style={s.error}>{error}</Text>}

      <View style={s.actions}>
        {step === 'intro' && (
          <Button title="Rozłącz z obecną siecią" onPress={resetWifi} loading={busy} />
        )}
        {step === 'done' && <Button title="Gotowe" onPress={() => navigation.goBack()} />}
        {step !== 'done' && (
          <Button variant="text" title={step === 'intro' ? 'Anuluj' : 'Zamknij'} onPress={() => navigation.goBack()} />
        )}
      </View>
    </ScrollView>
  );
}

function Step({ n, text }) {
  return (
    <View style={s.step}>
      <Text style={s.stepNo}>{n}</Text>
      <Text style={s.stepText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40, gap: 12 },

  title:     { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  text:      { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  mono:      { color: colors.text, fontFamily: 'monospace' },

  hint:      { borderWidth: 1, borderColor: colors.accent + '30' },
  hintTitle: { color: colors.accent, fontSize: 14, fontWeight: '700', marginBottom: 6 },

  step:      { flexDirection: 'row', gap: 10, marginBottom: 10 },
  stepNo:    { color: colors.accent, fontSize: 14, fontWeight: '800', width: 16 },
  stepText:  { color: colors.text, fontSize: 14, lineHeight: 20, flex: 1 },

  waitRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  waitText:  { color: colors.muted, fontSize: 13 },
  note:      { color: colors.muted, fontSize: 12, marginTop: 12 },

  error:     { color: colors.bad, fontSize: 13, marginLeft: 4 },
  actions:   { marginTop: 4, gap: 8 },
});
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_URL, apiFetch } from '../api';
import { Button, Field, Panel } from '../components/ui';
import { colors } from '../theme';

const BOWL_MIN_G      = 30;
const POLL_MS         = 2000;
const TARE_TIMEOUT_MS = 30000;

export default function BowlChangeScreen({ route, navigation }) {
  const { deviceId } = route.params ?? {};

  const [step, setStep]             = useState('capacity');
  const [oldDevice, setOldDevice]   = useState(null);
  const [liveWeight, setLiveWeight] = useState(null);
  const [capacity, setCapacity]     = useState('');
  const [error, setError]           = useState(null);
  const [busy, setBusy]             = useState(false);

  const startReadingId = useRef(0);
  const started        = useRef(false);
  const tareDone       = useRef(false);
  const tarePoll       = useRef(null);

  useEffect(() => () => clearInterval(tarePoll.current), []);

  const patchDevice = (body) =>
    apiFetch(`${API_URL}/devices/${deviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const fetchDevice = async () => {
    const res = await apiFetch(`${API_URL}/devices`);
    if (!res.ok) return null;
    const devs = await res.json();
    return devs.find((d) => d.id === deviceId) ?? null;
  };

  const fetchLatest = async () => {
    const res = await apiFetch(`${API_URL}/devices/${deviceId}/readings/latest`);
    return res.ok ? res.json() : null;
  };

  useEffect(() => {
    fetchDevice().then((d) => {
      setOldDevice(d);
      if (d) setCapacity(String(d.bowl_capacity_ml));
    });
  }, [deviceId]);

  useEffect(() => {
    return navigation.addListener('beforeRemove', () => {
      if (started.current && !tareDone.current && oldDevice) {
        patchDevice({
          bowl_weight_g:    oldDevice.bowl_weight_g,
          bowl_capacity_ml: oldDevice.bowl_capacity_ml,
        }).catch(() => {});
      }
    });
  }, [navigation, oldDevice]);

  useEffect(() => {
    if (step !== 'place') return;
    const t = setInterval(async () => {
      try {
        const r = await fetchLatest();
        if (r && r.id > startReadingId.current && r.calibrated === 0) {
          setLiveWeight(r.weight_g);
        }
      } catch {}
    }, POLL_MS);
    return () => clearInterval(t);
  }, [step]);

  async function start() {
    setError(null);
    const ml = parseInt(capacity, 10);
    if (!ml || ml <= 0) {
      setError('Podaj pojemność w ml.');
      return;
    }

    setBusy(true);
    try {
      const latest = await fetchLatest();
      startReadingId.current = latest?.id ?? 0;
      const res = await patchDevice({ bowl_weight_g: 0, bowl_capacity_ml: ml });
      if (!res.ok) throw new Error();
      started.current = true;
      setLiveWeight(null);
      setStep('place');
    } catch {
      setError('Nie udało się rozpocząć. Spróbuj ponownie.');
    } finally {
      setBusy(false);
    }
  }

  async function tare() {
    setError(null);
    setStep('tare_wait');
    try {
      const res = await apiFetch(`${API_URL}/devices/${deviceId}/tare`, { method: 'POST' });
      if (!res.ok) throw new Error();
    } catch {
      setError('Nie udało się wysłać polecenia.');
      setStep('place');
      return;
    }

    const deadline = Date.now() + TARE_TIMEOUT_MS;
    tarePoll.current = setInterval(async () => {
      try {
        const d = await fetchDevice();
        if (d && d.bowl_weight_g > 0) {
          clearInterval(tarePoll.current);
          tareDone.current = true;
          navigation.goBack();
          return;
        }
      } catch {}
      if (Date.now() > deadline) {
        clearInterval(tarePoll.current);
        setError(`Urządzenie nie wykryło miski (min. ${BOWL_MIN_G} g). Sprawdź, czy stoi na wadze i spróbuj ponownie.`);
        setStep('place');
      }
    }, POLL_MS);
  }

  const bowlReady = liveWeight != null && liveWeight >= BOWL_MIN_G;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Text style={s.stepLabel}>
        {step === 'capacity' ? 'Krok 1 z 2' : 'Krok 2 z 2'}
      </Text>

      {step === 'capacity' && (
        <>
          <Panel>
            <Text style={s.title}>Pojemność nowej miski</Text>
            <Text style={s.text}>
              Jaka jest pojemność nowej miski?
            </Text>
            <Text style={s.text}>
              Na czas wymiany zawór zostanie zamknięty, a odczyty nie będą liczone do spożycia.
              Na urządzeniu zapali się biała dioda.
            </Text>
          </Panel>
          <View style={s.fieldWrap}>
            <Field
              label="Pojemność (ml)"
              value={capacity}
              onChangeText={(t) => setCapacity(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder="np. 500"
            />
          </View>
        </>
      )}

      {step === 'place' && (
        <Panel>
          <Text style={s.title}>Postaw pustą nową miskę</Text>
          <Text style={s.text}>Zdejmij starą miskę i postaw nową. Odczyt stabilizuje się kilka sekund.</Text>
          <View style={s.liveBox}>
            {liveWeight == null ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={[s.liveValue, { color: bowlReady ? colors.good : colors.muted }]}>
                {Math.round(liveWeight)} g
              </Text>
            )}
            <Text style={s.liveHint}>
              {bowlReady ? 'Miska wykryta' : `Czekam na miskę (min. ${BOWL_MIN_G} g)`}
            </Text>
          </View>
          <Text style={s.text}>Po kalibracji urządzenie zacznie napełniać nową miskę.</Text>
        </Panel>
      )}

      {step === 'tare_wait' && (
        <Panel>
          <Text style={s.title}>Kalibracja…</Text>
          <Text style={s.text}>Nie ruszaj miski. To potrwa do kilkunastu sekund.</Text>
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
        </Panel>
      )}

      {error && <Text style={s.error}>{error}</Text>}

      <View style={s.actions}>
        {step === 'capacity' && <Button title="Dalej" onPress={start} loading={busy} />}
        {step === 'place' && <Button title="Kalibruj" onPress={tare} disabled={!bowlReady} />}
        {step !== 'tare_wait' && (
          <Button variant="text" title="Anuluj" onPress={() => navigation.goBack()} />
        )}
      </View>

      {step === 'place' && (
        <Text style={s.note}>Anulowanie przywróci starą miskę - postaw ją z powrotem na wadze.</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  stepLabel: { color: colors.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  title:     { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  text:      { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 8 },

  liveBox:   { alignItems: 'center', paddingVertical: 20, gap: 6 },
  liveValue: { fontSize: 44, fontWeight: '800' },
  liveHint:  { color: colors.muted, fontSize: 13 },

  fieldWrap: { marginTop: 16 },
  error:     { color: colors.bad, fontSize: 13, marginTop: 12, marginLeft: 4 },
  actions:   { marginTop: 16, gap: 8 },
  note:      { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';

import { colors } from '../theme';
import { API_URL, apiFetch } from '../api';

const TARE_POLL_MS    = 3_000;
const TARE_TIMEOUT_MS = 30_000;
const BOWL_MIN_G = 30;

export default function CalibrationScreen({ route, navigation }) {
  const { deviceId, userId = 1 } = route.params;
  const [step, setStep] = useState('pet');
  const [tareError, setTareError] = useState(null);
  const [capacity, setCapacity] = useState('');
  const [petName, setPetName] = useState('');
  const [petWeight, setPetWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const pollRef  = useRef(null);
  const timerRef = useRef(null);

  async function startTare() {
    setTareError(null);

    const latest = await fetchLatestWeight();
    if (!latest) {
      setTareError('Brak połączenia z urządzeniem. Odczekaj 5 sekund i spróbuj ponownie.');
      return;
    }

    if (latest.weight_g < BOWL_MIN_G) {
      setTareError('Połóż pustą miskę na wadze przed tarowaniem i odczekaj 5 sekund.');
      return;
    }

    setStep('tare_wait');

    await apiFetch(`${API_URL}/devices/${deviceId}/tare`, { method: 'POST' });

    const deadline = Date.now() + TARE_TIMEOUT_MS;

    pollRef.current = setInterval(async () => {
      const device = await fetchDevice();
      if (device && device.bowl_weight_g > 0) {
        clearInterval(pollRef.current);
        navigation.replace('Home', { deviceId, userId });
        return;
      }
      if (Date.now() > deadline) {
        clearInterval(pollRef.current);
        setTareError(`Urządzenie nie wykryło miski (min. ${BOWL_MIN_G} g). Sprawdź, czy stoi na wadze, i spróbuj ponownie.`);
        setStep('tare');
      }
    }, TARE_POLL_MS);
  }

  async function fetchDevice() {
    try {
      const res = await apiFetch(`${API_URL}/devices`);
      if (!res.ok) return null;
      const devices = await res.json();
      return devices.find((d) => d.id === deviceId) ?? null;
    } catch {
      return null;
    }
  }

  async function fetchLatestWeight() {
    try {
      const res = await apiFetch(`${API_URL}/devices/${deviceId}/readings/latest`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  useEffect(() => () => {
    clearInterval(pollRef.current);
    clearTimeout(timerRef.current);
  }, []);

  async function saveCapacity() {
    const ml = parseInt(capacity, 10);
    if (!ml || ml <= 0) { setError('Podaj prawidłową pojemność'); return; }
    setError(null);
    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bowl_capacity_ml: ml }),
      });
      if (!res.ok) throw new Error();
      setStep('tare');
    } catch {
      setError('Błąd zapisu. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  async function savePet() {
    if (!petName.trim()) { setError('Podaj imię zwierzęcia'); return; }
    setError(null);
    setSaving(true);
    try {
      const body = { name: petName.trim() };
      if (petWeight.trim()) {
        const weight = parseFloat(petWeight.replace(',', '.'));
        if (isNaN(weight) || weight <= 0) {
          setError('Podaj prawidłową wagę'); 
          setSaving(false);
          return; 
        } 
        body.weight_kg = weight;
      }

      const res = await apiFetch(`${API_URL}/devices/${deviceId}/pet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok && res.status !== 409) throw new Error();
      setStep('capacity');
    } catch {
      setError('Błąd zapisu. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.screen}>

          {step === 'pet' && (
            <View style={s.card}>
              <Text style={s.title}>Krok 1 z 3</Text>
              <Text style={s.heading}>Dane zwierzęcia</Text>
              <TextInput
                style={s.input}
                placeholder="Imię zwierzęcia"
                placeholderTextColor={colors.muted}
                value={petName}
                onChangeText={setPetName}
              />
              <TextInput
                style={s.input}
                placeholder="Waga zwierzęcia w kg (opcjonalnie)"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                value={petWeight}
                onChangeText={setPetWeight}
              />
              {error && <Text style={s.error}>{error}</Text>}
              <TouchableOpacity style={s.btn} onPress={savePet} disabled={saving}>
                <Text style={s.btnText}>{saving ? 'Zapisywanie…' : 'Dalej'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'capacity' && (
            <View style={s.card}>
              <Text style={s.title}>Krok 2 z 3</Text>
              <Text style={s.heading}>Pojemność miski</Text>
              <Text style={s.body}>Podaj maksymalną pojemność miski w mililitrach.</Text>
              <TextInput
                style={s.input}
                placeholder="np. 300"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                value={capacity}
                onChangeText={setCapacity}
              />
              {error && <Text style={s.error}>{error}</Text>}
              <TouchableOpacity style={s.btn} onPress={saveCapacity} disabled={saving}>
                <Text style={s.btnText}>{saving ? 'Zapisywanie…' : 'Dalej'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'tare' && (
            <View style={s.card}>
              <Text style={s.title}>Krok 3 z 3</Text>
              <Text style={s.heading}>Zerowanie wagi</Text>
              <Text style={s.body}>
                Połóż pustą miskę na wadze i naciśnij przycisk. Urządzenie wyzeruje wagę miski, a potem zacznie ją napełniać.
              </Text>
              {tareError && <Text style={s.error}>{tareError}</Text>}
              <TouchableOpacity style={s.btn} onPress={startTare}>
                <Text style={s.btnText}>Wykonaj Tare</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'tare_wait' && (
            <View style={s.card}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={s.heading}>Oczekiwanie na urządzenie…</Text>
              <Text style={s.body}>Nie ruszaj miski.</Text>
            </View>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card:    { backgroundColor: colors.panel, borderRadius: 16, padding: 24, gap: 16 },
  title:   { color: colors.muted, fontSize: 13 },
  heading: { color: colors.text, fontSize: 22, fontWeight: '700' },
  body:    { color: colors.muted, fontSize: 15, lineHeight: 22 },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 14,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.muted + '40',
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  btnText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  error:   { color: colors.bad, fontSize: 14 },
});

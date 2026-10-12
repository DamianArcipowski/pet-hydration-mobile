import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Button, Field, Panel } from '../components/ui';
import { colors } from '../theme';

const HOTSPOT_SSID  = 'Pet_Hydration_Access_Point';
const PORTAL_URL    = 'http://192.168.4.1';
const POLL_MS       = 3_000;
const POLL_LIMIT_MS = 120_000;
const API_URL = 'http://192.168.1.185:8080';

export default function AddDeviceScreen({ navigation }) {
  const [step, setStep]     = useState('hotspot');
  const [mac, setMac]       = useState(null);
  const [name, setName]     = useState('');
  const [error, setError]   = useState(null);
  const [saving, setSaving] = useState(false);

  const pollRef  = useRef(null);
  const startRef = useRef(0);

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPoll = useCallback(() => {
    setStep('waiting');
    startRef.current = Date.now();

    pollRef.current = setInterval(async () => {
      if (Date.now() - startRef.current > POLL_LIMIT_MS) {
        stopPoll();
        setError('Nie wykryto urządzenia w ciągu 2 minut. Zacznij od nowa.');
        setStep('hotspot');
        return;
      }
      try {
        const found = await pollPendingDevice();
        if (found) {
          stopPoll();
          setMac(found);
          setStep('name');
        }
      } catch {}
    }, POLL_MS);
  }, [stopPoll]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Podaj nazwę urządzenia.'); return; }
    setSaving(true);
    setError(null);
    try {
      await claimDevice(mac, trimmed);
      navigation.replace('Calibration', { deviceId: mac, deviceName: trimmed });
    } catch {
      setError('Nie udało się połączyć z urządzeniem.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <StepDots current={step} />

        {step === 'hotspot' && <StepHotspot onNext={() => setStep('portal')} />}
        {step === 'portal'  && <StepPortal  onNext={startPoll} onBack={() => setStep('hotspot')} />}
        {step === 'waiting' && <StepWaiting onCancel={() => { stopPoll(); setStep('hotspot'); }} />}
        {step === 'name'    && (
          <StepName
            mac={mac}
            name={name}
            onChangeName={(t) => { setName(t); setError(null); }}
            error={error}
            saving={saving}
            onSave={save}
            onBack={() => setStep('hotspot')}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StepHotspot({ onNext }) {
  return (
    <>
      <Header
        icon="wifi"
        title="Połącz się z urządzeniem"
        body="Twój ESP32 tworzy własną sieć WiFi. Otwórz Ustawienia → Wi-Fi i połącz się z siecią:"
      />
      <Panel style={{ marginTop: 4, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="radio-outline" size={20} color={colors.accent} />
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>
            {HOTSPOT_SSID}
          </Text>
        </View>
      </Panel>
      <Note text="Sieć może nie mieć dostępu do internetu - to normalne. Wróć do aplikacji po połączeniu." />
      <View style={{ marginTop: 24, gap: 4 }}>
        <Button title="Połączono — dalej" onPress={onNext} />
      </View>
    </>
  );
}

function StepPortal({ onNext, onBack }) {
  const openPortal = () => Linking.openURL(PORTAL_URL).catch(() => {});

  return (
    <>
      <Header
        icon="globe-outline"
        title="Skonfiguruj sieć"
        body="W przeglądarce powinna pojawić się strona konfiguracji. Wybierz swoją sieć domową (2.4 GHz), wpisz hasło i kliknij Zapisz."
      />
      <Panel style={{ marginTop: 20, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="link-outline" size={18} color={colors.muted} />
          <Text style={{
            color: colors.muted,
            fontSize: 14,
            fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
          }}>
            {PORTAL_URL}
          </Text>
        </View>
      </Panel>
      <Note text="Strona nie otworzyła się automatycznie? Wpisz adres ręcznie w przeglądarce." />
      <View style={{ marginTop: 24, gap: 4 }}>
        <Button title={`Otwórz ${PORTAL_URL}`} onPress={openPortal} />
        <Button title="Zapisałem sieć - czekaj" variant="text" onPress={onNext} />
        <Button title="Wróć" variant="text" onPress={onBack} />
      </View>
    </>
  );
}

function StepWaiting({ onCancel }) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <Header
        icon="hourglass-outline"
        title={`Wykrywam urządzenie${dots}`}
        body="Wróć telefonem do swojej sieci domowej. Aplikacja automatycznie wykryje urządzenie po połączeniu z siecią."
      />
      <Note text="Zielona dioda na urządzeniu - ESP32 połączył się z siecią." />
      <View style={{ marginTop: 32 }}>
        <Button title="Anuluj" variant="text" onPress={onCancel} />
      </View>
    </>
  );
}

function StepName({ mac, name, onChangeName, error, saving, onSave, onBack }) {
  return (
    <>
      <Header
        icon="checkmark-circle-outline"
        title="Urządzenie online!"
        body="Podaj nazwę poidła."
      />
      <Panel style={{ marginTop: 20, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="hardware-chip-outline" size={18} color={colors.good} />
          <Text style={{ color: colors.good, fontSize: 13 }}>{mac}</Text>
        </View>
      </Panel>
      <Field
        label="Nazwa urządzenia"
        value={name}
        onChangeText={onChangeName}
        autoFocus
        autoCapitalize="words"
        placeholder="np. Burek"
      />
      {error && (
        <Text style={{ color: colors.bad, marginBottom: 8, marginLeft: 4 }}>{error}</Text>
      )}
      <View style={{ marginTop: 8, gap: 4 }}>
        <Button title="Dalej: kalibracja" loading={saving} onPress={onSave} />
        <Button title="Wróć" variant="text" disabled={saving} onPress={onBack} />
      </View>
    </>
  );
}

function Header({ icon, title, body }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Ionicons name={icon} size={52} color={colors.accent} />
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: '700', marginTop: 16 }}>
        {title}
      </Text>
      <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 21 }}>{body}</Text>
    </View>
  );
}

function Note({ text }) {
  return (
    <View style={{
      flexDirection: 'row', gap: 10, alignItems: 'flex-start',
      backgroundColor: 'rgba(255,183,77,0.10)',
      borderRadius: 12, padding: 12, marginTop: 12,
    }}>
      <Ionicons name="information-circle-outline" size={18} color={colors.warn} style={{ marginTop: 1 }} />
      <Text style={{ color: colors.warn, fontSize: 13, lineHeight: 18, flex: 1 }}>{text}</Text>
    </View>
  );
}

const STEPS = ['hotspot', 'portal', 'waiting', 'name'];

function StepDots({ current }) {
  const idx = STEPS.indexOf(current);
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 32 }}>
      {STEPS.map((_, i) => (
        <View
          key={i}
          style={{
            height: 4,
            flex: i === idx ? 2 : 1,
            borderRadius: 2,
            backgroundColor: i <= idx ? colors.accent : 'rgba(255,255,255,0.12)',
          }}
        />
      ))}
    </View>
  );
}

const getToken = () => null; // TODO

async function pollPendingDevice() {
  const token = getToken();
  const res = await fetch(`${API_URL}/pending-devices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('poll failed');
  const list = await res.json();
  return list.length > 0 ? list[0].mac_address : null;
}

async function claimDevice(mac, name) {
  const token = getToken();
  const res = await fetch(`${API_URL}/pending-devices/claim?user_id=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mac_address: mac, name }),
  });
  if (!res.ok) throw new Error('claim failed');
  return res.json();
}

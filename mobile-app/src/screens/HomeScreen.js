import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Panel } from '../components/ui';
import { colors } from '../theme';
import { API_URL, apiFetch } from '../api';

const POLL_MS = 10_000;

export default function HomeScreen({ route, navigation }) {
  const { deviceId } = route.params ?? {};
  const insets = useSafeAreaInsets();

  const [device, setDevice]   = useState(null);
  const [pet, setPet]         = useState(null);
  const [reading, setReading] = useState(null);
  const [intake, setIntake]   = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail]     = useState(null);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [petWeightInput, setPetWeightInput]   = useState('');
  const [saving, setSaving]                   = useState(false);
  const [saveError, setSaveError]             = useState(null);

  const load = useCallback(async () => {
    try {
      const [devRes, petRes, readRes, intakeRes] = await Promise.all([
        apiFetch(`${API_URL}/devices`),
        apiFetch(`${API_URL}/devices/${deviceId}/pet`),
        apiFetch(`${API_URL}/devices/${deviceId}/readings/latest`),
        apiFetch(`${API_URL}/devices/${deviceId}/readings/intake/today`),
      ]);

      if (devRes.ok) {
        const devs = await devRes.json();
        setDevice(devs.find((d) => d.id === deviceId) ?? null);
      }
      if (petRes.ok) setPet(await petRes.json());
      if (readRes.ok) setReading(await readRes.json());
      if (intakeRes.ok) {
        const data = await intakeRes.json();
        setIntake(data.total_ml ?? 0);
      }
    } catch {}
  }, [deviceId]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    apiFetch(`${API_URL}/auth/me`)
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => me && setEmail(me.email))
      .catch(() => {});
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const calibrated  = reading?.calibrated === 1;
  const bowlMissing = !!reading && !calibrated && device?.bowl_weight_g > 0 && reading.weight_g === 0;
  const waterMl     = calibrated ? reading.weight_g : 0;

  const waterPct = device?.bowl_capacity_ml
    ? Math.min(waterMl / device.bowl_capacity_ml, 1)
    : 0;

  const today = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  async function savePetWeight() {
    setSaveError(null);
    const val = parseFloat(petWeightInput.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      setSaveError('Podaj prawidłową wagę (np. 4.5)');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(
        `${API_URL}/devices/${deviceId}/pet/weight`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weight_kg: val }),
        },
      );
      if (!res.ok) throw new Error();
      setAddModalVisible(false);
      setPetWeightInput('');
      await load();
    } catch {
      setSaveError('Błąd zapisu. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.container, { paddingTop: insets.top + 20 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >

      {email && (
        <View style={s.account}>
          <Ionicons name="person-circle-outline" size={16} color={colors.muted} />
          <Text style={s.accountText} numberOfLines={1} ellipsizeMode="middle">{email}</Text>
        </View>
      )}
      <View style={s.header}>
        <View>
          <Text style={s.date}>{today}</Text>
          <Text style={s.petName}>{pet?.name ?? device?.name ?? '-'}</Text>
        </View>
        <StatusDot reading={reading} />
      </View>

      <Panel style={s.intakeCard}>
        <Text style={s.cardLabel}>Spożycie wody dziś</Text>
        <Text style={s.intakeValue}>
          {intake}
          <Text style={s.intakeUnit}> ml</Text>
        </Text>
      </Panel>

      <Panel style={s.waterCard}>
        <Text style={s.cardLabel}>Poziom wody w misce</Text>
        <WaterBar pct={waterPct} />
        <View style={s.waterMeta}>
          <Text style={s.waterVal}>{calibrated ? `${Math.round(waterMl)} ml` : '0 ml'}</Text>
          <Text style={s.waterPct}>{calibrated ? `${Math.round(waterPct * 100)}%` : '0 %'}</Text>
        </View>
        <View style={s.statusRow}>
          {reading?.tank_low === 1 ? (
            <StatusChip icon="warning-outline" label="Brak wody w zbiorniku" color={colors.bad} />
          ) : !calibrated ? (
            <StatusChip
              icon={bowlMissing ? 'alert-circle-outline' : 'time-outline'}
              label={bowlMissing ? 'Brak miski' : 'Oczekiwanie na odczyt'}
              color={bowlMissing ? colors.warn : colors.muted}
            />
          ) : (
            <StatusChip
              icon={reading?.valve_open ? 'water' : 'water-outline'}
              label={reading?.valve_open ? 'Uzupełnianie' : 'OK'}
              color={reading?.valve_open ? colors.accent : colors.good}
            />
          )}
        </View>
      </Panel>

      <Panel style={s.petWeightCard}>
        <Text style={s.cardLabel}>Waga {pet?.name ?? 'zwierzęcia'}</Text>
        <View style={s.petWeightRow}>
          <Text style={s.petWeightValue}>
            {pet?.weight_kg ? `${pet.weight_kg} kg` : '-'}
          </Text>
          <TouchableOpacity style={s.petWeightBtn} onPress={() => setAddModalVisible(true)}>
            <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
            <Text style={s.petWeightBtnText}>Zaktualizuj</Text>
          </TouchableOpacity>
        </View>
      </Panel>

      <View style={s.tiles}>
        <Tile
          icon="stats-chart-outline"
          label="Statystyki"
          onPress={() => navigation.navigate('Stats', { deviceId })}
        />
        <Tile
          icon="settings-outline"
          label="Konfiguracja"
          onPress={() => navigation.navigate('DeviceSettings', { deviceId })}
        />
        <Tile
          icon="list-outline"
          label="Moje urządzenia"
          onPress={() => navigation.navigate('DeviceList', { deviceId })}
        />
      </View>

      <Modal visible={addModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Waga {pet?.name ?? 'zwierzęcia'}</Text>
            <TextInput
              style={s.modalInput}
              placeholder="np. 4.5"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={petWeightInput}
              onChangeText={setPetWeightInput}
              autoFocus
            />
            {saveError && <Text style={s.modalError}>{saveError}</Text>}
            <TouchableOpacity
              style={[s.modalBtn, saving && { opacity: 0.5 }]}
              onPress={savePetWeight}
              disabled={saving}
            >
              <Text style={s.modalBtnText}>{saving ? 'Zapisywanie…' : 'Zapisz'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setAddModalVisible(false); setPetWeightInput(''); setSaveError(null); }}
            >
              <Text style={s.modalCancel}>Anuluj</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function WaterBar({ pct }) {
  const fill = Math.max(0, Math.min(pct, 1));
  const barColor = fill < 0.2 ? colors.bad : fill < 0.5 ? colors.warn : colors.good;
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${fill * 100}%`, backgroundColor: barColor }]} />
    </View>
  );
}

function StatusDot({ reading }) {
  const age = reading
    ? (Date.now() - new Date(reading.recorded_at).getTime()) / 1000
    : Infinity;
  const online = age < 30;
  return <View style={[s.dot, { backgroundColor: online ? colors.good : colors.bad }]} />;
}

function StatusChip({ icon, label, color }) {
  return (
    <View style={[s.chip, { borderColor: color + '40', backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[s.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function Tile({ icon, label, sublabel, color = colors.accent, onPress }) {
  return (
    <TouchableOpacity
      style={s.tile}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Ionicons name={icon} size={26} color={color} />
      <Text style={s.tileLabel}>{label}</Text>
      {sublabel && <Text style={[s.tileSub, { color }]}>{sublabel}</Text>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: colors.bg },
  container:     { padding: 20, paddingBottom: 40 },

  account:       { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: colors.panel, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 16 
                 },
  accountText:   { color: colors.muted, fontSize: 12, flexShrink: 1 },

  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  date:          { color: colors.muted, fontSize: 13, marginBottom: 4 },
  petName:       { color: colors.text, fontSize: 26, fontWeight: '700' },
  dot:           { width: 12, height: 12, borderRadius: 6, marginTop: 8 },

  cardLabel:     { color: colors.muted, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },

  intakeCard:    { marginBottom: 12 },
  intakeValue:   { color: colors.text, fontSize: 48, fontWeight: '800' },
  intakeUnit:    { fontSize: 22, fontWeight: '400', color: colors.muted },

  waterCard:     { marginBottom: 12 },
  barTrack:      { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 8 },
  barFill:       { height: '100%', borderRadius: 5 },
  waterMeta:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  waterVal:      { color: colors.text, fontSize: 16, fontWeight: '600' },
  waterPct:      { color: colors.muted, fontSize: 16 },
  statusRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  chipText:      { fontSize: 12, fontWeight: '600' },

  petWeightCard:    { marginBottom: 20 },
  petWeightRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  petWeightValue:   { color: colors.text, fontSize: 32, fontWeight: '700' },
  petWeightBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  petWeightBtnText: { color: colors.accent, fontSize: 14 },

  tiles:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile:          { width: '47%', backgroundColor: colors.panel, borderRadius: 16, padding: 16, gap: 6 },
  tileLabel:     { color: colors.text, fontSize: 14, fontWeight: '600' },
  tileSub:       { fontSize: 12 },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 32 },
  modalCard:     { backgroundColor: colors.panel, borderRadius: 20, padding: 24 },
  modalTitle:    { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput:    { backgroundColor: colors.bg, color: colors.text, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 8 },
  modalError:    { color: colors.bad, fontSize: 13, marginBottom: 8 },
  modalBtn:      { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  modalBtnText:  { color: '#000', fontWeight: '700', fontSize: 16 },
  modalCancel:   { color: colors.muted, textAlign: 'center', paddingVertical: 8 },
});
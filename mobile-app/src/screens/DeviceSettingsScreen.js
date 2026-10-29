import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_URL, apiFetch } from '../api';
import { colors } from '../theme';

export default function DeviceSettingsScreen({ route, navigation }) {
  const { deviceId } = route.params ?? {};
  const [devices, setDevices] = useState(null);
  const [error, setError]     = useState(null);
  const [expanded, setExpanded] = useState(() => new Set(deviceId ? [deviceId] : []));

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/devices`);
        if (!res.ok) throw new Error();
        setDevices(await res.json());
        setError(null);
      } catch {
        setError('Nie udało się pobrać urządzeń.');
      }
    })();
  }, []));

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (!devices && !error) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      {error && <Text style={s.error}>{error}</Text>}
      {devices?.length === 0 && <Text style={s.empty}>Nie masz jeszcze żadnych urządzeń.</Text>}

      {devices?.map((d) => (
        <DeviceCard
          key={d.id}
          device={d}
          open={expanded.has(d.id)}
          onToggle={() => toggle(d.id)}
          onBowlChange={() => navigation.navigate('BowlChange', { deviceId: d.id })}
          onWifiChange={() => navigation.navigate('WifiChange', { deviceId: d.id })}
        />
      ))}
    </ScrollView>
  );
}

function DeviceCard({ device, open, onToggle, onBowlChange, onWifiChange }) {
  return (
    <View style={s.card}>
      <TouchableOpacity style={s.cardHeader} onPress={onToggle} activeOpacity={0.7}>
        <Ionicons name="water-outline" size={24} color={open ? colors.accent : colors.muted} />
        <View style={{ flex: 1 }}>
          <Text style={s.deviceName}>{device.name || 'Bez nazwy'}</Text>
          <Text style={s.mac}>{device.mac_address}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </TouchableOpacity>

      {open && (
        <View style={s.cardBody}>
          <Row
            label="Waga miski"
            value={device.bowl_weight_g > 0 ? `${device.bowl_weight_g} g` : 'nieskalibrowana'}
          />
          <Row label="Pojemność" value={`${device.bowl_capacity_ml} ml`} />

          <Option
            icon="swap-horizontal-outline"
            label="Zmień miskę"
            sublabel="Nowa kalibracja wagi i pojemności"
            onPress={onBowlChange}
          />
          <Option
            icon="wifi-outline"
            label="Zmień sieć Wi-Fi"
            sublabel="Zmienia jedynie sieć, pozostałe ustawienia zostają"
            onPress={onWifiChange}
          />
        </View>
      )}
    </View>
  );
}

function Option({ icon, label, sublabel, onPress }) {
  return (
    <TouchableOpacity style={s.option} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={s.optionLabel}>{label}</Text>
        <Text style={s.optionSub}>{sublabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </TouchableOpacity>
  );
}

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:     { flex: 1, backgroundColor: colors.bg },
  container:  { padding: 20, paddingBottom: 40, gap: 12 },
  center:     { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  error:      { color: colors.bad, fontSize: 13 },
  empty:      { color: colors.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },

  card:       { backgroundColor: colors.panel, borderRadius: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  deviceName: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 2 },
  mac:        { color: colors.muted, fontSize: 12, fontFamily: 'monospace' },

  cardBody:   { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 8 },
  row:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel:   { color: colors.muted, fontSize: 14 },
  rowValue:   { color: colors.text, fontSize: 14, fontWeight: '600' },

  option:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg, borderRadius: 12, padding: 14, marginTop: 10 },
  optionLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  optionSub:   { color: colors.muted, fontSize: 12, marginTop: 2 },
});
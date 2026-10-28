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
import { Panel } from '../components/ui';
import { colors } from '../theme';

export default function DeviceSettingsScreen({ route, navigation }) {
  const { deviceId } = route.params ?? {};
  const [device, setDevice] = useState(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/devices`);
        if (res.ok) {
          const devs = await res.json();
          setDevice(devs.find((d) => d.id === deviceId) ?? null);
        }
      } catch {}
    })();
  }, [deviceId]));

  if (!device) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Panel style={s.card}>
        <Text style={s.cardLabel}>Urządzenie</Text>
        <Text style={s.deviceName}>{device.name || 'Bez nazwy'}</Text>
        <Text style={s.mac}>{device.mac_address}</Text>
      </Panel>

      <Panel style={s.card}>
        <Text style={s.cardLabel}>Miska</Text>
        <Row label="Waga miski"  value={device.bowl_weight_g > 0 ? `${device.bowl_weight_g} g` : 'nieskalibrowana'} />
        <Row label="Pojemność"   value={`${device.bowl_capacity_ml} ml`} />
      </Panel>

      <Option
        icon="swap-horizontal-outline"
        label="Zmień miskę"
        sublabel="Nowa kalibracja wagi i pojemności"
        onPress={() => navigation.navigate('BowlChange', { deviceId })}
      />
    </ScrollView>
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

function Option({ icon, label, sublabel, onPress }) {
  return (
    <TouchableOpacity style={s.option} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={24} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={s.optionLabel}>{label}</Text>
        {sublabel && <Text style={s.optionSub}>{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  scroll:     { flex: 1, backgroundColor: colors.bg },
  container:  { padding: 20, paddingBottom: 40, gap: 12 },
  center:     { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },

  card:       {},
  cardLabel:  { color: colors.muted, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  deviceName: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 2 },
  mac:        { color: colors.muted, fontSize: 12, fontFamily: 'monospace' },

  row:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel:   { color: colors.muted, fontSize: 14 },
  rowValue:   { color: colors.text, fontSize: 14, fontWeight: '600' },

  option:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.panel, borderRadius: 16, padding: 16 },
  optionLabel: { color: colors.text, fontSize: 16, fontWeight: '600' },
  optionSub:   { color: colors.muted, fontSize: 12, marginTop: 2 },
});
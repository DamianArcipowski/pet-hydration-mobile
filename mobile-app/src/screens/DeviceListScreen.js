import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '../components/ui';
import { colors } from '../theme';
import { API_URL, apiFetch } from '../api';
import { useAuth } from '../auth';

export default function DeviceListScreen({ route, navigation }) {
  const { deviceId: currentId } = route.params ?? {};
  const { signOut } = useAuth();

  const [devices, setDevices]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch(`${API_URL}/devices`);
      if (!res.ok) throw new Error();
      setDevices(await res.json());
    } catch {
      setError('Nie udało się pobrać listy urządzeń.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  function openDevice(id) {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home', params: { deviceId: id } }],
    });
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <FlatList
        data={devices}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <Text style={s.empty}>{error ?? 'Nie masz jeszcze żadnych urządzeń.'}</Text>
        }
        renderItem={({ item }) => {
          const active = item.id === currentId;
          return (
            <TouchableOpacity
              style={[s.tile, active && s.tileActive]}
              onPress={() => openDevice(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="water-outline" size={24} color={active ? colors.accent : colors.muted} />
              <View style={s.tileText}>
                <Text style={s.name}>{item.name || 'Bez nazwy'}</Text>
                <Text style={s.mac}>{item.mac_address}</Text>
              </View>
              {active ? (
                <Text style={s.activeBadge}>Aktywne</Text>
              ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              )}
            </TouchableOpacity>
          );
        }}
      />

      <View style={s.footer}>
        <Button title="Dodaj nowe urządzenie" onPress={() => navigation.navigate('AddDevice')} />
        <Button variant="text" title="Wyloguj się" onPress={signOut} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.bg },
  center:      { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  list:        { padding: 20, gap: 12, flexGrow: 1 },
  empty:       { color: colors.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },

  tile:        { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.panel, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'transparent' },
  tileActive:  { borderColor: colors.accent + '60' },
  tileText:    { flex: 1 },
  name:        { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 2 },
  mac:         { color: colors.muted, fontSize: 12, fontFamily: 'monospace' },
  activeBadge: { color: colors.accent, fontSize: 12, fontWeight: '600' },

  footer:      { padding: 20, paddingTop: 0, gap: 4 },
});
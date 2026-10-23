import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Panel } from '../components/ui';
import { colors } from '../theme';

const API_URL  = process.env.EXPO_PUBLIC_API_URL;
const SCREEN_W = Dimensions.get('window').width;
const CHART_W  = SCREEN_W - 40 - 32; 
const CHART_H  = 120;
const LABEL_W  = 36;
const TIP_W    = 84;
const TIP_H    = 36;
const ML_PER_KG_PER_DAY = 50;

const PERIODS = [
  { key: 'day',   label: 'Dziś' },
  { key: 'week',  label: '7 dni' },
  { key: 'month', label: '30 dni' },
];

const LABEL_STEP = { day: 6, week: 1, month: 7 };

export default function StatsScreen({ route }) {
  const { deviceId, userId = 1 } = route.params ?? {};

  const [period, setPeriod]       = useState('day');
  const [intake, setIntake]       = useState(null);
  const [petWeight, setPetWeight] = useState(null);
  const [latestKg, setLatestKg]   = useState(null);
  const [loadingI, setLoadingI]   = useState(true);
  const [loadingW, setLoadingW]   = useState(true);

  const loadIntake = useCallback(async () => {
    setLoadingI(true);
    try {
      const res = await fetch(`${API_URL}/devices/${deviceId}/readings/intake?period=${period}`);
      setIntake(res.ok ? await res.json() : null);
    } catch { setIntake(null); }
    finally { setLoadingI(false); }
  }, [deviceId, period]);

  const loadWeight = useCallback(async () => {
    setLoadingW(true);
    try {
      const [histRes, petRes] = await Promise.all([
        fetch(`${API_URL}/devices/${deviceId}/pet/weight/history?period=${period}`),
        fetch(`${API_URL}/devices/${deviceId}/pet?user_id=${userId}`),
      ]);
      setPetWeight(histRes.ok ? await histRes.json() : null);
      if (petRes.ok) {
        const pet = await petRes.json();
        setLatestKg(pet.weight_kg ?? null);
      } else {
        setLatestKg(null);
      }
    } catch { setPetWeight(null); setLatestKg(null); }
    finally { setLoadingW(false); }
  }, [deviceId, userId, period]);

  useEffect(() => {
    loadIntake();
    loadWeight();
  }, [loadIntake, loadWeight]);

  const dailyGoal = latestKg ? Math.round(latestKg * ML_PER_KG_PER_DAY) : null;
  const goalLine  = period !== 'day' ? dailyGoal : null;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Text style={s.title}>Statystyki</Text>

      <View style={s.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[s.periodBtn, period === p.key && s.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[s.periodBtnText, period === p.key && s.periodBtnTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Panel style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Spożycie wody</Text>
          {intake && <Text style={s.cardTotal}>{intake.total} ml łącznie</Text>}
        </View>
        {loadingI ? (
          <ActivityIndicator color={colors.accent} style={s.loader} />
        ) : !intake || intake.data.every((d) => !d.value) ? (
          <EmptyChart />
        ) : (
          <>
            <BarChart
              key={`intake-${period}`}
              data={intake.data}
              color={colors.accent}
              labelStep={LABEL_STEP[period]}
              goalLine={goalLine}
              formatValue={(v) => `${v} ml`}
            />
            {period !== 'day' && (
              goalLine != null ? (
                <View style={s.goalLegend}>
                  <View style={s.goalDash} />
                  <Text style={s.goalLegendText}>
                    Cel: {goalLine} ml/dzień ({latestKg} kg × {ML_PER_KG_PER_DAY} ml)
                  </Text>
                </View>
              ) : (
                <Text style={s.goalMissing}>Dodaj wagę zwierzęcia, aby wyznaczyć cel</Text>
              )
            )}
          </>
        )}
      </Panel>

      <Panel style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Waga zwierzęcia</Text>
          {latestKg != null && <Text style={s.cardTotal}>{latestKg} kg</Text>}
        </View>
        {loadingW ? (
          <ActivityIndicator color={colors.warn} style={s.loader} />
        ) : !petWeight || petWeight.data.every((d) => d.value == null) ? (
          <EmptyChart />
        ) : (
          <BarChart
            key={`weight-${period}`}
            data={petWeight.data}
            color={colors.warn}
            labelStep={LABEL_STEP[period]}
            formatValue={(v) => `${v} kg`}
          />
        )}
      </Panel>
    </ScrollView>
  );
}

function BarChart({ data, color, labelStep, goalLine = null, formatValue }) {
  const [selected, setSelected] = useState(null);

  const values = data.map((d) => d.value ?? 0);
  const maxVal = Math.max(...values, goalLine ?? 0, 1);
  const barW   = CHART_W / data.length;
  const barH   = (v) => (v ? Math.max((v / maxVal) * CHART_H, 2) : 0);

  let tip = null;
  if (selected != null) {
    const d      = data[selected];
    const center = selected * barW + barW / 2;
    const hour = /^(\d{2}):00$/.exec(d.label);
    const label = hour
      ? `${d.label}–${String((+hour[1] + 1) % 24).padStart(2, '0')}:00`
      : d.label;
    tip = {
      label,
      text:   d.value ? formatValue(d.value) : 'brak',
      left:   Math.min(Math.max(center - TIP_W / 2, 0), CHART_W - TIP_W),
      bottom: Math.min(barH(d.value) + 6, CHART_H + 10 - TIP_H),
    };
  }

  return (
    <View>
      <View style={s.chartArea}>
        {goalLine != null && (
          <View style={[s.goalLine, { bottom: (goalLine / maxVal) * CHART_H }]} />
        )}
        <View style={s.barsRow}>
          {data.map((d, i) => (
            <Pressable
              key={i}
              style={[s.barCol, { width: barW }]}
              onPress={() => setSelected(selected === i ? null : i)}
            >
              {!!d.value && (
                <View
                  style={[
                    s.bar,
                    {
                      height: barH(d.value),
                      backgroundColor: color,
                      opacity: selected == null || selected === i ? 1 : 0.4,
                    },
                  ]}
                />
              )}
            </Pressable>
          ))}
        </View>

        {tip && (
          <View pointerEvents="none" style={[s.tip, { left: tip.left, bottom: tip.bottom }]}>
            <Text style={s.tipLabel}>{tip.label}</Text>
            <Text style={s.tipValue}>{tip.text}</Text>
          </View>
        )}
      </View>

      <View style={s.labelsRow}>
        {data.map((d, i) => {
          if (i % labelStep !== 0) return null;
          const center = i * barW + barW / 2;
          const left   = Math.min(Math.max(center - LABEL_W / 2, 0), CHART_W - LABEL_W);
          return (
            <Text key={i} style={[s.barLabel, { left }]} numberOfLines={1}>
              {d.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function EmptyChart() {
  return (
    <View style={s.empty}>
      <Text style={s.emptyText}>Brak danych</Text>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:              { flex: 1, backgroundColor: colors.bg },
  container:           { padding: 20, paddingBottom: 40 },
  title:               { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 16 },

  periodRow:           { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodBtn:           { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.panel, alignItems: 'center' },
  periodBtnActive:     { backgroundColor: colors.accent },
  periodBtnText:       { color: colors.muted, fontSize: 14, fontWeight: '600' },
  periodBtnTextActive: { color: '#000' },

  card:       { marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  cardTitle:  { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardTotal:  { color: colors.muted, fontSize: 13 },
  loader:     { marginVertical: 40 },

  chartArea:  { height: CHART_H + 10, justifyContent: 'flex-end', position: 'relative' },
  barsRow:    { flexDirection: 'row', alignItems: 'flex-end', height: CHART_H + 10 },
  barCol:     { height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar:        { width: '70%', borderRadius: 3, minWidth: 2 },

  tip:        { position: 'absolute', width: TIP_W, height: TIP_H, borderRadius: 8, backgroundColor: 'rgba(14,17,22,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  tipLabel:   { color: colors.muted, fontSize: 10 },
  tipValue:   { color: colors.text, fontSize: 12, fontWeight: '700' },

  labelsRow:  { height: 16, marginTop: 4, position: 'relative' },
  barLabel:   { position: 'absolute', width: LABEL_W, color: colors.muted, fontSize: 10, textAlign: 'center' },

  goalLine:       { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: colors.good, opacity: 0.8 },
  goalLegend:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  goalDash:       { width: 16, height: 2, borderRadius: 1, backgroundColor: colors.good },
  goalLegendText: { color: colors.muted, fontSize: 11 },
  goalMissing:    { color: colors.muted, fontSize: 11, marginTop: 8, fontStyle: 'italic' },

  empty:      { height: CHART_H + 10, justifyContent: 'center', alignItems: 'center' },
  emptyText:  { color: colors.muted, fontSize: 14 },
});
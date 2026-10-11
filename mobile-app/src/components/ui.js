import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme';

export function Panel({ children, style }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function Button({ title, onPress, disabled, loading, variant = 'primary' }) {
  const isPrimary = variant === 'primary';
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? styles.btnPrimary : styles.btnText,
        off && { opacity: 0.4 },
        pressed && { opacity: 0.75 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#000' : colors.accent} />
      ) : (
        <Text style={[styles.btnLabel, { color: isPrimary ? '#000' : colors.accent }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...rest }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 16,
  },
  btn: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnPrimary: { backgroundColor: colors.accent },
  btnText:    { backgroundColor: 'transparent', minHeight: 44 },
  btnLabel:   { fontSize: 16, fontWeight: '700' },
  fieldLabel: { color: colors.muted, fontSize: 12, marginBottom: 6, marginLeft: 4 },
  input: {
    backgroundColor: colors.panel,
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
});
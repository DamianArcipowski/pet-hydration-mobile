import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { API_URL } from '../api';
import { useAuth } from '../auth';
import { Button, Field } from '../components/ui';
import { colors } from '../theme';

const PASSWORD_MIN_LEN = 8;

export default function ForgotPasswordScreen({ route }) {
  const { signIn } = useAuth();

  const [step, setStep]           = useState('email');
  const [email, setEmail]         = useState(route.params?.email ?? '');
  const [code, setCode]           = useState('');
  const [password, setPassword]   = useState('');
  const [password2, setPassword2] = useState('');
  const [info, setInfo]           = useState(null);
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);

  async function sendCode() {
    setError(null);
    setInfo(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Podaj adres e-mail.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      if (res.ok) {
        setEmail(cleanEmail);
        setStep('code');
        setInfo('Jeśli konto istnieje, wysłaliśmy na nie 6-cyfrowy kod.');
      } else if (res.status === 503) {
        setError('Nie udało się wysłać e-maila. Spróbuj później.');
      } else {
        setError('Błąd serwera. Spróbuj ponownie.');
      }
    } catch {
      setError('Brak połączenia z serwerem.');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setError(null);
    if (code.trim().length !== 6) {
      setError('Kod ma 6 cyfr.');
      return;
    }
    if (password.length < PASSWORD_MIN_LEN) {
      setError(`Hasło musi mieć co najmniej ${PASSWORD_MIN_LEN} znaków.`);
      return;
    }
    if (password !== password2) {
      setError('Hasła nie są takie same.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim(), password }),
      });
      if (res.ok) {
        const data = await res.json();
        await signIn(data.token);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.detail === 'Too many attempts') {
        setError('Za dużo prób. Wyślij nowy kod.');
        setCode('');
        setStep('email');
      } else {
        setError('Nieprawidłowy lub wygasły kod.');
      }
    } catch {
      setError('Brak połączenia z serwerem.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {step === 'email' ? (
          <>
            <Text style={s.lead}>
              Podaj e-mail konta - wyślemy kod do ustawienia nowego hasła.
            </Text>
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="ty@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          </>
        ) : (
          <>
            <Text style={s.lead}>Kod wysłany na {email}</Text>
            <Field
              label="Kod z e-maila"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
            />
            <Field
              label="Nowe hasło"
              value={password}
              onChangeText={setPassword}
              placeholder={`min. ${PASSWORD_MIN_LEN} znaków`}
              secureTextEntry
              autoCapitalize="none"
            />
            <Field
              label="Powtórz nowe hasło"
              value={password2}
              onChangeText={setPassword2}
              secureTextEntry
              autoCapitalize="none"
            />
          </>
        )}

        {info && !error && <Text style={s.info}>{info}</Text>}
        {error && <Text style={s.error}>{error}</Text>}

        <View style={s.actions}>
          {step === 'email' ? (
            <Button title="Wyślij kod" onPress={sendCode} loading={loading} />
          ) : (
            <>
              <Button title="Ustaw nowe hasło" onPress={resetPassword} loading={loading} />
              <Button variant="text" title="Wyślij kod ponownie" onPress={sendCode} disabled={loading} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: 24 },
  lead:      { color: colors.muted, fontSize: 14, marginBottom: 20, lineHeight: 20 },
  info:      { color: colors.good, fontSize: 13, marginBottom: 12, marginLeft: 4 },
  error:     { color: colors.bad, fontSize: 13, marginBottom: 12, marginLeft: 4 },
  actions:   { marginTop: 8, gap: 8 },
});
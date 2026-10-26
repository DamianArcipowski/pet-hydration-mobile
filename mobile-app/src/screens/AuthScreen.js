import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../auth';
import { Button, Field } from '../components/ui';
import { colors } from '../theme';
import { API_URL, apiFetch } from '../api';

const PASSWORD_MIN_LEN = 8;

export default function AuthScreen() {
  const { signIn } = useAuth();

  const [mode, setMode]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const isRegister = mode === 'register';

  function switchMode() {
    setMode(isRegister ? 'login' : 'register');
    setError(null);
    setPassword('');
    setPassword2('');
  }

  async function submit() {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Podaj e-mail i hasło.');
      return;
    }
    if (isRegister) {
      if (password.length < PASSWORD_MIN_LEN) {
        setError(`Hasło musi mieć co najmniej ${PASSWORD_MIN_LEN} znaków.`);
        return;
      }
      if (password !== password2) {
        setError('Hasła nie są takie same.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      if (res.ok) {
        const data = await res.json();
        await signIn(data.token);
        return;
      }

      if (res.status === 401)      setError('Nieprawidłowy e-mail lub hasło.');
      else if (res.status === 409) setError('Ten e-mail jest już zarejestrowany.');
      else if (res.status === 400) setError('Podaj prawidłowy adres e-mail.');
      else                         setError('Błąd serwera. Spróbuj ponownie.');
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
        <Text style={s.logo}>Pet Hydration</Text>
        <Text style={s.subtitle}>
          {isRegister ? 'Załóż konto' : 'Zaloguj się'}
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
        <Field
          label="Hasło"
          value={password}
          onChangeText={setPassword}
          placeholder={isRegister ? `min. ${PASSWORD_MIN_LEN} znaków` : ''}
          secureTextEntry
          autoCapitalize="none"
        />
        {isRegister && (
          <Field
            label="Powtórz hasło"
            value={password2}
            onChangeText={setPassword2}
            secureTextEntry
            autoCapitalize="none"
          />
        )}

        {error && <Text style={s.error}>{error}</Text>}

        <View style={s.actions}>
          <Button
            title={isRegister ? 'Zarejestruj' : 'Zaloguj'}
            onPress={submit}
            loading={loading}
          />
          <Button
            variant="text"
            title={isRegister ? 'Mam już konto - zaloguj się' : 'Nie masz konta? Zarejestruj się'}
            onPress={switchMode}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo:      { color: colors.accent, fontSize: 34, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle:  { color: colors.muted, fontSize: 16, textAlign: 'center', marginBottom: 32 },
  error:     { color: colors.bad, fontSize: 13, marginBottom: 12, marginLeft: 4 },
  actions:   { marginTop: 8, gap: 8 },
});
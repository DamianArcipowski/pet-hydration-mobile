import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { API_URL, apiFetch, clearToken, loadToken, saveToken, setUnauthorizedHandler } from './src/api';
import { AuthContext } from './src/auth';
import { colors } from './src/theme';
import { useTankAlerts } from './src/notifications';

import AddDeviceScreen from './src/screens/AddDeviceScreen';
import AuthScreen from './src/screens/AuthScreen';
import CalibrationScreen from './src/screens/CalibrationScreen';
import DeviceListScreen from './src/screens/DeviceListScreen';
import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import DeviceSettingsScreen from './src/screens/DeviceSettingsScreen';
import BowlChangeScreen from './src/screens/BowlChangeScreen';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card:       colors.bg,
    primary:    colors.accent,
    text:       colors.text,
    border:     'transparent',
  },
};

export default function App() {
  const [booting, setBooting]             = useState(true);
  const [token, setToken]                 = useState(null);
  const [startDeviceId, setStartDeviceId] = useState(undefined);

  useEffect(() => {
    (async () => {
      try {
        const saved = await loadToken();
        if (saved) {
          const res = await apiFetch(`${API_URL}/auth/me`);
          if (res.ok) setToken(saved);
          else await clearToken();
        }
      } catch {} 
      finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    setStartDeviceId(undefined);
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/devices`);
        const devices = res.ok ? await res.json() : [];
        setStartDeviceId(devices.length > 0 ? devices[0].id : null);
      } catch {
        setStartDeviceId(null);
      }
    })();
  }, [token]);

  const signIn = useCallback(async (newToken) => {
    await saveToken(newToken);
    setToken(newToken);
  }, []);

  const signOut = useCallback(async () => {
    try { await apiFetch(`${API_URL}/auth/logout`, { method: 'POST' }); } catch {}
    await clearToken();
    setToken(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearToken();
      setToken(null);
    });
  }, []);

  const auth = useMemo(() => ({ signIn, signOut }), [signIn, signOut]);

  useTankAlerts(!!token);

    if (booting || (token && startDeviceId === undefined)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator
            key={token ? 'app' : 'auth'}
            initialRouteName={!token ? 'Auth' : startDeviceId ? 'Home' : 'AddDevice'}
            screenOptions={{
              headerStyle:         { backgroundColor: colors.bg },
              headerTintColor:     colors.text,
              headerShadowVisible: false,
              headerTitleStyle:    { fontWeight: '700' },
              contentStyle:        { backgroundColor: colors.bg },
            }}
          >
            {!token ? (
               <>
                <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
                <Stack.Screen
                  name="ForgotPassword"
                  component={ForgotPasswordScreen}
                  options={{ title: 'Reset hasła' }}
                />
              </>
            ) : (
              <>
                <Stack.Screen
                  name="AddDevice"
                  component={AddDeviceScreen}
                  options={{ title: 'Nowe poidło' }}
                />
                <Stack.Screen name="Calibration" component={CalibrationScreen} />
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  initialParams={startDeviceId ? { deviceId: startDeviceId } : undefined}
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="Stats" component={StatsScreen} />
                <Stack.Screen
                  name="DeviceList"
                  component={DeviceListScreen}
                  options={{ title: 'Moje urządzenia' }}
                />
                <Stack.Screen
                  name="DeviceSettings"
                  component={DeviceSettingsScreen}
                  options={{ title: 'Konfiguracja' }}
                />
                <Stack.Screen
                  name="BowlChange"
                  component={BowlChangeScreen}
                  options={{ title: 'Zmiana miski' }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}
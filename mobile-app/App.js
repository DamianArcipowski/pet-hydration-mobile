import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from './src/theme';
import AddDeviceScreen from './src/screens/AddDeviceScreen';
import CalibrationScreen from './src/screens/CalibrationScreen';
import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import DeviceListScreen from './src/screens/DeviceListScreen';

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

// temporary
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const USER_ID = 1;

export default function App() {
  // temporary solution to skip device configuration, later will be replaced with authentication system 
  const [startDeviceId, setStartDeviceId] = useState(undefined);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/devices?user_id=${USER_ID}`);
        const devices = res.ok ? await res.json() : [];
        setStartDeviceId(devices.length > 0 ? devices[0].id : null);
      } catch {
        setStartDeviceId(null);
      }
    })();
  }, []);

  if (startDeviceId === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          initialRouteName={startDeviceId ? 'Home' : 'AddDevice'} // temporary
          screenOptions={{
            headerStyle:      { backgroundColor: colors.bg },
            headerTintColor:  colors.text,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle:     { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen
            name="AddDevice"
            component={AddDeviceScreen}
            options={{ title: 'Nowe poidło' }}
          />
          <Stack.Screen 
            name="Calibration" 
            component={CalibrationScreen} 
          />
          {/*<Stack.Screen 
            name="Home" 
            component={HomeScreen} 
          />*/}
          {/* temporary */}
           <Stack.Screen
            name="Home"
            component={HomeScreen}
            initialParams={startDeviceId ? { deviceId: startDeviceId, userId: USER_ID } : undefined}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Stats" 
            component={StatsScreen} 
          />
          <Stack.Screen
            name="DeviceList"
            component={DeviceListScreen}
            options={{ title: 'Moje urządzenia' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
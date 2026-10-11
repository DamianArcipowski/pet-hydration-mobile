import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AddDeviceScreen from './src/screens/AddDeviceScreen';
import { colors } from './src/theme';

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
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
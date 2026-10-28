# Smart Pet Hydration Mobile

## General information
This repository contains the mobile part of a smart pet hydration project.

## Tech stack
- Node.js 24.15.0
- Expo SDK 58
- React 19.3.0 

## How to start
1. Install **Expo Go** (Google Play / App Store) on your mobile.
2. Create a free account
3. Fill the placeholders and run the following commands to initialise the project:
```bash
npx create-expo-app@latest <directory_name> --template blank
cd <directory_name>
npx expo install @react-navigation/native @react-navigation/native-stack \
  react-native-screens react-native-safe-area-context \
  @react-native-async-storage/async-storage react-native-svg \
  @expo/vector-icons expo-status-bar
```
4. In the Expo mobile app login with credentials which you used during a sign up process
5. Then run in your terminal:
 ```bash
npx expo login
``` 
You have to sign in using **exactly** the same credentials as you have used in your mobile app.
Otherwise, you will not be able to access the application from your mobile device.
6. To start the server run:
```bash
npx expo start
```
7. Scan the QR code from your terminal; note that your computer and mobile have to be connected to the same WiFi.
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { API_URL, apiFetch } from './api';

const CHECK_MS   = 10_000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

async function setupNotifications() {
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  return status === 'granted';
}

function notifyTankEmpty(deviceName) {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Brak wody w zbiorniku',
      body: `${deviceName}: uzupełnij baniak - dolewanie do miski jest wstrzymane.`,
      sound: true,
    },
    trigger: null,
  });
}

export function useTankAlerts(enabled) {
  const notified = useRef(new Set());

    useEffect(() => {
        if (!enabled) return;
        let active = true;
        let timer = null;

        async function check() {
            try {
                const res = await apiFetch(`${API_URL}/devices`);
                if (!res.ok) return;
                const devices = await res.json();

                for (const d of devices) {
                    const r = await apiFetch(`${API_URL}/devices/${d.id}/readings/latest`);
                    if (!r.ok || !active) continue;
                    const reading = await r.json();

                    if (reading.tank_low === 1) {
                        if (!notified.current.has(d.id)) {
                            await notifyTankEmpty(d.name || 'Poidło');
                            notified.current.add(d.id);
                        }
                    } else {
                        notified.current.delete(d.id);
                    }
                }
            } catch (e) {}
        }

        (async () => {
            let granted = false;
            try {
                granted = await setupNotifications();
            } catch (e) {}
            if (!granted || !active) return;
            check();
            timer = setInterval(check, CHECK_MS);
        })();

        return () => { active = false; clearInterval(timer); };
    }, [enabled]);
}
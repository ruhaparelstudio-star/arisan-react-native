import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { collection, doc, serverTimestamp, updateDoc } from '@react-native-firebase/firestore';
import { firestore } from './firebase';

export const registerPushToken = async (uid: string): Promise<string | null> => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  const ref = doc(collection(firestore(), 'users'), uid);
  await updateDoc(ref, {
    expoPushToken: token,
    tokenUpdatedAt: serverTimestamp(),
  });

  return token;
};

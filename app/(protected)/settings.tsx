import { ScrollView, View, Pressable } from 'react-native';
import { H1, Muted } from '@/components/ui/typography';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/supabase-provider';
import { exportUserData, deleteUserAccount } from '@/lib/privacy';
import { Platform, Share, Alert } from 'react-native';
import { registerForPushNotificationsAsync, savePushToken, removePushToken } from '@/lib/push';
import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, session } = useAuth();
  const userId = session?.user.id as string | undefined;
  const [notifEnabled, setNotifEnabled] = useState<boolean>(true);

  async function handleToggleNotifications(next: boolean) {
    setNotifEnabled(next);
    try {
      if (!userId) return;
      if (next) {
        const token = await registerForPushNotificationsAsync();
        if (token) await savePushToken(userId, token);
      } else {
        await removePushToken(userId);
      }
    } catch {}
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top","bottom"]}>
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-y-6">
        <H1>Paramètres</H1>

        {/* Section compte */}
        <View className="rounded-xl border border-border bg-card p-4 gap-y-3">
          <Text className="text-base font-semibold">Compte</Text>
          <View className="flex-row items-center justify-between">
            <Muted>Exporter mes données (JSON)</Muted>
            <Button size="sm" variant="secondary" onPress={async () => {
              try {
                const data = await exportUserData();
                const json = JSON.stringify(data, null, 2);
                if (Platform.OS === 'web') {
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'export-donnees.json';
                  a.click();
                  URL.revokeObjectURL(url);
                } else {
                  await Share.share({ message: json });
                }
              } catch (e: any) {
                alert(e?.message ?? 'Export impossible');
              }
            }}>
              <Text>Télécharger</Text>
            </Button>
          </View>
          <View className="flex-row items-center justify-between">
            <Muted>Supprimer mon compte</Muted>
            <Button size="sm" variant="destructive" onPress={async () => {
              Alert.alert(
                'Confirmation',
                'Supprimer définitivement votre compte et vos données ?',
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                      try { await deleteUserAccount(); await signOut(); } catch (e: any) { alert(e?.message ?? 'Suppression impossible'); }
                    },
                  },
                ]
              );
            }}>
              <Text>Supprimer</Text>
            </Button>
          </View>
          <Button variant="secondary" onPress={async () => { await signOut(); }}>
            <Text>Se déconnecter</Text>
          </Button>
        </View>

        {/* Section notifications */}
        <View className="rounded-xl border border-border bg-card p-4 gap-y-3">
          <Text className="text-base font-semibold">Notifications</Text>
          <View className="flex-row items-center justify-between">
            <Muted>Recevoir des notifications push</Muted>
            <Switch checked={notifEnabled} onCheckedChange={(v) => handleToggleNotifications(Boolean(v))} />
          </View>
        </View>

        {/* Section confidentialité */}
        <View className="rounded-xl border border-border bg-card p-4 gap-y-2">
          <Text className="text-base font-semibold">Confidentialité</Text>
          <Muted>Consulte notre politique de confidentialité et nos CGU.</Muted>
          <Button variant="secondary" onPress={() => router.push('/privacy')}>
            <Text>Voir la politique</Text>
          </Button>
        </View>

        {/* Section langue */}
        <View className="rounded-xl border border-border bg-card p-4 gap-y-2">
          <Text className="text-base font-semibold">Langue</Text>
          <Muted>Bientôt disponible</Muted>
        </View>

        <Button variant="secondary" onPress={() => router.back()}>
          <Text>Fermer</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}



import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Image, Pressable, Alert } from 'react-native';
import { H1, Muted } from '@/components/ui/typography';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/supabase-provider';
import { getProfile, upsertProfile } from '@/lib/profiles';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { listRegions } from '@/lib/regions';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/config/supabase';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { listUserMedia, deleteUserMedia, UserMedia } from '@/lib/media';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileEdit() {
  const { session } = useAuth();
  const userId = session?.user.id as string | undefined;
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([]);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const [role, setRole] = useState<'organizer' | 'participant' | 'both' | ''>('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarMime, setAvatarMime] = useState<string | null>(null);
  const [avatarExt, setAvatarExt] = useState<string | null>(null);
  const [myMedia, setMyMedia] = useState<UserMedia[]>([]);

  useEffect(() => {
    (async () => {
      if (!userId) return;
      const p = await getProfile(userId);
      setFirstName(p?.first_name ?? '');
      setLastName(p?.last_name ?? '');
      setAge(p?.age != null ? String(p.age) : '');
      setRegionId(p?.region_id ?? null);
      setRole((p?.role as any) ?? '');
      setAvatar(p?.avatar_url ?? null);
      const rs = await listRegions();
      setRegions(rs.map(r => ({ id: r.id, name: r.name })));
      const mm = await listUserMedia(userId);
      setMyMedia(mm);
    })();
  }, [userId]);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.8 });
    if (res.canceled) return;
    const asset: any = res.assets?.[0];
    if (!asset) return;
    setAvatar(asset.uri);
    setAvatarMime(asset.mimeType ?? 'image/jpeg');
    const name = asset.fileName as string | undefined;
    const ext = name?.split('.').pop()?.toLowerCase() ?? asset.uri.split('.').pop()?.toLowerCase() ?? (asset.mimeType?.includes('png') ? 'png' : 'jpg');
    setAvatarExt(ext);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      let avatar_url: string | null | undefined = undefined; // undefined = ne pas modifier; string|null = fixer
      if (avatar && avatar.startsWith('file:')) {
        try {
          let uploadUri = avatar;
          let uploadMime = avatarMime ?? 'image/jpeg';
          let ext = avatarExt ?? (uploadMime.includes('png') ? 'png' : uploadMime.includes('jpeg') ? 'jpg' : 'jpg');
          if ((uploadMime && uploadMime.includes('heic')) || (ext && ext.includes('heic'))) {
            const manipulated = await manipulateAsync(avatar, [], { compress: 0.9, format: SaveFormat.JPEG });
            uploadUri = manipulated.uri;
            uploadMime = 'image/jpeg';
            ext = 'jpg';
          }
          const filePath = `avatars/${userId}.${ext}`;
          const file: any = { uri: uploadUri, name: `avatar.${ext}`, type: uploadMime };
          const { error: upErr } = await supabase.storage.from('public').upload(filePath, file, { contentType: uploadMime, upsert: true });
          if (!upErr) {
            const { data: pub } = supabase.storage.from('public').getPublicUrl(filePath);
            avatar_url = pub?.publicUrl ?? null;
          } else {
            avatar_url = null;
          }
        } catch {
          avatar_url = null;
        }
      }

      await upsertProfile({
        id: userId,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        age: age ? Number(age) : null,
        avatar_url: avatar_url !== undefined ? avatar_url : undefined,
        region_id: regionId ?? null,
        role: role ? role : null,
      } as any);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top","bottom"]}>
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-y-4">
        <H1>Modifier mon profil</H1>
        <View className="items-center gap-y-2">
          {avatar ? (
            <Image source={{ uri: avatar }} style={{ width: 120, height: 120, borderRadius: 60 }} />
          ) : (
            <View style={{ width: 120, height: 120, borderRadius: 60 }} className="bg-muted" />
          )}
          <Button size="sm" variant="secondary" onPress={pickImage}><Text>Changer la photo</Text></Button>
        </View>
        <Input placeholder="Prénom" value={firstName} onChangeText={setFirstName} />
        <Input placeholder="Nom" value={lastName} onChangeText={setLastName} />
        <Input placeholder="Âge" keyboardType="number-pad" value={age} onChangeText={setAge} />

        <View className="gap-y-2">
          <Muted>Région</Muted>
          <View style={{ position: 'relative' }}>
            <Pressable onPress={() => setRegionOpen((v) => !v)} style={{ height: 48, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, backgroundColor: 'white' }} className="flex-row items-center justify-between">
              <Text className="text-base">{regionId ? (regions.find(r => r.id === regionId)?.name ?? 'Choisir une région') : 'Choisir une région'}</Text>
              <Text>▼</Text>
            </Pressable>
            {regionOpen ? (
              <View style={{ position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderRadius: 6, maxHeight: 220, zIndex: 1000 }}>
                <ScrollView>
                  {regions.map((r) => (
                    <Pressable key={r.id} className="px-3 py-2" onPress={() => { setRegionId(r.id); setRegionOpen(false); }}>
                      <Text numberOfLines={1}>{r.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>

        <View className="gap-y-2">
          <Muted>Rôle</Muted>
          <View className="flex-row gap-x-2">
            {[
              { label: 'Organisateur', value: 'organizer' },
              { label: 'Participant', value: 'participant' },
              { label: 'Les deux', value: 'both' },
            ].map((opt) => (
              <Pressable key={opt.value} onPress={() => setRole(opt.value as any)} className="px-4 py-2 rounded-full" style={{ borderWidth: 1, borderColor: role === (opt.value as any) ? '#111827' : '#E5E7EB', backgroundColor: role === (opt.value as any) ? '#111827' : 'white' }}>
                <Text style={{ color: role === (opt.value as any) ? 'white' : '#111827' }}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="mt-4 gap-y-2">
          <H1 className="text-xl">Mes médias</H1>
          <Muted>Appuie pour visualiser; supprime avec le bouton.</Muted>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {myMedia.map((m) => (
              <View key={m.id} style={{ width: '32%' }} className="aspect-square bg-muted rounded-md overflow-hidden">
                {m.kind === 'image' ? (
                  <Image source={{ uri: m.url }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-black"><Text className="text-white">Vidéo</Text></View>
                )}
                <Pressable className="absolute top-1 right-1 rounded-full bg-white/95 p-2" onPress={async () => {
                  Alert.alert('Confirmation', 'Supprimer ce média ?', [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', style: 'destructive', onPress: async () => {
                      const ok = await deleteUserMedia(m.id, m.url);
                      if (ok) setMyMedia((prev) => prev.filter(x => x.id !== m.id));
                    } }
                  ]);
                }}>
                  <Ionicons name="trash" size={16} color="#EF4444" />
                </Pressable>
              </View>
            ))}
            {myMedia.length === 0 ? <Muted>Aucun média.</Muted> : null}
          </View>
        </View>

        {/* Actions en bas */}
        <View className="mt-6 gap-y-2">
          <Button onPress={handleSave} disabled={saving}>
            <Text>{saving ? 'Enregistrement…' : 'Enregistrer'}</Text>
          </Button>
          <Button variant="secondary" onPress={() => router.back()}>
            <Text>Annuler</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}



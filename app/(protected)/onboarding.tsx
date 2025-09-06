import { useEffect, useState } from "react";
import { Image, View, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { router } from "expo-router";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { upsertProfile } from "@/lib/profiles";
import { supabase } from "@/config/supabase";
import { listRegions } from "@/lib/regions";
import ButtonMultiselect, { ButtonLayout } from "react-native-button-multiselect";
import { listSports, saveUserSports } from "@/lib/sports";

export default function Onboarding() {
	const { session } = useAuth();
	const userId = session?.user.id as string;

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [age, setAge] = useState("");
	const [submitting, setSubmitting] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(null);
    const [avatarMime, setAvatarMime] = useState<string | null>(null);
    const [avatarExt, setAvatarExt] = useState<string | null>(null);
    const [regions, setRegions] = useState<{ id: number; name: string }[]>([]);
    const [regionId, setRegionId] = useState<number | null>(null);
    const [sportsButtons, setSportsButtons] = useState<{ label: string; value: string }[]>([]);
    const [selectedSports, setSelectedSports] = useState<string[]>([]);
    const [role, setRole] = useState<string>("");

    useEffect(() => {
        (async () => {
            try {
                const rs = await listRegions();
                setRegions(rs.map(r => ({ id: r.id, name: r.name })));
                const ss = await listSports();
                setSportsButtons(ss.map(s => ({ label: `${s.emoji ?? ''} ${s.name}`.trim(), value: String(s.id) })));
            } catch (e) {
                console.error("Failed to load regions", e);
            }
        })();
    }, []);

    function handleSportsSelected(vals: any) {
        const arr = vals as string[];
        if (arr.length > 5) {
            alert("Tu peux sélectionner au maximum 5 sports.");
            return;
        }
        setSelectedSports(arr);
    }

    async function pickImage() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) {
            const asset = result.assets[0];
            setAvatar(asset.uri);
            setAvatarMime((asset as any).mimeType ?? null);
            const name = (asset as any).fileName as string | undefined;
            const ext = name?.split(".").pop()?.toLowerCase() ?? asset.uri.split(".").pop()?.toLowerCase() ?? null;
            setAvatarExt(ext);
        }
    }

	async function handleSave() {
		if (!userId) return;
		setSubmitting(true);
		try {
			let avatar_url: string | null = null;
			if (avatar && userId) {
				try {
					let uploadUri = avatar;
					let uploadMime = avatarMime ?? "image/jpeg";
					let ext = avatarExt ?? (uploadMime.includes("png") ? "png" : uploadMime.includes("jpeg") ? "jpg" : "jpg");
					// Convert HEIC to JPEG for compatibility
					if ((uploadMime && uploadMime.includes("heic")) || (ext && ext.includes("heic"))) {
						const manipulated = await manipulateAsync(avatar, [], { compress: 0.9, format: SaveFormat.JPEG });
						uploadUri = manipulated.uri;
						uploadMime = "image/jpeg";
						ext = "jpg";
					}
					const filePath = `avatars/${userId}.${ext}`;
					const file = {
						uri: uploadUri,
						name: `avatar.${ext}`,
						type: uploadMime,
					} as any;
					const { error: uploadError } = await supabase.storage
						.from("public")
						.upload(filePath, file, {
							contentType: uploadMime,
							upsert: true,
						});
					if (!uploadError) {
						const { data: publicUrl } = supabase.storage
							.from("public")
							.getPublicUrl(filePath);
						avatar_url = publicUrl.publicUrl ?? null;
					} else {
						console.error("Upload error:", uploadError);
					}
				} catch (e) {
					console.error("Upload exception:", e);
				}
			}

			const roleToSave = role ? (role as any) : null;

			await upsertProfile({
				id: userId,
				first_name: firstName.trim() || null,
				last_name: lastName.trim() || null,
				age: age ? Number(age) : null,
				avatar_url,
				region_id: regionId,
				role: roleToSave,
			});
            if (selectedSports.length > 0) {
                await saveUserSports(userId, selectedSports.map((v) => Number(v)));
            }
			// On success, go to tabs (Home)
			router.replace("/(protected)/(tabs)");
		} catch (e: any) {
			console.error("Onboarding save failed:", e);
			// basic alert fallback
			// eslint-disable-next-line no-alert
			alert(e?.message ?? "Échec de l'enregistrement du profil.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="p-4 gap-y-4">
			<H1 className="text-center">Compléter votre profil</H1>
			<Muted className="text-center">
				Veuillez saisir vos informations pour continuer
			</Muted>
			<View className="gap-y-3 web:m-4">
				<View className="items-center gap-y-2">
					{avatar ? (
						<Image
							source={{ uri: avatar }}
							style={{ width: 96, height: 96, borderRadius: 48 }}
						/>
					) : null}
					<Pressable
						className="rounded-md bg-secondary px-3 py-2"
						onPress={pickImage}
					>
						<Text>{avatar ? "Changer la photo" : "Ajouter une photo"}</Text>
					</Pressable>
				</View>
				<Input
					placeholder="Prénom"
					value={firstName}
					onChangeText={setFirstName}
				/>
				<Input
					placeholder="Nom"
					value={lastName}
					onChangeText={setLastName}
				/>
				<Input
					placeholder="Âge"
					keyboardType="number-pad"
					value={age}
					onChangeText={setAge}
				/>
				<View className="gap-y-2">
					<Muted>Région</Muted>
					<Dropdown
						style={{ height: 48, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8 }}
						containerStyle={{ borderRadius: 8 }}
						data={regions.map((r) => ({ label: r.name, value: r.id }))}
						labelField="label"
						valueField="value"
						placeholder="Choisir une région"
						value={regionId as any}
						onChange={(item: any) => setRegionId(item.value)}
					/>
				</View>
				<View className="gap-y-2">
					<Muted>Sports pratiqués (multi‑choix)</Muted>
					<ButtonMultiselect
						layout={ButtonLayout.GRID}
						multiselect
						buttons={sportsButtons}
						selectedButtons={selectedSports as any}
						onButtonSelected={handleSportsSelected}
					/>
				</View>
				<View className="gap-y-2">
					<Muted>Rôle</Muted>
					<ButtonMultiselect
						layout={ButtonLayout.FULL_WIDTH}
						buttons={[
							{ label: "Organisateur", value: "organizer" },
							{ label: "Participant", value: "participant" },
							{ label: "Les deux", value: "both" },
						]}
						selectedButtons={role as any}
						onButtonSelected={(val: any) => setRole(val as string)}
					/>
				</View>
			</View>
			<Button
				variant="default"
				onPress={handleSave}
				disabled={submitting}
				className="web:m-4"
			>
				{submitting ? <ActivityIndicator size="small" /> : <Text>Continuer</Text>}
			</Button>
			</View>
		</ScrollView>
	);
}



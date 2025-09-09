import { useEffect, useState, useRef } from "react";
import { Image, View, ActivityIndicator, Pressable, ScrollView, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Path } from "react-native-svg";
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
    const insets = useSafeAreaInsets();

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

    // Continuous wave support: store left/right Y for each step to ensure continuity
    const waveLeftY = useRef<number[]>([]);   // y at x=0 for each step
    const waveRightY = useRef<number[]>([]);  // y at x=400 for each step

    function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)); }

    // Produce a smooth path for the top of the gradient area with given endpoints
    function makeWavePath(yLeft: number, yRight: number, varianceSeed: number): string {
        // Control points roughly follow sign-up shape but adjusted to match endpoints
        const c1x = 120 + 40 * Math.cos(varianceSeed * 1.3);
        const c2x = 280 + 40 * Math.sin(varianceSeed * 1.1);
        const midY = (yLeft + yRight) / 2;
        const amp = 30 + 10 * Math.sin(varianceSeed * 2.1);
        const c1y = clamp(midY - amp, 80, 180);
        const c2y = clamp(midY + amp, 80, 180);
        // Draw from left to right along the top edge then close at bottom
        return `M0 ${yLeft} C${c1x} ${c1y} ${c2x} ${c2y} 400 ${yRight} L400 200 L0 200 Z`;
    }

    // Ensure left/right Y arrays are populated up to current step
    function ensureWaveForStep(s: number) {
        if (waveLeftY.current[s] !== undefined && waveRightY.current[s] !== undefined) return;
        if (s === 0) {
            waveLeftY.current[0] = 120; // initial left height
        }
        const prevRight = s === 0 ? waveLeftY.current[0] : waveRightY.current[s - 1];
        waveLeftY.current[s] = prevRight;
        // Create a new right height with slight change but keep within bounds
        const delta = 24 * Math.sin((s + 1) * 1.2);
        waveRightY.current[s] = clamp(prevRight + delta, 90, 170);
    }

    function getBottomWavePath(stepIndex: number): string {
        ensureWaveForStep(stepIndex);
        const yL = waveLeftY.current[stepIndex] ?? 120;
        const yR = waveRightY.current[stepIndex] ?? 140;
        // We invert later, so we construct the top curve here and then mirror vertically
        // Convert to the previous coordinate space used (with transform flip)
        // Our path is left->right; to match existing flip, build then mirror
        // After mirroring, the undulation appears at the top and sticks to the bottom
        // Return as-is; we'll remove transform usage below and draw directly
        return makeWavePath(yL, yR, stepIndex);
    }

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

	// Étapes: 0 Intro; 1 Identité; 2 Région; 3 Sports; 4 Rôle; 5 Photo + Envoi
	const [step, setStep] = useState<number>(0);
	function startIntroTransition() { setStep(1); }
    function handleNext() {
        if (step < 5) setStep((s) => Math.min(5, s + 1));
        else handleSave();
    }

    // Transition animation (slide-fade) when step changes
    const transition = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        transition.setValue(0);
        Animated.timing(transition, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [step]);
    const enterStyle = {
        opacity: transition,
        transform: [
            {
                translateX: transition.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
            },
            {
                translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
            },
        ],
    } as any;

	return (
		<View className="flex-1 bg-background">
			<ScrollView className="flex-1" contentContainerClassName={step === 0 ? "pb-0" : "pb-28"}>
				<View className="p-4 gap-y-4">
				{step === 0 ? (
					<Animated.View className="flex-1" style={{ minHeight: 540, ...(enterStyle as object) }}>
						{/* Illustration Lottie centrée */}
						<View className="flex-1 items-center justify-center">
							<LottieView
								source={require("@/assets/Jahd4U1RSM.json")}
								autoPlay
								loop
								style={{ width: 340, height: 340 }}
							/>
						</View>
						{/* Titre + texte juste sous l'illustration */}
						<View className="items-center mb-2">
							<H1 className="text-center">Bienvenue sur TeamUp</H1>
							<Muted className="text-center">{"Nous allons vous poser quelques questions.\nRépondez avec sérieux\npour une meilleure expérience."}</Muted>
						</View>
						
					</Animated.View>
				) : (
					<Animated.View className="flex-1 justify-end" style={{ minHeight: 540, ...(enterStyle as object) }}>
						{/* Titre retiré à la demande */}
						<Muted className="text-center">Veuillez saisir vos informations pour continuer</Muted>
						<View className="gap-y-3 web:m-4 mt-3">
							{/* Étape 1: Identité */}
							{step === 1 ? (
								<View className="gap-y-3">
									<Input placeholder="Prénom" value={firstName} onChangeText={setFirstName} />
									<Input placeholder="Nom" value={lastName} onChangeText={setLastName} />
									<Input placeholder="Âge" keyboardType="number-pad" value={age} onChangeText={setAge} />
								</View>
							) : null}

							{/* Étape 2: Région */}
							{step === 2 ? (
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
							) : null}

							{/* Étape 3: Sports */}
							{step === 3 ? (
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
							) : null}

							{/* Étape 4: Rôle */}
							{step === 4 ? (
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
							) : null}

							{/* Étape 5: Photo */}
							{step === 5 ? (
								<View className="items-center gap-y-2">
									{avatar ? (
										<Image source={{ uri: avatar }} style={{ width: 96, height: 96, borderRadius: 48 }} />
									) : null}
									<Pressable className="rounded-md bg-secondary px-3 py-2" onPress={pickImage}>
										<Text>{avatar ? "Changer la photo" : "Ajouter une photo"}</Text>
									</Pressable>
								</View>
							) : null}

						</View>
					</Animated.View>
				)}

				</View>
			</ScrollView>
			{/* Overlay bas pour l'étape 0: titre + texte + bouton circulaire */}
			{step === 0 ? (
				<View
					pointerEvents="box-none"
					style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: 0, paddingHorizontal: 0, paddingTop: 0 }}
				>
					<View style={{ height: 180 + insets.bottom, position: "relative" }}>
						<Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
							<Defs>
								<SvgLinearGradient id="signupGrad" x1="0" y1="0" x2="1" y2="1">
									<Stop offset="0%" stopColor="#F59E0B" />
									<Stop offset="33%" stopColor="#10B981" />
									<Stop offset="66%" stopColor="#06B6D4" />
									<Stop offset="100%" stopColor="#3B82F6" />
								</SvgLinearGradient>
							</Defs>
                            <Path d="M0 0 H400 V120 C320 180 150 110 0 160 Z" fill="url(#signupGrad)" transform="translate(0,200) scale(1,-1)" />
						</Svg>
						<View style={{ position: "absolute", right: 16, bottom: Math.max(insets.bottom, 12) }}>
							<Pressable accessibilityRole="button" onPress={startIntroTransition} className="flex-row items-center rounded-full bg-white px-5 h-14">
								<Text className="mr-2">Suivant</Text>
								<Ionicons name="chevron-forward" size={24} color="#111827" />
							</Pressable>
						</View>
					</View>
				</View>
			) : null}

			{/* Overlay bas pour étapes 1→5: vague + bouton blanc */}
			{step > 0 ? (
				<View
					pointerEvents="box-none"
					style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: 0, paddingHorizontal: 0, paddingTop: 0 }}
				>
					<View style={{ height: 180 + insets.bottom, position: "relative" }}>
						<Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
							<Defs>
								<SvgLinearGradient id="signupGrad" x1="0" y1="0" x2="1" y2="1">
									<Stop offset="0%" stopColor="#F59E0B" />
									<Stop offset="33%" stopColor="#10B981" />
									<Stop offset="66%" stopColor="#06B6D4" />
									<Stop offset="100%" stopColor="#3B82F6" />
								</SvgLinearGradient>
							</Defs>
                            <Path d="M0 0 H400 V120 C320 180 150 110 0 160 Z" fill="url(#signupGrad)" transform="translate(0,200) scale(1,-1)" />
						</Svg>
						{/* Bouton Retour (gauche) */}
						<View style={{ position: "absolute", left: 16, bottom: Math.max(insets.bottom, 12) }}>
							<Pressable
								accessibilityRole="button"
								onPress={() => setStep((s) => Math.max(0, s - 1))}
								className="flex-row items-center rounded-full bg-white px-5 h-14"
							>
								<Ionicons name="chevron-back" size={24} color="#111827" />
								<Text className="ml-2">Retour</Text>
							</Pressable>
						</View>
						{/* Bouton Suivant (droite) */}
						<View style={{ position: "absolute", right: 16, bottom: Math.max(insets.bottom, 12) }}>
							<Pressable accessibilityRole="button" onPress={handleNext} className="flex-row items-center rounded-full bg-white px-5 h-14">
								<Text className="mr-2">{step < 5 ? "Suivant" : (submitting ? "Envoi..." : "Continuer")}</Text>
								<Ionicons name="chevron-forward" size={24} color="#111827" />
							</Pressable>
						</View>
					</View>
				</View>
			) : null}
			{/* No overlay animation currently (reverted) */}
		</View>
	);
}



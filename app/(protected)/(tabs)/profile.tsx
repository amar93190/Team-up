import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, H3, Muted } from "@/components/ui/typography";
import { FloatingChatButton } from "@/components/floating-chat-button";
import { useAuth } from "@/context/supabase-provider";

export default function ProfileScreen() {
	const { signOut } = useAuth();
	return (
		<View className="flex-1 items-center justify-center bg-background p-4 gap-y-4">
			<H1 className="text-center">Profil</H1>
			<Muted className="text-center">Infos personnelles • Préférences • Favoris</Muted>
			<Button className="w-full" variant="secondary">
				<Text>Gérer mes préférences</Text>
			</Button>
			<Button className="w-full" variant="default" onPress={async () => {
				await signOut();
			}}>
				<Text>Se déconnecter</Text>
			</Button>
		</View>
	);
}



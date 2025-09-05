import { router } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";

export default function ChatModal() {
	return (
		<View className="flex-1 items-center justify-center bg-background p-4 gap-y-4">
			<H1 className="text-center">Messages</H1>
			<Muted className="text-center">
				Accessible partout → Messagerie avec les autres utilisateurs
			</Muted>
			<Button className="w-full" variant="default" onPress={() => router.back()}>
				<Text>Fermer</Text>
			</Button>
		</View>
	);
}



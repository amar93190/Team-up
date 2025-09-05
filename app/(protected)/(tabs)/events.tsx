import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";

export default function EventsScreen() {
	return (
		<View className="flex-1 items-center justify-center bg-background p-4 gap-y-4">
			<H1 className="text-center">Événements</H1>
			<Muted className="text-center">Suivi de tes inscriptions</Muted>
			<Button className="w-full" variant="secondary">
				<Text>Voir les détails d’un événement</Text>
			</Button>
		</View>
	);
}



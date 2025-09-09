import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { Image } from "@/components/image";
import { SafeAreaView } from "@/components/safe-area-view";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";

export default function WelcomeScreen() {
	const router = useRouter();
	const { colorScheme } = useColorScheme();
	const logo = require("@/assets/logo-teamup.png");

	return (
		<View style={{ flex: 1 }}>
			<LinearGradient
				colors={["#F59E0B", "#10B981", "#06B6D4", "#3B82F6"]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
			/>
			<SafeAreaView className="flex flex-1">
				<View className="flex flex-1 items-center justify-center gap-y-4 p-4 web:m-4">
					<Image source={logo} className="w-44 h-44" contentFit="contain" />
				</View>
				<View className="flex flex-col gap-y-4 p-4 web:m-4">
					<Button
						size="default"
						variant="default"
						onPress={() => {
							router.push("/sign-up");
						}}
					>
						<Text>Sign Up</Text>
					</Button>
					<Button
						size="default"
						variant="secondary"
						onPress={() => {
							router.push("/sign-in");
						}}
					>
						<Text>Sign In</Text>
					</Button>
				</View>
			</SafeAreaView>
		</View>
	);
}

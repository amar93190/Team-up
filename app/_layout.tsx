import "../global.css";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider, useAuth } from "@/context/supabase-provider";
import { ToastProvider } from "@/components/ui/toast";
import { NotificationCenterProvider } from "@/context/notification-center";
import { useEffect } from "react";
import { registerForPushNotificationsAsync, savePushToken } from "@/lib/push";
import { View } from "react-native";

SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
	duration: 400,
	fade: true,
});

export default function RootLayout() {
	return (
		<AuthProvider>
			<NotificationCenterProvider>
				<ToastProvider>
					<RootNavigator />
				</ToastProvider>
			</NotificationCenterProvider>
		</AuthProvider>
	);
}

function RootNavigator() {
	const { initialized, session } = useAuth();

	useEffect(() => {
		if (initialized) {
			SplashScreen.hideAsync().catch(() => {});
		}
	}, [initialized]);

	if (!initialized) {
		return <View style={{ flex: 1 }} />;
	}

	return (
		<Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
			<Stack.Protected guard={!!session}>
				<Stack.Screen name="(protected)" />
			</Stack.Protected>

			<Stack.Protected guard={!session}>
				<Stack.Screen name="(public)" />
			</Stack.Protected>
		</Stack>
	);
}

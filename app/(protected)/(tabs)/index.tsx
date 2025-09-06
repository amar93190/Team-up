import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { FloatingChatButton } from "@/components/floating-chat-button";
import { useAuth } from "@/context/supabase-provider";
import { getProfile, isProfileIncomplete } from "@/lib/profiles";

export default function Home() {
    const { session } = useAuth();
    const [checkedProfile, setCheckedProfile] = useState(false);

    useEffect(() => {
        (async () => {
            const userId = session?.user.id;
            if (!userId) return;
            try {
                const profile = await getProfile(userId);
                if (isProfileIncomplete(profile)) {
                    router.replace("/(protected)/onboarding");
                } else {
                    setCheckedProfile(true);
                }
            } catch (_e) {
                // On any read error (RLS/table missing), force onboarding
                router.replace("/(protected)/onboarding");
            }
        })();
    }, [session?.user.id]);

    if (!checkedProfile) {
        return <View className="flex-1 bg-background" />;
    }
	return (
		<View className="flex-1 items-center justify-center bg-background p-4 gap-y-4">
			<H1 className="text-center">Home</H1>
			<Muted className="text-center">
				You are now authenticated and this session will persist even after
				closing the app.
			</Muted>
			<Button
				className="w-full"
				variant="default"
				size="default"
				onPress={() => router.push("/(protected)/modal")}
			>
				<Text>Open Modal</Text>
			</Button>
			<FloatingChatButton />
		</View>
	);
}

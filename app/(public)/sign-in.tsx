import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path } from "react-native-svg";
import * as z from "zod";

import { SafeAreaView } from "@/components/safe-area-view";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormInput } from "@/components/ui/form";
import { Text } from "@/components/ui/text";
import { H1 } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";

const formSchema = z.object({
	email: z.string().email("Please enter a valid email address."),
	password: z
		.string()
		.min(8, "Please enter at least 8 characters.")
		.max(64, "Please enter fewer than 64 characters."),
});

export default function SignIn() {
	const { signIn } = useAuth();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(data: z.infer<typeof formSchema>) {
		try {
			await signIn(data.email, data.password);

			form.reset();
		} catch (error: Error | any) {
			console.error(error.message);
		}
	}

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
			{/* Gradient wave header */}
			<View className="mb-4" style={{ height: 180 }}>
				<Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
					<Defs>
						<SvgLinearGradient id="signinGrad" x1="0" y1="0" x2="1" y2="1">
							<Stop offset="0%" stopColor="#F59E0B" />
							<Stop offset="33%" stopColor="#10B981" />
							<Stop offset="66%" stopColor="#06B6D4" />
							<Stop offset="100%" stopColor="#3B82F6" />
						</SvgLinearGradient>
					</Defs>
					<Path d="M0 0 H400 V120 C320 180 150 110 0 160 Z" fill="url(#signinGrad)" />
				</Svg>
				<View className="absolute left-4 top-10">
					<H1 className="text-white">Sign In</H1>
				</View>
			</View>
			<View className="flex-1 gap-4 p-4 web:m-4">
				<Form {...form}>
					<View className="gap-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormInput
									label="Email"
									placeholder="Email"
									autoCapitalize="none"
									autoComplete="email"
									autoCorrect={false}
									keyboardType="email-address"
									{...field}
								/>
							)}
						/>
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormInput
									label="Password"
									placeholder="Password"
									autoCapitalize="none"
									autoCorrect={false}
									secureTextEntry
									{...field}
								/>
							)}
						/>
					</View>
				</Form>
			</View>
			<Button
				size="default"
				variant="default"
				onPress={form.handleSubmit(onSubmit)}
				disabled={form.formState.isSubmitting}
				className="w-11/12 self-center web:m-4"
			>
				{form.formState.isSubmitting ? (
					<ActivityIndicator size="small" />
				) : (
					<Text>Sign In</Text>
				)}
			</Button>
		</SafeAreaView>
	);
}

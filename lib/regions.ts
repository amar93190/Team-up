import { supabase } from "@/config/supabase";

export type Region = {
	id: number;
	code: string;
	name: string;
};

export async function listRegions() {
	const { data, error } = await supabase
		.from("regions")
		.select("id, code, name")
		.order("name", { ascending: true });
	if (error) throw error;
	return (data as Region[]) ?? [];
}



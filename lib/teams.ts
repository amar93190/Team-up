import { supabase } from "@/config/supabase";

export type Team = {
  id: string;
  event_id: string;
  owner_id: string;
  name: string;
  size: number;
  invite_code: string;
  created_at: string;
};

export async function listApprovedEventsForUser(userId: string) {
  try {
    const regs = await supabase
      .from("event_registrations")
      .select("event_id,status")
      .eq("user_id", userId);
    const rows = regs.data ?? [];
    const approvedIds = rows
      .filter((r: any) => r.status === "approved" || !("status" in r))
      .map((r: any) => r.event_id);
    if (approvedIds.length === 0) return [] as any[];
    const { data } = await supabase
      .from("events")
      .select("id,title,start_at,cover_url,address_text")
      .in("id", approvedIds);
    return data ?? [];
  } catch (e) {
    return [];
  }
}

export async function createTeam(params: { userId: string; eventId: string; name: string; size: number }): Promise<{ team: Team | null; error: string | null }> {
  const { userId, eventId, name, size } = params;
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  try {
    const { data, error } = await supabase
      .from("teams")
      .insert({ owner_id: userId, event_id: eventId, name, size, invite_code: code })
      .select("id,event_id,owner_id,name,size,invite_code,created_at")
      .maybeSingle();
    if (error) throw error;
    if (data?.id) {
      const up = await supabase.from("team_members").upsert({ team_id: data.id, user_id: userId, role: "owner" });
      if (up.error) throw up.error;
    }
    return { team: (data as Team) ?? null, error: null };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    return { team: null, error: msg };
  }
}

export async function joinTeamByCode(userId: string, code: string) {
  try {
    const t = await supabase
      .from("teams")
      .select("id,size")
      .eq("invite_code", code.toUpperCase())
      .maybeSingle();
    if (t.error || !t.data) throw t.error || new Error("Team not found");
    const teamId = (t.data as any).id as string;
    // Optional capacity check (count current members)
    const countRes = await supabase
      .from("team_members")
      .select("user_id", { count: "exact", head: true })
      .eq("team_id", teamId);
    const current = countRes.count ?? 0;
    const capacity = Number((t.data as any).size) || 0;
    if (capacity > 0 && current >= capacity) throw new Error("Équipe complète");
    const { error } = await supabase.from("team_members").upsert({ team_id: teamId, user_id: userId, role: "member" });
    if (error) throw error;
    return true;
  } catch (e) {
    return false;
  }
}

export async function listMyTeams(userId: string) {
  try {
    const { data, error } = await supabase
      .from("team_members")
      .select("team:teams(id,name,size,invite_code,event_id),team_id")
      .eq("user_id", userId);
    if (error) throw error;
    const rows = data ?? [];
    const teamsFromJoin = rows.map((row: any) => row.team).filter(Boolean);
    if (teamsFromJoin.length > 0) return teamsFromJoin;
    // Fallback: fetch teams by ids if join was blocked by RLS
    const ids = Array.from(new Set(rows.map((r: any) => r.team_id).filter(Boolean)));
    if (ids.length === 0) return [];
    const tt = await supabase
      .from("teams")
      .select("id,name,size,invite_code,event_id")
      .in("id", ids);
    if (tt.error) throw tt.error;
    return tt.data ?? [];
  } catch (e) {
    return [];
  }
}

export async function listMyTeamsByEvent(userId: string, eventId: string) {
  try {
    const { data, error } = await supabase
      .from("team_members")
      .select("team:teams(id,name,size,invite_code,event_id),team_id")
      .eq("user_id", userId);
    if (error) throw error;
    const rows = data ?? [];
    const teamsFromJoin = rows.map((row: any) => row.team).filter((t: any) => t && String(t.event_id) === String(eventId));
    if (teamsFromJoin.length > 0) return teamsFromJoin;
    const ids = Array.from(new Set(rows.map((r: any) => r.team_id).filter(Boolean)));
    if (ids.length === 0) return [];
    const tt = await supabase
      .from("teams")
      .select("id,name,size,invite_code,event_id")
      .in("id", ids)
      .eq("event_id", eventId);
    if (tt.error) throw tt.error;
    return tt.data ?? [];
  } catch (e) {
    return [];
  }
}

export type TeamMemberProfile = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

export async function listTeamMemberProfiles(teamId: string): Promise<TeamMemberProfile[]> {
  try {
    // Prefer RPC to avoid RLS recursion issues
    const rpc = await supabase.rpc('team_member_profiles', { p_team_id: teamId });
    if (!rpc.error && Array.isArray(rpc.data)) {
      return (rpc.data as any[]).map((r) => ({
        id: r.id,
        first_name: r.first_name ?? null,
        last_name: r.last_name ?? null,
        avatar_url: r.avatar_url ?? null,
        role: r.role ?? null,
      }));
    }
  } catch {}
  try {
    const mm = await supabase
      .from('team_members')
      .select('user_id,role')
      .eq('team_id', teamId);
    if (mm.error) throw mm.error;
    const ids = (mm.data ?? []).map((m: any) => m.user_id);
    if (ids.length === 0) return [];
    const pp = await supabase
      .from('profiles')
      .select('id,first_name,last_name,avatar_url')
      .in('id', ids);
    if (pp.error) throw pp.error;
    const roleById: Record<string, string | null> = {};
    for (const r of (mm.data ?? []) as any[]) roleById[r.user_id] = r.role ?? null;
    return (pp.data ?? []).map((p: any) => ({ ...p, role: roleById[p.id] ?? null }));
  } catch (e) {
    return [];
  }
}



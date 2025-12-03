import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "./supabase-database";
import type { User, UserRole } from "./types";
import { mapUserRow } from "./supabase";
import { isRoleAllowed } from "./authz";

export const getServerUser = async (): Promise<User | null> => {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return null;
  }
  const { data, error } = await supabase.from("users").select("*").eq("user_id", session.user.id).single();
  if (error || !data) {
    return null;
  }
  return mapUserRow(data);
};

export const requireApiRole = async (allowed: UserRole | UserRole[]) => {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }) };
  }
  if (!isRoleAllowed(user.role, allowed)) {
    return { ok: false, response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }
  return { ok: true, user };
};

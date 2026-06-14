"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabaseClient";
import { isAdminRole } from "@/lib/roles";

async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return isAdminRole(profile?.role);
}

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function syncSession() {
      const { data } = await supabase.auth.getSession();
      const loggedIn = !!data.session;

      if (!active) return;

      setIsLoggedIn(loggedIn);

      if (loggedIn && data.session?.user) {
        setIsAdmin(await fetchIsAdmin(data.session.user.id));
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    }

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const loggedIn = !!session;
      setIsLoggedIn(loggedIn);

      if (loggedIn && session?.user) {
        setIsAdmin(await fetchIsAdmin(session.user.id));
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    isLoggedIn,
    isGuest: !isLoggedIn,
    isAdmin,
    loading,
  };
}

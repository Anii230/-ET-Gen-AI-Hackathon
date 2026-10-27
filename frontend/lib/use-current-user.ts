"use client";

import { useEffect, useState } from "react";

import { createClient } from "./supabase/client";

export const DEMO_USER_ID = "demo_user";

export type CurrentUser = {
  userId: string;
  authenticated: boolean;
  ready: boolean;
};

/**
 * Resolve the signed-in Supabase user, falling back to the demo account.
 *
 * Feed preferences work for guests too (they are stored locally and sent as an
 * explicit category filter), so this never blocks rendering.
 */
export function useCurrentUserId(): CurrentUser {
  const [user, setUser] = useState<CurrentUser>({
    userId: DEMO_USER_ID,
    authenticated: false,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;

    const settleGuest = () => {
      if (cancelled) return;
      setUser({
        userId: DEMO_USER_ID,
        authenticated: false,
        ready: true,
      });
    };

    // Every state update happens in an async callback, never synchronously in
    // the effect body.
    Promise.resolve()
      .then(() => createClient())
      .then((supabase) => supabase.auth.getUser())
      .then(({ data }) => {
        if (cancelled) return;
        const id = data.user?.id;
        setUser({
          userId: id || DEMO_USER_ID,
          authenticated: Boolean(id),
          ready: true,
        });
      })
      .catch(settleGuest);

    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}

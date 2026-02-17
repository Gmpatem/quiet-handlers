"use client";

import { useEffect } from "react";
import { healInvalidRefreshToken } from "@/lib/supabase/browser";

export default function AuthHeal() {
  useEffect(() => {
    healInvalidRefreshToken();
  }, []);

  return null;
}

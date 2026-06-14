"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/hooks/useAuth";
import type { CSSProperties } from "react";

type AdminNavLinkProps = {
  style?: CSSProperties;
  className?: string;
};

export default function AdminNavLink({ style, className }: AdminNavLinkProps) {
  const tNav = useTranslations("Navigation");
  const { isAdmin, loading } = useAuth();

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <Link href="/admin" style={style} className={className}>
      {tNav("admin")}
    </Link>
  );
}

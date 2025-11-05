"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/context/i18n";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [profileOpen]);

  const navItems = useMemo(
    () => [
      { href: "/", label: t("nav_home") },
      { href: "/hub-map", label: t("nav_hub") },
      { href: "/matcher", label: t("nav_matcher") },
      { href: "/profiles", label: t("nav_profiles") },
      { href: "/messages", label: t("nav_messages") },
      { href: "/marketplace", label: t("nav_marketplace") },
      { href: "/events", label: t("nav_events") },
      { href: "/rewards", label: t("nav_rewards") }
    ],
    [t]
  );

  const footerCopy = useMemo(
    () => t("footer_copy").replace("{year}", String(new Date().getFullYear())),
    [t]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-muted-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-5 w-5 text-accent" />
            SpheraConnect
          </Link>
          <nav className="hidden items-center gap-3 text-sm md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 transition-colors hover:bg-border/40",
                  pathname === item.href && "bg-border/60 text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <div className="relative hidden md:block" ref={profileRef}>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-white hover:bg-border/40"
                  onClick={() => setProfileOpen((state) => !state)}
                >
                  <span>{user.displayName || t("nav_profile_fallback")}</span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-border/60 bg-background/95 p-1 text-sm shadow-2xl">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-border/40"
                      onClick={() => {
                        setProfileOpen(false);
                        router.push("/profile");
                      }}
                    >
                      {t("nav_profile")}
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-accent hover:bg-border/40"
                      onClick={async () => {
                        setProfileOpen(false);
                        await logout();
                        router.push("/");
                      }}
                    >
                      {t("nav_sign_out")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="outline" asChild className="hidden md:inline-flex">
                <Link href="/login">{t("nav_sign_in")}</Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((prev) => !prev)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border/60 bg-background/95 px-4 pb-4 md:hidden">
            <nav className="flex flex-col gap-2 pt-4 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 transition-colors hover:bg-border/40",
                    pathname === item.href && "bg-border/60 text-white"
                  )}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="rounded-full px-4 py-2 text-white transition-colors hover:bg-border/40"
                    onClick={() => setOpen(false)}
                  >
                    {t("nav_mobile_view_profile")}
                  </Link>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await logout();
                      setOpen(false);
                      router.push("/");
                    }}
                  >
                    {t("nav_sign_out")}
                  </Button>
                </>
              ) : (
                <Button variant="outline" asChild>
                  <Link href="/login" onClick={() => setOpen(false)}>
                    {t("nav_mobile_login")}
                  </Link>
                </Button>
              )}
            </nav>
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/60 bg-background/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{footerCopy}</span>
          <div className="flex gap-3">
            <Link href="/careers" className="hover:text-white">
              {t("footer_careers")}
            </Link>
            <Link href="/admin" className="hover:text-white">
              {t("footer_admin")}
            </Link>
            <Link href="/create-profile" className="hover:text-white">
              {t("footer_join")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

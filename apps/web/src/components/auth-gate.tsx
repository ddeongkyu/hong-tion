"use client";

import type { Session } from "@supabase/supabase-js";
import {
  ArrowRight,
  CheckCircle2,
  Languages,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type AuthGateLabels = {
  brandLine: string;
  title: string;
  subtitle: string;
  email: string;
  password: string;
  signIn: string;
  signUp: string;
  signingIn: string;
  signingUp: string;
  forgotPassword: string;
  resetPassword: string;
  resetEmailSent: string;
  updatePassword: string;
  updatingPassword: string;
  passwordUpdated: string;
  backToSignIn: string;
  newPassword: string;
  toggleToSignUp: string;
  toggleToSignIn: string;
  confirmEmail: string;
  loading: string;
  realtime: string;
  multilingual: string;
  documentPreviewTitle: string;
  documentPreviewBody: string;
  workspacePreview: string;
  language: string;
};

type AuthGateProps = {
  children: ReactNode;
  labels: AuthGateLabels;
  locale: string;
};

type Mode = "signin" | "signup" | "reset" | "updatePassword";

// 프랑스어는 번역/라우팅 개발을 유지하고, MVP 화면 선택지만 잠시 숨깁니다.
const visibleLocales = [
  "ko",
  "en",
  // "fr",
];

export function AuthGate({ children, labels, locale }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setLoading(false);

      if (event === "PASSWORD_RECOVERY") {
        setPassword("");
        setMode("updatePassword");
        setPasswordRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const supabase = createBrowserSupabaseClient();
    const redirectTo = window.location.href;

    if (mode === "reset") {
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      setSubmitting(false);

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setMessage(labels.resetEmailSent);
      return;
    }

    if (mode === "updatePassword") {
      const result = await supabase.auth.updateUser({ password });

      setSubmitting(false);

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setPassword("");
      setMessage(labels.passwordUpdated);
      setPasswordRecovery(false);
      return;
    }

    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectTo },
          });

    setSubmitting(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage(labels.confirmEmail);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f6f1] px-5 text-[#20231f]">
        <div className="flex items-center gap-3 rounded-md border border-[#d9dfd5] bg-white px-4 py-3 text-sm shadow-[0_18px_50px_rgba(32,35,31,0.08)]">
          <Sparkles size={17} className="text-[#16635b]" />
          {labels.loading}
        </div>
      </main>
    );
  }

  if (session && !passwordRecovery) {
    return children;
  }

  const primaryText =
    mode === "signin"
      ? submitting
        ? labels.signingIn
        : labels.signIn
      : submitting
        ? labels.signingUp
        : labels.signUp;
  const submitText =
    mode === "reset"
      ? labels.resetPassword
      : mode === "updatePassword"
        ? submitting
          ? labels.updatingPassword
          : labels.updatePassword
        : primaryText;
  const passwordLabel = mode === "updatePassword" ? labels.newPassword : labels.password;

  return (
    <main className="min-h-screen bg-[#f4f6f1] text-[#20231f]">
      <div className="grid min-h-screen grid-cols-[minmax(0,1fr)_440px] max-lg:grid-cols-1">
        <section className="flex min-h-screen flex-col justify-between px-10 py-8 max-sm:px-5">
          <header className="flex items-center justify-between gap-4">
            <Link className="flex items-center gap-3" href={`/${locale}`}>
              <span className="grid size-10 place-items-center rounded-md bg-[#173c36] text-sm font-bold text-white shadow-[0_10px_24px_rgba(23,60,54,0.18)]">
                H
              </span>
              <span>
                <span className="block text-sm font-semibold">Hong-tion</span>
                <span className="block text-xs text-[#6a746b]">
                  {labels.brandLine}
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Languages size={16} className="text-[#6a746b]" />
              {visibleLocales.map((nextLocale) => (
                <Link
                  className={`grid h-8 min-w-10 place-items-center rounded-md border text-xs font-semibold transition ${
                    locale === nextLocale
                      ? "border-[#173c36] bg-[#173c36] text-white"
                      : "border-[#d9dfd5] bg-white text-[#4d574c] hover:border-[#aebaae]"
                  }`}
                  href={`/${nextLocale}`}
                  key={nextLocale}
                >
                  {nextLocale.toUpperCase()}
                </Link>
              ))}
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_390px] items-center gap-12 py-12 max-xl:grid-cols-1">
            <div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-normal text-[#20231f] max-sm:text-4xl">
                {labels.title}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4d574c]">
                {labels.subtitle}
              </p>

              <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3 max-sm:grid-cols-1">
                <Feature label={labels.realtime} />
                <Feature label={labels.multilingual} />
                <Feature label={labels.workspacePreview} />
              </div>
            </div>

            <div className="rounded-md border border-[#d9dfd5] bg-white px-5 py-5 shadow-[0_24px_70px_rgba(32,35,31,0.10)]">
              <h2 className="text-xl font-semibold text-[#20231f]">
                {labels.documentPreviewTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#4d574c]">
                {labels.documentPreviewBody}
              </p>
              <div className="mt-6 border-t border-[#e3e8df] pt-5">
                <div className="mb-4 h-3 w-8/12 rounded bg-[#173c36]" />
                <div className="space-y-3">
                  <div className="h-2 w-11/12 rounded bg-[#c9d3c8]" />
                  <div className="h-2 w-9/12 rounded bg-[#d8c98d]" />
                  <div className="h-2 w-10/12 rounded bg-[#a9bfd7]" />
                  <div className="h-2 w-7/12 rounded bg-[#c9d3c8]" />
                </div>
              </div>
            </div>
          </div>

          <footer className="text-xs text-[#6a746b]">Hong-tion v0.1</footer>
        </section>

        <aside className="flex min-h-screen items-center border-l border-[#d9dfd5] bg-[#fbfcf8] px-8 py-7 max-lg:min-h-0 max-lg:border-l-0 max-lg:border-t max-sm:px-5">
          <form className="mx-auto w-full max-w-sm" onSubmit={submit}>
            <div className="mb-8">
              <div className="mb-5 grid size-11 place-items-center rounded-md bg-[#20231f] text-white">
                <Lock size={18} />
              </div>
              <h2 className="text-2xl font-semibold text-[#20231f]">
                {mode === "signin"
                  ? labels.signIn
                  : mode === "signup"
                    ? labels.signUp
                    : mode === "reset"
                      ? labels.resetPassword
                      : labels.updatePassword}
              </h2>
            </div>

            {mode !== "updatePassword" ? (
              <label className="block text-sm font-semibold text-[#4d574c]">
                {labels.email}
                <span className="mt-2 flex h-12 items-center gap-2 rounded-md border border-[#d9dfd5] bg-white px-3 transition focus-within:border-[#173c36] focus-within:shadow-[0_0_0_3px_rgba(23,60,54,0.10)]">
                  <Mail size={16} className="text-[#6a746b]" />
                  <input
                    autoComplete="email"
                    className="min-w-0 flex-1 bg-transparent text-[#20231f] outline-none"
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                </span>
              </label>
            ) : null}

            {mode !== "reset" ? (
              <label className="mt-5 block text-sm font-semibold text-[#4d574c]">
                {passwordLabel}
                <span className="mt-2 flex h-12 items-center gap-2 rounded-md border border-[#d9dfd5] bg-white px-3 transition focus-within:border-[#173c36] focus-within:shadow-[0_0_0_3px_rgba(23,60,54,0.10)]">
                  <Lock size={16} className="text-[#6a746b]" />
                  <input
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="min-w-0 flex-1 bg-transparent text-[#20231f] outline-none"
                    minLength={6}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type="password"
                    value={password}
                  />
                </span>
              </label>
            ) : null}

            {message ? (
              <p className="mt-4 rounded-md border border-[#f9a8d4] bg-[#fff1f2] px-3 py-2 text-sm leading-6 text-[#9f1239]">
                {message}
              </p>
            ) : null}

            <button
              className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#173c36] px-4 text-sm font-semibold text-white transition hover:bg-[#0f2f2a] disabled:cursor-not-allowed disabled:bg-[#9aaca8]"
              disabled={submitting}
              type="submit"
            >
              {submitText}
              <ArrowRight size={16} />
            </button>

            <div className="mt-4 space-y-2">
              {mode === "signin" ? (
                <button
                  className="w-full rounded-md border border-transparent px-3 py-2 text-center text-sm font-semibold text-[#16635b] transition hover:border-[#d9dfd5] hover:bg-white"
                  onClick={() => {
                    setMode("reset");
                    setMessage(null);
                  }}
                  type="button"
                >
                  {labels.forgotPassword}
                </button>
              ) : null}
              <button
                className="w-full rounded-md border border-transparent px-3 py-2 text-center text-sm font-semibold text-[#16635b] transition hover:border-[#d9dfd5] hover:bg-white"
                onClick={() => {
                  if (mode === "updatePassword") {
                    void createBrowserSupabaseClient().auth.signOut();
                  }

                  setMode(mode === "signin" ? "signup" : "signin");
                  setMessage(null);
                  setPassword("");
                  setPasswordRecovery(false);
                }}
                type="button"
              >
                {mode === "signin"
                  ? labels.toggleToSignUp
                  : mode === "signup"
                    ? labels.toggleToSignIn
                    : labels.backToSignIn}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </main>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-md border border-[#d9dfd5] bg-white px-3 py-3 text-sm font-semibold text-[#4d574c] shadow-[0_12px_28px_rgba(32,35,31,0.04)]">
      <CheckCircle2 size={17} className="shrink-0 text-[#16635b]" />
      <span>{label}</span>
    </div>
  );
}

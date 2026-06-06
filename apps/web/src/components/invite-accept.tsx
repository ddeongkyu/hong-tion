"use client";

import { CheckCircle2, CircleAlert, Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { acceptWorkspaceInvitation, ApiRequestError } from "@/lib/api/hongtion";
import { requiredPublicEnv } from "@/lib/env";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type InviteAcceptLabels = {
  accepting: string;
  expired: string;
  forbidden: string;
  goWorkspace: string;
  ready: string;
  retry: string;
  success: string;
  title: string;
};

type InviteAcceptProps = {
  inviteToken: string;
  labels: InviteAcceptLabels;
  locale: string;
};

type InviteState = "accepting" | "success" | "error";

export function InviteAccept({ inviteToken, labels, locale }: InviteAcceptProps) {
  const apiUrl = requiredPublicEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
  const router = useRouter();
  const [state, setState] = useState<InviteState>("accepting");
  const [message, setMessage] = useState(labels.accepting);

  useEffect(() => {
    let cancelled = false;

    async function acceptInvitation() {
      setState("accepting");
      setMessage(labels.accepting);

      try {
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          throw new Error(labels.forbidden);
        }

        await acceptWorkspaceInvitation(apiUrl, token, inviteToken);

        if (!cancelled) {
          setState("success");
          setMessage(labels.success);
        }
      } catch (error) {
        if (!cancelled) {
          setState("error");
          setMessage(inviteErrorMessage(error, labels));
        }
      }
    }

    void acceptInvitation();

    return () => {
      cancelled = true;
    };
  }, [apiUrl, inviteToken, labels]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f6f2] px-5 text-[#24211d]">
      <section className="w-full max-w-md rounded-md border border-[#d8ddd6] bg-[#fffefa] p-5 shadow-[0_24px_80px_rgba(36,33,29,0.12)]">
        <div className="mb-5 grid size-11 place-items-center rounded-md bg-[#16635b] text-white">
          {state === "accepting" ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
        </div>
        <h1 className="text-2xl font-bold">{labels.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#4d574c]">{message}</p>

        {state === "success" ? (
          <button
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#16635b] px-4 text-sm font-semibold text-white"
            onClick={() => router.replace(`/${locale}`)}
            type="button"
          >
            <CheckCircle2 size={16} />
            {labels.goWorkspace}
          </button>
        ) : null}

        {state === "error" ? (
          <button
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#d8ddd6] bg-white px-4 text-sm font-semibold text-[#4d574c]"
            onClick={() => router.refresh()}
            type="button"
          >
            <CircleAlert size={16} />
            {labels.retry}
          </button>
        ) : null}

        {state === "accepting" ? (
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase text-[#687267]">
            <Loader2 className="animate-spin" size={13} />
            {labels.ready}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function inviteErrorMessage(error: unknown, labels: InviteAcceptLabels) {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return labels.forbidden;
    }

    if (error.status === 404) {
      return labels.expired;
    }
  }

  return error instanceof Error ? error.message : labels.expired;
}

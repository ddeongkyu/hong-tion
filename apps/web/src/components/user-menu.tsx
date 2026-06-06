"use client";

import { LogOut, Save, UserCircle } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { type Profile, getProfile, updateProfile } from "@/lib/api/hongtion";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type UserMenuLabels = {
  account: string;
  displayName: string;
  displayNamePlaceholder: string;
  profileSaved: string;
  saveProfile: string;
  signOut: string;
};

type UserMenuProps = {
  apiUrl: string;
  labels: UserMenuLabels;
  onProfileSaved?: (profile: Profile) => void;
};

export function UserMenu({ apiUrl, labels, onProfileSaved }: UserMenuProps) {
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function loadProfile(token?: string) {
      if (!token) {
        setDisplayName(null);
        setDraftName("");
        return;
      }

      const profile = await getProfile(apiUrl, token);
      setDisplayName(profile.display_name);
      setDraftName(profile.display_name ?? "");
      onProfileSaved?.(profile);
    }

    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      void loadProfile(data.session?.access_token);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      void loadProfile(session?.access_token);
    });

    return () => subscription.unsubscribe();
  }, [apiUrl, onProfileSaved]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        return;
      }

      const profile = await updateProfile(apiUrl, token, { display_name: draftName });
      setDisplayName(profile.display_name);
      setDraftName(profile.display_name ?? "");
      setMessage(labels.profileSaved);
      onProfileSaved?.(profile);
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
  }

  const accountLabel = displayName || email || labels.account;

  return (
    <div className="relative">
      <button
        className="flex min-w-0 items-center gap-2 rounded-md border border-[#ddd7ca] bg-white px-2 py-1"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <UserCircle size={18} className="shrink-0 text-[#0f766e]" />
        <span className="max-w-44 truncate text-sm font-medium text-[#514b44]" title={accountLabel}>
          {accountLabel}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-md border border-[#d8ddd6] bg-[#fffefa] p-3 shadow-[0_20px_60px_rgba(36,33,29,0.16)]">
          <div className="mb-3 border-b border-[#e1e5dc] pb-3">
            <p className="truncate text-sm font-semibold text-[#24211d]">{accountLabel}</p>
            {email ? <p className="mt-1 truncate text-xs text-[#687267]">{email}</p> : null}
          </div>

          <form onSubmit={saveProfile}>
            <label className="block text-xs font-semibold text-[#4d574c]">
              {labels.displayName}
              <input
                className="mt-2 h-10 w-full rounded-md border border-[#d8ddd6] bg-white px-3 text-sm text-[#24211d] outline-none focus:border-[#16635b]"
                onChange={(event) => setDraftName(event.target.value)}
                placeholder={labels.displayNamePlaceholder}
                value={draftName}
              />
            </label>

            {message ? <p className="mt-2 text-xs font-semibold text-[#16635b]">{message}</p> : null}

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <button
                className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#16635b] px-3 text-sm font-semibold text-white disabled:cursor-wait disabled:bg-[#9ab7b2]"
                disabled={saving}
                type="submit"
              >
                <Save size={15} />
                {labels.saveProfile}
              </button>
              <button
                className="grid size-10 place-items-center rounded-md border border-[#d8ddd6] bg-white text-[#4d574c]"
                onClick={() => void signOut()}
                title={labels.signOut}
                type="button"
              >
                <LogOut size={16} />
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

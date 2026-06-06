"use client";

import { RefreshCw, Server, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Labels = {
  title: string;
  checking: string;
  connected: string;
  unavailable: string;
  authRequired: string;
  workspaces: string;
  page: string;
  blocks: string;
  database: string;
  refresh: string;
  bootstrapping: string;
  ready: string;
  defaultWorkspaceName: string;
  defaultPageTitle: string;
  starterHeading: string;
  starterParagraph: string;
  starterBulletOne: string;
  starterBulletTwo: string;
  starterCode: string;
};

type WorkspaceApiPanelProps = {
  labels: Labels;
};

type PanelState = {
  status: "loading" | "ok" | "error";
  database?: string;
  schema?: string;
  workspaceCount?: number;
  pageTitle?: string;
  blockCount?: number;
  authRequired?: boolean;
  error?: string;
};

type Workspace = {
  id: string;
  name: string;
};

type Page = {
  id: string;
  title: string;
  blocks?: Block[] | null;
};

type Block = {
  id: string;
};

export function WorkspaceApiPanel({ labels }: WorkspaceApiPanelProps) {
  const [state, setState] = useState<PanelState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const dbResponse = await fetch(`${apiUrl}/api/health/db`, {
        cache: "no-store",
      });

      if (!dbResponse.ok) {
        throw new Error(`DB health failed with ${dbResponse.status}`);
      }

      const db = (await dbResponse.json()) as {
        database?: string;
        schema?: string;
      };

      const supabase = createBrowserSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setState({
          status: "ok",
          database: db.database,
          schema: db.schema,
          authRequired: true,
        });
        return;
      }

      const headers = {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      };

      setState({
        status: "loading",
        database: db.database,
        schema: db.schema,
      });

      const workspaceResponse = await fetch(`${apiUrl}/api/workspaces`, {
        cache: "no-store",
        headers,
      });

      if (!workspaceResponse.ok) {
        throw new Error(`Workspace API failed with ${workspaceResponse.status}`);
      }

      const workspaces = (await workspaceResponse.json()) as {
        data?: Workspace[];
      };

      let workspace = workspaces.data?.[0];

      if (!workspace) {
        const createdWorkspace = await post<{ data: Workspace }>(
          `${apiUrl}/api/workspaces`,
          headers,
          {
            workspace: {
              name: labels.defaultWorkspaceName,
              icon: "H",
              default_locale: "ko",
            },
          },
        );

        workspace = createdWorkspace.data;
      }

      const pages = await get<{ data?: Page[] }>(
        `${apiUrl}/api/workspaces/${workspace.id}/pages`,
        headers,
      );

      let page = pages.data?.[0];

      if (!page) {
        const createdPage = await post<{ data: Page }>(`${apiUrl}/api/pages`, headers, {
          page: {
            workspace_id: workspace.id,
            title: labels.defaultPageTitle,
            icon: "문",
            position: "a0",
          },
        });

        page = createdPage.data;
      }

      if (!page) {
        throw new Error("Page bootstrap failed.");
      }

      const pageId = page.id;
      const pageDetail = await get<{ data: Page }>(`${apiUrl}/api/pages/${page.id}`, headers);
      let blocks = pageDetail.data.blocks ?? [];

      if (blocks.length === 0) {
        const starterBlocks = [
          {
            type: "heading_1",
            content: { text: labels.starterHeading },
            position: "a0",
          },
          {
            type: "paragraph",
            content: { text: labels.starterParagraph },
            position: "a1",
          },
          {
            type: "bulleted_list",
            content: { text: labels.starterBulletOne },
            position: "a2",
          },
          {
            type: "bulleted_list",
            content: { text: labels.starterBulletTwo },
            position: "a3",
          },
          {
            type: "code",
            content: { text: labels.starterCode, language: "elixir" },
            position: "a4",
          },
        ];

        await Promise.all(
          starterBlocks.map((block) =>
            post<{ data: Block }>(`${apiUrl}/api/blocks`, headers, {
              block: {
                page_id: pageId,
                ...block,
              },
            }),
          ),
        );

        const refreshedPage = await get<{ data: Page }>(
          `${apiUrl}/api/pages/${pageId}`,
          headers,
        );
        blocks = refreshedPage.data.blocks ?? [];
        page = refreshedPage.data;
      }

      setState({
        status: "ok",
        database: db.database,
        schema: db.schema,
        workspaceCount: workspace ? 1 : 0,
        pageTitle: page.title,
        blockCount: blocks.length,
      });
    } catch (error) {
      setState({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [labels]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="rounded-md border border-[#ddd7ca] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Server size={16} className="text-[#0f766e]" />
          <h3 className="text-sm font-semibold">{labels.title}</h3>
        </div>
        <button
          className="grid size-8 place-items-center rounded-md border border-[#ddd7ca] bg-[#fffdf8] text-[#514b44]"
          onClick={() => void load()}
          title={labels.refresh}
          type="button"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="mt-4 space-y-3 text-sm text-[#514b44]">
        <StatusRow
          label="API"
          value={
            state.status === "loading"
              ? state.database
                ? labels.bootstrapping
                : labels.checking
              : state.status === "ok"
                ? labels.ready
                : labels.unavailable
          }
          ok={state.status === "ok"}
        />
        <StatusRow
          label={labels.database}
          value={state.database && state.schema ? `${state.database}/${state.schema}` : "-"}
          ok={Boolean(state.database)}
        />
        <StatusRow
          label={labels.workspaces}
          value={
            state.authRequired
              ? labels.authRequired
              : typeof state.workspaceCount === "number"
                ? String(state.workspaceCount)
                : "-"
          }
          ok={typeof state.workspaceCount === "number"}
        />
        <StatusRow
          label={labels.page}
          value={state.pageTitle ?? "-"}
          ok={Boolean(state.pageTitle)}
        />
        <StatusRow
          label={labels.blocks}
          value={typeof state.blockCount === "number" ? String(state.blockCount) : "-"}
          ok={typeof state.blockCount === "number"}
        />
      </div>

      {state.error ? (
        <p className="mt-3 break-words text-xs leading-5 text-[#9f1239]">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

async function get<T>(url: string, headers: HeadersInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function post<T>(url: string, headers: HeadersInit, body: unknown): Promise<T> {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`POST ${url} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function StatusRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-[#746c62]">
        <ShieldCheck size={14} className={ok ? "text-[#0f766e]" : "text-[#90877a]"} />
        {label}
      </span>
      <span className="min-w-0 truncate font-medium text-[#24211d]">{value}</span>
    </div>
  );
}

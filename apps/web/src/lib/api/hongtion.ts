"use client";

export type BlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list"
  | "numbered_list"
  | "code"
  | "image"
  | "file";

export type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  owner_id: string;
  default_locale: string;
  created_at: string | null;
  updated_at: string | null;
};

export type Page = {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  cover_url: string | null;
  position: string | null;
  share_scope: string;
  is_deleted: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  blocks?: Block[] | null;
};

export type Block = {
  id: string;
  page_id: string;
  parent_block_id: string | null;
  type: BlockType;
  content: { text?: string; language?: string; [key: string]: unknown };
  position: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WorkspaceMember = {
  workspace_id: string;
  user_id: string;
  role: "viewer" | "editor" | "owner";
  joined_at: string | null;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  locale: string | null;
  timezone: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WorkspaceInvitation = {
  id: string;
  workspace_id: string;
  email: string;
  role: "viewer" | "editor" | "owner";
  status: "pending" | "accepted" | "revoked" | "expired";
  invite_token: string;
  invited_by: string;
  accepted_by: string | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Comment = {
  id: string;
  page_id: string;
  block_id: string | null;
  user_id: string;
  content: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Notification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string | null;
};

export type FileAsset = {
  id: string;
  workspace_id: string;
  page_id: string | null;
  block_id: string | null;
  storage_bucket: string;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  status: "uploading" | "uploaded" | "failed" | "deleted";
  uploaded_by: string;
  created_at: string | null;
  updated_at: string | null;
};

export type SearchResult = {
  kind: "page" | "block";
  page_id: string;
  block_id: string | null;
  title: string | null;
  excerpt: string | null;
  rank: number;
  updated_at: string | null;
};

export type PageVersion = {
  id: string;
  page_id: string;
  created_by: string | null;
  created_at: string | null;
  reason: string | null;
  title: string | null;
  block_count: number;
};

export type DatabaseHealth = {
  status: string;
  database?: string;
  schema?: string;
  checked_at?: string;
};

type ApiEnvelope<T> = {
  data: T;
};

type JsonBody = Record<string, unknown>;

export class ApiRequestError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

export function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function getDatabaseHealth(apiUrl: string) {
  return request<DatabaseHealth>(`${apiUrl}/api/health/db`);
}

export async function getProfile(apiUrl: string, token: string) {
  const response = await request<ApiEnvelope<Profile>>(`${apiUrl}/api/profile`, {
    headers: authHeaders(token),
  });

  return response.data;
}

export async function updateProfile(
  apiUrl: string,
  token: string,
  attrs: Partial<Pick<Profile, "display_name" | "avatar_url" | "locale" | "timezone">>,
) {
  const response = await request<ApiEnvelope<Profile>>(`${apiUrl}/api/profile`, {
    body: { profile: attrs },
    headers: authHeaders(token),
    method: "PATCH",
  });

  return response.data;
}

export async function listWorkspaces(apiUrl: string, token: string) {
  const response = await request<ApiEnvelope<Workspace[]>>(`${apiUrl}/api/workspaces`, {
    headers: authHeaders(token),
  });

  return response.data;
}

export async function createWorkspace(
  apiUrl: string,
  token: string,
  attrs: Pick<Workspace, "name"> & Partial<Pick<Workspace, "icon" | "default_locale">>,
) {
  const response = await request<ApiEnvelope<Workspace>>(`${apiUrl}/api/workspaces`, {
    body: { workspace: attrs },
    headers: authHeaders(token),
    method: "POST",
  });

  return response.data;
}

export async function listWorkspaceMembers(apiUrl: string, token: string, workspaceId: string) {
  const response = await request<ApiEnvelope<WorkspaceMember[]>>(
    `${apiUrl}/api/workspaces/${workspaceId}/members`,
    { headers: authHeaders(token) },
  );

  return response.data;
}

export async function listWorkspaceInvitations(apiUrl: string, token: string, workspaceId: string) {
  const response = await request<ApiEnvelope<WorkspaceInvitation[]>>(
    `${apiUrl}/api/workspaces/${workspaceId}/invitations`,
    { headers: authHeaders(token) },
  );

  return response.data;
}

export async function inviteWorkspaceMember(
  apiUrl: string,
  token: string,
  workspaceId: string,
  attrs: { email: string; role: "viewer" | "editor" },
) {
  const response = await request<ApiEnvelope<WorkspaceInvitation>>(
    `${apiUrl}/api/workspaces/${workspaceId}/invitations`,
    {
      body: { invitation: attrs },
      headers: authHeaders(token),
      method: "POST",
    },
  );

  return response.data;
}

export async function updateWorkspaceMemberRole(
  apiUrl: string,
  token: string,
  workspaceId: string,
  userId: string,
  role: "viewer" | "editor",
) {
  const response = await request<ApiEnvelope<WorkspaceMember[]>>(
    `${apiUrl}/api/workspaces/${workspaceId}/members/${userId}`,
    {
      body: { member: { role } },
      headers: authHeaders(token),
      method: "PATCH",
    },
  );

  return response.data;
}

export async function removeWorkspaceMember(
  apiUrl: string,
  token: string,
  workspaceId: string,
  userId: string,
) {
  const response = await request<ApiEnvelope<WorkspaceMember[]>>(
    `${apiUrl}/api/workspaces/${workspaceId}/members/${userId}`,
    {
      headers: authHeaders(token),
      method: "DELETE",
    },
  );

  return response.data;
}

export async function acceptWorkspaceInvitation(
  apiUrl: string,
  token: string,
  inviteToken: string,
) {
  const response = await request<ApiEnvelope<WorkspaceInvitation>>(
    `${apiUrl}/api/invitations/${inviteToken}/accept`,
    {
      headers: authHeaders(token),
      method: "POST",
    },
  );

  return response.data;
}

export async function listPages(apiUrl: string, token: string, workspaceId: string) {
  const response = await request<ApiEnvelope<Page[]>>(
    `${apiUrl}/api/workspaces/${workspaceId}/pages`,
    { headers: authHeaders(token) },
  );

  return response.data;
}

export async function searchWorkspace(
  apiUrl: string,
  token: string,
  workspaceId: string,
  query: string,
) {
  const params = new URLSearchParams({ q: query });
  const response = await request<ApiEnvelope<SearchResult[]>>(
    `${apiUrl}/api/workspaces/${workspaceId}/search?${params.toString()}`,
    { headers: authHeaders(token) },
  );

  return response.data;
}

export async function listTrashPages(apiUrl: string, token: string, workspaceId: string) {
  const response = await request<ApiEnvelope<Page[]>>(
    `${apiUrl}/api/workspaces/${workspaceId}/trash`,
    { headers: authHeaders(token) },
  );

  return response.data;
}

export async function getPage(apiUrl: string, token: string, pageId: string) {
  const response = await request<ApiEnvelope<Page>>(`${apiUrl}/api/pages/${pageId}`, {
    headers: authHeaders(token),
  });

  return response.data;
}

export async function listComments(apiUrl: string, token: string, pageId: string) {
  const response = await request<ApiEnvelope<Comment[]>>(`${apiUrl}/api/pages/${pageId}/comments`, {
    headers: authHeaders(token),
  });

  return response.data;
}

export async function createComment(
  apiUrl: string,
  token: string,
  pageId: string,
  attrs: { block_id?: string | null; content: string },
) {
  const response = await request<ApiEnvelope<Comment>>(`${apiUrl}/api/pages/${pageId}/comments`, {
    body: { comment: attrs },
    headers: authHeaders(token),
    method: "POST",
  });

  return response.data;
}

export async function resolveComment(apiUrl: string, token: string, commentId: string) {
  const response = await request<ApiEnvelope<Comment>>(`${apiUrl}/api/comments/${commentId}/resolve`, {
    headers: authHeaders(token),
    method: "PATCH",
  });

  return response.data;
}

export async function createPage(
  apiUrl: string,
  token: string,
  attrs: {
    workspace_id: string;
    parent_id?: string | null;
    title: string;
    icon?: string;
    position?: string;
  },
) {
  const response = await request<ApiEnvelope<Page>>(`${apiUrl}/api/pages`, {
    body: { page: attrs },
    headers: authHeaders(token),
    method: "POST",
  });

  return response.data;
}

export async function updatePage(
  apiUrl: string,
  token: string,
  pageId: string,
  attrs: Partial<Pick<Page, "title" | "icon" | "parent_id" | "position" | "share_scope">>,
) {
  const response = await request<ApiEnvelope<Page>>(`${apiUrl}/api/pages/${pageId}`, {
    body: { page: attrs },
    headers: authHeaders(token),
    method: "PATCH",
  });

  return response.data;
}

export async function deletePage(apiUrl: string, token: string, pageId: string) {
  const response = await request<ApiEnvelope<Page>>(`${apiUrl}/api/pages/${pageId}`, {
    headers: authHeaders(token),
    method: "DELETE",
  });

  return response.data;
}

export async function restorePage(apiUrl: string, token: string, pageId: string) {
  const response = await request<ApiEnvelope<Page>>(`${apiUrl}/api/pages/${pageId}/restore`, {
    headers: authHeaders(token),
    method: "PATCH",
  });

  return response.data;
}

export async function listPageVersions(apiUrl: string, token: string, pageId: string) {
  const response = await request<ApiEnvelope<PageVersion[]>>(
    `${apiUrl}/api/pages/${pageId}/versions`,
    { headers: authHeaders(token) },
  );

  return response.data;
}

export async function restorePageVersion(
  apiUrl: string,
  token: string,
  pageId: string,
  versionId: string,
) {
  const response = await request<ApiEnvelope<Page>>(
    `${apiUrl}/api/pages/${pageId}/versions/${versionId}/restore`,
    {
      headers: authHeaders(token),
      method: "POST",
    },
  );

  return response.data;
}

export async function createBlock(
  apiUrl: string,
  token: string,
  attrs: {
    page_id: string;
    type: BlockType;
    content: Block["content"];
    parent_block_id?: string | null;
    position?: string;
  },
) {
  const response = await request<ApiEnvelope<Block>>(`${apiUrl}/api/blocks`, {
    body: { block: attrs },
    headers: authHeaders(token),
    method: "POST",
  });

  return response.data;
}

export async function updateBlock(
  apiUrl: string,
  token: string,
  blockId: string,
  attrs: Partial<Pick<Block, "type" | "content" | "position" | "parent_block_id">>,
) {
  const response = await request<ApiEnvelope<Block>>(`${apiUrl}/api/blocks/${blockId}`, {
    body: { block: attrs },
    headers: authHeaders(token),
    method: "PATCH",
  });

  return response.data;
}

export async function deleteBlock(apiUrl: string, token: string, blockId: string) {
  const response = await request<ApiEnvelope<Block>>(`${apiUrl}/api/blocks/${blockId}`, {
    headers: authHeaders(token),
    method: "DELETE",
  });

  return response.data;
}

export async function listNotifications(apiUrl: string, token: string) {
  const response = await request<ApiEnvelope<Notification[]>>(`${apiUrl}/api/notifications`, {
    headers: authHeaders(token),
  });

  return response.data;
}

export async function markNotificationsRead(apiUrl: string, token: string) {
  const response = await request<ApiEnvelope<{ count: number }>>(`${apiUrl}/api/notifications/read`, {
    headers: authHeaders(token),
    method: "PATCH",
  });

  return response.data;
}

export async function listFileAssets(apiUrl: string, token: string, workspaceId: string) {
  const response = await request<ApiEnvelope<FileAsset[]>>(
    `${apiUrl}/api/workspaces/${workspaceId}/files`,
    { headers: authHeaders(token) },
  );

  return response.data;
}

export async function createFileAsset(
  apiUrl: string,
  token: string,
  workspaceId: string,
  attrs: {
    block_id?: string | null;
    mime_type?: string | null;
    original_name: string;
    page_id?: string | null;
    size_bytes?: number;
    storage_bucket: string;
    storage_path: string;
  },
) {
  const response = await request<ApiEnvelope<FileAsset>>(
    `${apiUrl}/api/workspaces/${workspaceId}/files`,
    {
      body: { file: attrs },
      headers: authHeaders(token),
      method: "POST",
    },
  );

  return response.data;
}

async function request<T>(
  url: string,
  init: Omit<RequestInit, "body"> & { body?: JsonBody } = {},
): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const parsedError = parseApiError(errorText);

    throw new ApiRequestError(
      parsedError || `${init.method ?? "GET"} ${url} failed with ${response.status}`,
      response.status,
      errorText,
    );
  }

  return (await response.json()) as T;
}

function parseApiError(errorText: string) {
  if (!errorText) {
    return "";
  }

  try {
    const parsed = JSON.parse(errorText) as { errors?: unknown };

    if (!parsed.errors) {
      return errorText;
    }

    if (typeof parsed.errors === "string") {
      return parsed.errors;
    }

    if (isRecord(parsed.errors)) {
      if (typeof parsed.errors.detail === "string") {
        return parsed.errors.detail;
      }

      return Object.entries(parsed.errors)
        .flatMap(([field, value]) => {
          if (Array.isArray(value)) {
            return value.map((message) => `${field} ${message}`);
          }

          if (typeof value === "string") {
            return [`${field} ${value}`];
          }

          return [];
        })
        .join(", ");
    }
  } catch {
    return errorText;
  }

  return errorText;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

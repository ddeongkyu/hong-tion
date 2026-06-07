"use client";

import {
  AtSign,
  Bell,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  ChevronRight,
  Clock3,
  Code2,
  Command,
  Copy,
  FileText,
  Hash,
  Heading1,
  Heading2,
  ImageIcon,
  Inbox,
  Languages,
  List,
  Loader2,
  Lock,
  MessageSquare,
  MoreHorizontal,
  MoveDown,
  MoveUp,
  PanelLeft,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import type { Channel, Socket } from "phoenix";
import {
  type KeyboardEvent,
  type ClipboardEvent,
  type DragEvent,
  type RefCallback,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { UserMenu } from "@/components/user-menu";
import {
  type Block,
  type BlockType,
  type Comment,
  type DatabaseHealth,
  type FileAsset,
  type Notification,
  type Page,
  type PageVersion,
  type Profile,
  type SearchResult,
  type Workspace,
  type WorkspaceInvitation,
  type WorkspaceMember,
  createBlock,
  createComment,
  createFileAsset,
  createPage,
  createWorkspace,
  deleteBlock,
  deletePage,
  getDatabaseHealth,
  getPage,
  inviteWorkspaceMember,
  listComments,
  listFileAssets,
  listNotifications,
  listPageVersions,
  listPages,
  listTrashPages,
  listWorkspaceInvitations,
  listWorkspaceMembers,
  listWorkspaces,
  markNotificationsRead,
  removeWorkspaceMember,
  resolveComment,
  restorePage,
  restorePageVersion,
  searchWorkspace,
  updateBlock,
  updatePage,
  updateWorkspaceMemberRole,
} from "@/lib/api/hongtion";
import { requiredPublicEnv } from "@/lib/env";
import { createHongtionSocket } from "@/lib/phoenix/socket";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type WorkspaceShellLabels = {
  actions: {
    accepted: string;
    addComment: string;
    blockDown: string;
    blockUp: string;
    closePanel: string;
    commentPlaceholder: string;
    comments: string;
    copied: string;
    copyUnavailable: string;
    copyInvitationLink: string;
    copyLink: string;
    duplicatePage: string;
    editor: string;
    editorsOnly: string;
    files: string;
    history: string;
    invitations: string;
    inviteEmail: string;
    invitationAccepted: string;
    invitationReady: string;
    inviteLink: string;
    inviteMember: string;
    inviteRole: string;
    link: string;
    markAllRead: string;
    members: string;
    noComments: string;
    noNotifications: string;
    noHistory: string;
    noSearchResults: string;
    noTrash: string;
    noUploadedFiles: string;
    notifications: string;
    notificationsRead: string;
    owner: string;
    ownersOnly: string;
    pageIcon: string;
    pageTools: string;
    parentPage: string;
    pending: string;
    private: string;
    removeMember: string;
    removeMemberConfirm: string;
    resolveComment: string;
    restorePage: string;
    restoreVersion: string;
    rootPage: string;
    searchResults: string;
    sharePage: string;
    shareScope: string;
    savePageSettings: string;
    uploadFile: string;
    uploadFailed: string;
    uploadedFiles: string;
    uploadImage: string;
    uploadReady: string;
    uploadTooLarge: string;
    uploadTypeUnsupported: string;
    pageRestored: string;
    trash: string;
    versionRestored: string;
    viewer: string;
    workspace: string;
  };
  authExpired: string;
  workspaceName: string;
  collapse: string;
  newPage: string;
  search: string;
  updates: string;
  share: string;
  more: string;
  pageMenu: string;
  language: string;
  account: {
    account: string;
    displayName: string;
    displayNamePlaceholder: string;
    profileSaved: string;
    saveProfile: string;
    signOut: string;
  };
  bootstrap: {
    workspaceName: string;
    pageTitle: string;
  };
  blocks: {
    headline: string;
    paragraph: string;
    bulletOne: string;
    bulletTwo: string;
    code: string;
  };
  panel: {
    title: string;
    authRequired: string;
    page: string;
    blocks: string;
    presence: string;
    presenceBody: string;
    next: string;
    nextBody: string;
  };
  editor: {
    untitled: string;
    loading: string;
    empty: string;
    retry: string;
    saving: string;
    saved: string;
    error: string;
    addBlock: string;
    deleteBlock: string;
    deletePage: string;
    deletePageConfirm: string;
    newChildPage: string;
    selectBlockType: string;
    paragraph: string;
    heading1: string;
    heading2: string;
    heading3: string;
    bulletedList: string;
    numberedList: string;
    code: string;
    image: string;
    file: string;
    slashHint: string;
    placeholder: string;
    placeholderHeading: string;
    placeholderCode: string;
    searchPages: string;
    noPages: string;
    workspaceReady: string;
  };
};

type WorkspaceShellProps = {
  labels: WorkspaceShellLabels;
  locale: string;
};

type LoadState = {
  status: "loading" | "ready" | "error" | "auth";
  database?: DatabaseHealth;
  workspace?: Workspace;
  currentUserId?: string;
  workspaces: Workspace[];
  pages: Page[];
  activePage?: Page;
  blocks: Block[];
  comments: Comment[];
  files: FileAsset[];
  invitations: WorkspaceInvitation[];
  members: WorkspaceMember[];
  notifications: Notification[];
  pageVersions: PageVersion[];
  error?: string;
  searchResults: SearchResult[];
  trashPages: Page[];
};

type PageNode = Page & {
  children: PageNode[];
  depth: number;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type SlashMenuState = {
  blockId: string;
  index: number;
  query: string;
};

type WorkspacePanel = "notifications" | "share" | "more" | null;

const collaborators = ["HK", "ML", "JP"];

// 프랑스어는 번역/라우팅 개발을 유지하고, MVP 화면 선택지만 잠시 숨깁니다.
const visibleLocales = [
  "ko",
  "en",
  // "fr",
];

const blockTypeOptions: Array<{
  type: BlockType;
  labelKey: keyof WorkspaceShellLabels["editor"];
  marker: string;
}> = [
  { type: "paragraph", labelKey: "paragraph", marker: "P" },
  { type: "heading_1", labelKey: "heading1", marker: "H1" },
  { type: "heading_2", labelKey: "heading2", marker: "H2" },
  { type: "heading_3", labelKey: "heading3", marker: "H3" },
  { type: "bulleted_list", labelKey: "bulletedList", marker: "•" },
  { type: "numbered_list", labelKey: "numberedList", marker: "1." },
  { type: "code", labelKey: "code", marker: "</>" },
  { type: "image", labelKey: "image", marker: "IMG" },
  { type: "file", labelKey: "file", marker: "FILE" },
];

const maxUploadBytes = 10 * 1024 * 1024;
const allowedUploadTypes = new Set([
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/markdown",
  "text/plain",
]);

export function WorkspaceShell({ labels, locale }: WorkspaceShellProps) {
  const apiUrl = requiredPublicEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
  const [state, setState] = useState<LoadState>({
    blocks: [],
    comments: [],
    files: [],
    invitations: [],
    members: [],
    notifications: [],
    pageVersions: [],
    pages: [],
    searchResults: [],
    status: "loading",
    trashPages: [],
    workspaces: [],
  });
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [pendingFocusBlockId, setPendingFocusBlockId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
  const [slashSelectionIndex, setSlashSelectionIndex] = useState(0);
  const [collapsedPageIds, setCollapsedPageIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [workspacePanel, setWorkspacePanel] = useState<WorkspacePanel>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pageIconDraft, setPageIconDraft] = useState("문");
  const [parentPageDraft, setParentPageDraft] = useState<string>("");
  const [commentDraft, setCommentDraft] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("editor");
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const blockRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const blockSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePageIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    setPageIconDraft(state.activePage?.icon ?? "문");
    setParentPageDraft(state.activePage?.parent_id ?? "");
  }, [state.activePage?.id, state.activePage?.icon, state.activePage?.parent_id]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = setTimeout(() => setToastMessage(null), 2200);

    return () => clearTimeout(timer);
  }, [toastMessage]);

  const load = useCallback(
    async (preferredPageId?: string) => {
      setState((current) => ({
        ...current,
        error: undefined,
        status: "loading",
      }));

      try {
        const database = await getDatabaseHealth(apiUrl);
        const session = await getCurrentSession();
        const token = session?.access_token;

        if (!token) {
          setState({
            blocks: [],
            comments: [],
            currentUserId: undefined,
            database,
            files: [],
            invitations: [],
            members: [],
            notifications: [],
            pageVersions: [],
            pages: [],
            searchResults: [],
            status: "auth",
            trashPages: [],
            workspaces: [],
          });
          return;
        }

        let workspaces = await listWorkspaces(apiUrl, token);
        let workspace = workspaces[0];

        if (!workspace) {
          workspace = await createInitialWorkspace(apiUrl, token, session.user.id, labels);
          workspaces = [workspace];
        }

        let pages = await listPages(apiUrl, token, workspace.id);
        const requestedPageId =
          preferredPageId ??
          getPageIdFromUrl() ??
          activePageIdRef.current ??
          getStoredPageId(workspace.id);
        let selectedPage = selectPageAfterRefresh(
          pages,
          requestedPageId,
        );

        if (!selectedPage) {
          selectedPage = await createInitialPage(apiUrl, token, workspace.id, labels);
          pages = upsertPage(pages, selectedPage);
        }

        const pageWithBlocks = await ensureStarterBlocks(
          apiUrl,
          token,
          selectedPage.id,
          labels,
        );

        activePageIdRef.current = pageWithBlocks.id;
        persistActivePage(workspace.id, pageWithBlocks.id);

        const [members, invitations, comments, notifications, files, trashPages, pageVersions] = await Promise.all([
          listWorkspaceMembers(apiUrl, token, workspace.id),
          listWorkspaceInvitations(apiUrl, token, workspace.id),
          listComments(apiUrl, token, pageWithBlocks.id),
          listNotifications(apiUrl, token),
          listFileAssets(apiUrl, token, workspace.id),
          listTrashPages(apiUrl, token, workspace.id),
          listPageVersions(apiUrl, token, pageWithBlocks.id),
        ]);

        setState({
          blocks: pageWithBlocks.blocks ?? [],
          comments,
          currentUserId: session.user.id,
          database,
          files,
          invitations,
          members,
          notifications,
          pageVersions,
          pages: upsertPage(pages, pageWithBlocks),
          searchResults: [],
          activePage: pageWithBlocks,
          status: "ready",
          trashPages,
          workspace,
          workspaces,
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Unknown error",
          status: "error",
        }));
      }
    },
    [apiUrl, labels],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || !state.workspace) {
      setSearching(false);
      setState((current) =>
        current.searchResults.length > 0 ? { ...current, searchResults: [] } : current,
      );
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      async function runSearch() {
        const token = await getCurrentToken();

        if (!token || cancelled || !state.workspace) {
          return;
        }

        setSearching(true);

        try {
          const results = await searchWorkspace(apiUrl, token, state.workspace.id, trimmedQuery);

          if (!cancelled) {
            setState((current) => ({ ...current, searchResults: results }));
          }
        } finally {
          if (!cancelled) {
            setSearching(false);
          }
        }
      }

      void runSearch();
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [apiUrl, query, state.workspace]);

  useEffect(() => {
    const timers = blockSaveTimers.current;

    return () => {
      Object.values(timers).forEach(clearTimeout);

      if (titleSaveTimer.current) {
        clearTimeout(titleSaveTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pendingFocusBlockId) {
      return;
    }

    const textarea = blockRefs.current[pendingFocusBlockId];

    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      resizeTextarea(textarea);
      setPendingFocusBlockId(null);
    }
  }, [pendingFocusBlockId, state.blocks]);

  useEffect(() => {
    if (!state.activePage) {
      return;
    }

    const ancestorIds = collectAncestorPageIds(state.pages, state.activePage);

    if (ancestorIds.length === 0) {
      return;
    }

    setCollapsedPageIds((current) => {
      const next = new Set(current);
      ancestorIds.forEach((id) => next.delete(id));
      return next;
    });
  }, [state.activePage, state.pages]);

  useEffect(() => {
    const pageId = state.activePage?.id;

    if (!pageId) {
      return;
    }

    let cancelled = false;

    async function connectRealtime() {
      const token = await getCurrentToken();

      if (!token || cancelled) {
        return;
      }

      const socket = createHongtionSocket(token);
      socket.connect();

      const channel = socket.channel(`page:${pageId}`, {});
      socketRef.current = socket;
      channelRef.current = channel;

      channel.on("block:insert", (payload: { block?: Block }) => {
        if (payload.block) {
          setState((current) => ({
            ...current,
            blocks: upsertBlock(current.blocks, payload.block as Block),
          }));
        }
      });

      channel.on("block:update", (payload: { block?: Block }) => {
        if (payload.block) {
          setState((current) => ({
            ...current,
            blocks: upsertBlock(current.blocks, payload.block as Block),
          }));
        }
      });

      channel.on("block:delete", (payload: { block_id?: string }) => {
        if (payload.block_id) {
          setState((current) => ({
            ...current,
            blocks: current.blocks.filter((block) => block.id !== payload.block_id),
          }));
        }
      });

      channel.join();
    }

    void connectRealtime();

    return () => {
      cancelled = true;
      channelRef.current?.leave();
      socketRef.current?.disconnect();
      channelRef.current = null;
      socketRef.current = null;
    };
  }, [state.activePage?.id]);

  const pageTree = useMemo(() => buildPageTree(state.pages), [state.pages]);
  const activePage = state.activePage;
  const currentMember = state.members.find((member) => member.user_id === state.currentUserId);
  const currentRole =
    currentMember?.role ??
    (state.workspace?.owner_id === state.currentUserId ? "owner" : undefined);
  const canEdit = currentRole === "owner" || currentRole === "editor";
  const canInviteMembers = canEdit;
  const canManageMembers = currentRole === "owner";
  const readonlyMode = state.status === "ready" && !canEdit;
  const shareUrl =
    typeof window === "undefined" || !activePage
      ? ""
      : buildPageUrl(window.location.origin, locale, activePage.id);
  const possibleParentPages = useMemo(
    () =>
      activePage
        ? state.pages.filter((page) => page.id !== activePage.id && !isDescendantPage(state.pages, page.id, activePage.id))
        : [],
    [activePage, state.pages],
  );

  function openWorkspacePanel(panel: WorkspacePanel) {
    const nextPanel = workspacePanel === panel ? null : panel;
    setWorkspacePanel(nextPanel);

    if (nextPanel === "more") {
      void refreshRecoveryData();
    }
  }

  function requireEditorPermission() {
    if (canEdit) {
      return true;
    }

    setSaveState("error");
    setSaveError(labels.actions.editorsOnly);
    setToastMessage(labels.actions.editorsOnly);
    return false;
  }

  function requireOwnerPermission() {
    if (canManageMembers) {
      return true;
    }

    setSaveState("error");
    setSaveError(labels.actions.ownersOnly);
    setToastMessage(labels.actions.ownersOnly);
    return false;
  }

  async function refreshRecoveryData() {
    if (!state.workspace) {
      return;
    }

    const token = await requireToken();
    const [trashPages, pageVersions] = await Promise.all([
      listTrashPages(apiUrl, token, state.workspace.id),
      activePage ? listPageVersions(apiUrl, token, activePage.id) : Promise.resolve([]),
    ]);

    setState((current) => ({
      ...current,
      pageVersions,
      trashPages,
    }));
  }

  async function copyShareLink() {
    if (!shareUrl) {
      return;
    }

    const copied = await writeClipboardText(shareUrl);
    setToastMessage(copied ? labels.actions.copied : labels.actions.copyUnavailable);
  }

  async function copyInvitationLink(invitation: WorkspaceInvitation) {
    if (invitation.status !== "pending" || typeof window === "undefined") {
      return false;
    }

    const copied = await writeClipboardText(buildInviteUrl(window.location.origin, locale, invitation.invite_token));
    setToastMessage(copied ? labels.actions.copied : labels.actions.copyUnavailable);

    return copied;
  }

  async function submitWorkspaceInvitation() {
    if (!state.workspace || !inviteEmail.trim()) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    const token = await requireToken();
    setSaving(true);
    setSaveState("saving");

    try {
      const invitation = await inviteWorkspaceMember(apiUrl, token, state.workspace.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      const [members, invitations] = await Promise.all([
        listWorkspaceMembers(apiUrl, token, state.workspace.id),
        listWorkspaceInvitations(apiUrl, token, state.workspace.id),
      ]);

      setState((current) => ({
        ...current,
        invitations: upsertInvitation(current.invitations, invitation, invitations),
        members,
      }));
      setInviteEmail("");

      if (invitation.status === "pending") {
        const copied = await copyInvitationLink(invitation);
        setToastMessage(copied ? labels.actions.invitationReady : labels.actions.copyUnavailable);
      } else {
        setToastMessage(labels.actions.invitationAccepted);
      }

      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function changeWorkspaceMemberRole(memberUserId: string, role: "viewer" | "editor") {
    if (!state.workspace) {
      return;
    }

    if (!requireOwnerPermission()) {
      return;
    }

    const token = await requireToken();
    setSaving(true);
    setSaveState("saving");

    try {
      const members = await updateWorkspaceMemberRole(
        apiUrl,
        token,
        state.workspace.id,
        memberUserId,
        role,
      );

      setState((current) => ({
        ...current,
        members,
      }));
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function removeWorkspaceMemberFromWorkspace(memberUserId: string) {
    if (!state.workspace) {
      return;
    }

    if (!requireOwnerPermission()) {
      return;
    }

    if (!window.confirm(labels.actions.removeMemberConfirm)) {
      return;
    }

    const token = await requireToken();
    setSaving(true);
    setSaveState("saving");

    try {
      const members = await removeWorkspaceMember(
        apiUrl,
        token,
        state.workspace.id,
        memberUserId,
      );

      setState((current) => ({
        ...current,
        members,
      }));
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function submitComment() {
    if (!activePage || !commentDraft.trim()) {
      return;
    }

    const token = await requireToken();
    setSaving(true);
    setSaveState("saving");

    try {
      const comment = await createComment(apiUrl, token, activePage.id, {
        block_id: focusedBlockId,
        content: commentDraft.trim(),
      });
      const notifications = await listNotifications(apiUrl, token);

      setState((current) => ({
        ...current,
        comments: [...current.comments, comment],
        notifications,
      }));
      setCommentDraft("");
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function resolvePageComment(commentId: string) {
    const token = await requireToken();
    setSaving(true);

    try {
      const comment = await resolveComment(apiUrl, token, commentId);
      setState((current) => ({
        ...current,
        comments: current.comments.map((item) => (item.id === comment.id ? comment : item)),
      }));
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function markAllNotificationsRead() {
    const token = await requireToken();
    await markNotificationsRead(apiUrl, token);
    const notifications = await listNotifications(apiUrl, token);
    setState((current) => ({ ...current, notifications }));
    setToastMessage(labels.actions.notificationsRead);
  }

  const updateProfileInState = useCallback((profile: Profile) => {
    setState((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.user_id === profile.id
          ? {
              ...member,
              avatar_url: profile.avatar_url,
              display_name: profile.display_name,
            }
          : member,
      ),
    }));
  }, []);

  async function uploadWorkspaceFiles(files: FileList | null) {
    if (!files?.length || !state.workspace || !activePage) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    const token = await requireToken();
    const supabase = createBrowserSupabaseClient();
    const selectedFiles = Array.from(files);
    const invalidFileMessage = validateUploadFiles(selectedFiles, labels);

    if (invalidFileMessage) {
      setSaveState("error");
      setSaveError(invalidFileMessage);
      setToastMessage(invalidFileMessage);
      return;
    }

    setUploadingFile(true);
    setSaving(true);
    setSaveState("saving");

    try {
      const createdBlocks: Block[] = [];
      const createdFiles: FileAsset[] = [];

      for (const file of selectedFiles) {
        const storagePath = `${state.workspace.id}/${activePage.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
        const bucket = "workspace-files";

        try {
          const uploadResult = await supabase.storage.from(bucket).upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

          if (uploadResult.error) {
            throw uploadResult.error;
          }

          const signedUrlResult = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60 * 60);
          const fileAsset = await createFileAsset(apiUrl, token, state.workspace.id, {
            mime_type: file.type,
            original_name: file.name,
            page_id: activePage.id,
            size_bytes: file.size,
            storage_bucket: bucket,
            storage_path: storagePath,
          });
          const blockType: BlockType = file.type.startsWith("image/") ? "image" : "file";
          const block = await createBlock(apiUrl, token, {
            content: {
              asset_id: fileAsset.id,
              mime_type: file.type,
              size_bytes: file.size,
              storage_bucket: bucket,
              storage_path: storagePath,
              text: file.name,
              url: signedUrlResult.data?.signedUrl,
            },
            page_id: activePage.id,
            position: positionForIndex(state.blocks.length + createdBlocks.length),
            type: blockType,
          });

          createdFiles.push({ ...fileAsset, block_id: block.id });
          createdBlocks.push(block);
          pushRealtimeEvent("block:insert", { block });
        } catch (error) {
          await supabase.storage.from(bucket).remove([storagePath]);
          throw error;
        }
      }

      setState((current) => ({
        ...current,
        blocks: sortBlocks([...current.blocks, ...createdBlocks]),
        files: [...createdFiles, ...current.files],
      }));
      setToastMessage(labels.actions.uploadReady);
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : labels.actions.uploadFailed);
      setToastMessage(labels.actions.uploadFailed);
    } finally {
      setUploadingFile(false);
      setSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function changeActivePageShareScope(shareScope: Page["share_scope"]) {
    if (!activePage) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    const token = await requireToken();
    setSaving(true);
    setSaveState("saving");

    try {
      const page = await updatePage(apiUrl, token, activePage.id, {
        share_scope: shareScope,
      });
      setState((current) => ({
        ...current,
        activePage:
          current.activePage?.id === page.id
            ? { ...current.activePage, ...page }
            : current.activePage,
        pages: upsertPage(current.pages, page),
      }));
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function saveActivePageSettings() {
    if (!activePage) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    const nextParentId = parentPageDraft || null;
    const token = await requireToken();
    setSaving(true);
    setSaveState("saving");

    try {
      const page = await updatePage(apiUrl, token, activePage.id, {
        icon: pageIconDraft.trim() || "문",
        parent_id: nextParentId,
      });
      setState((current) => ({
        ...current,
        activePage:
          current.activePage?.id === page.id
            ? { ...current.activePage, ...page }
            : current.activePage,
        pages: upsertPage(current.pages, page),
      }));
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function duplicateActivePage() {
    if (!activePage || !state.workspace) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    const token = await requireToken();
    setSaving(true);
    setSaveState("saving");

    try {
      const page = await createPage(apiUrl, token, {
        icon: activePage.icon ?? "문",
        parent_id: activePage.parent_id,
        position: nextPosition(state.pages.length),
        title: `${activePage.title || labels.editor.untitled} 2`,
        workspace_id: state.workspace.id,
      });
      const blocks: Block[] = [];

      for (const [index, block] of state.blocks.entries()) {
        blocks.push(
          await createBlock(apiUrl, token, {
            content: block.content,
            page_id: page.id,
            parent_block_id: block.parent_block_id,
            position: positionForIndex(index),
            type: block.type,
          }),
        );
      }

      const duplicatedPage = { ...page, blocks };
      activePageIdRef.current = duplicatedPage.id;
      persistActivePage(state.workspace.id, duplicatedPage.id);
      setState((current) => ({
        ...current,
        activePage: duplicatedPage,
        blocks,
        comments: [],
        pageVersions: [],
        pages: upsertPage(current.pages, duplicatedPage),
      }));
      setWorkspacePanel(null);
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function openPage(pageId: string) {
    const token = await requireToken();
    setFocusedBlockId(null);
    activePageIdRef.current = pageId;
    setState((current) => ({ ...current, status: "loading" }));

    try {
      const page = await ensurePageHasAtLeastOneBlock(apiUrl, token, pageId);
      const [comments, notifications, pageVersions] = await Promise.all([
        listComments(apiUrl, token, page.id),
        listNotifications(apiUrl, token),
        listPageVersions(apiUrl, token, page.id),
      ]);

      if (state.workspace) {
        persistActivePage(state.workspace.id, page.id);
      }

      setState((current) => ({
        ...current,
        activePage: page,
        blocks: page.blocks ?? [],
        comments,
        notifications,
        pageVersions,
        pages: upsertPage(current.pages, page),
        status: "ready",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      }));
    }
  }

  async function createNewPage(parentId?: string | null) {
    if (!state.workspace) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    const token = await requireToken();
    setSaving(true);

    try {
      const page = await createPage(apiUrl, token, {
        icon: parentId ? "↳" : "문",
        parent_id: parentId ?? null,
        position: nextPosition(),
        title: labels.editor.untitled,
        workspace_id: state.workspace.id,
      });
      const block = await createBlock(apiUrl, token, {
        content: { text: "" },
        page_id: page.id,
        position: nextPosition(),
        type: "paragraph",
      });
      const nextPage = { ...page, blocks: [block] };

      activePageIdRef.current = page.id;
      persistActivePage(state.workspace.id, page.id);
      if (parentId) {
        setCollapsedPageIds((current) => {
          const next = new Set(current);
          next.delete(parentId);
          return next;
        });
      }
      setState((current) => ({
        ...current,
        activePage: nextPage,
        blocks: [block],
        comments: [],
        pageVersions: [],
        pages: [...current.pages, nextPage],
        status: "ready",
      }));
      setPendingFocusBlockId(block.id);
    } finally {
      setSaving(false);
    }
  }

  function togglePageCollapse(pageId: string) {
    setCollapsedPageIds((current) => {
      const next = new Set(current);

      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }

      return next;
    });
  }

  async function removeActivePage() {
    if (!activePage || !window.confirm(labels.editor.deletePageConfirm)) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    const token = await requireToken();
    setSaving(true);

    try {
      await deletePage(apiUrl, token, activePage.id);
      const trashPages = state.workspace
        ? await listTrashPages(apiUrl, token, state.workspace.id)
        : state.trashPages;
      const remainingPages = state.pages.filter((page) => page.id !== activePage.id);
      const nextPage = selectPageAfterRefresh(remainingPages, null);
      setState((current) => ({
        ...current,
        pages: remainingPages,
        trashPages,
      }));

      if (nextPage) {
        await openPage(nextPage.id);
      } else {
        await createNewPage(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function restoreTrashPage(pageId: string) {
    if (!state.workspace) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    const token = await requireToken();
    setSaving(true);
    setSaveState("saving");

    try {
      const page = await restorePage(apiUrl, token, pageId);
      const [pages, trashPages] = await Promise.all([
        listPages(apiUrl, token, state.workspace.id),
        listTrashPages(apiUrl, token, state.workspace.id),
      ]);

      setState((current) => ({
        ...current,
        pages: upsertPage(pages, page),
        trashPages,
      }));
      setToastMessage(labels.actions.pageRestored);
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function restoreActivePageVersion(versionId: string) {
    if (!activePage) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    const token = await requireToken();
    setSaving(true);
    setSaveState("saving");

    try {
      const page = await restorePageVersion(apiUrl, token, activePage.id, versionId);
      const pageVersions = await listPageVersions(apiUrl, token, page.id);

      setState((current) => ({
        ...current,
        activePage: page,
        blocks: page.blocks ?? [],
        pageVersions,
        pages: upsertPage(current.pages, page),
      }));
      setToastMessage(labels.actions.versionRestored);
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function savePageTitle(value: string) {
    if (!activePage) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    const title = value.trim() || labels.editor.untitled;
    schedulePageTitleSave(activePage.id, title);
  }

  async function renamePageFromTree(pageId: string, value: string) {
    if (!requireEditorPermission()) {
      return;
    }

    const title = value.trim() || labels.editor.untitled;
    const token = await requireToken();

    setState((current) => ({
      ...current,
      activePage:
        current.activePage?.id === pageId
          ? { ...current.activePage, title }
          : current.activePage,
      pages: current.pages.map((page) =>
        page.id === pageId ? { ...page, title } : page,
      ),
    }));
    setSaving(true);
    setSaveState("saving");

    try {
      const page = await updatePage(apiUrl, token, pageId, { title });
      setState((current) => ({
        ...current,
        activePage:
          current.activePage?.id === page.id
            ? { ...current.activePage, ...page }
            : current.activePage,
        pages: upsertPage(current.pages, page),
      }));
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function schedulePageTitleSave(pageId: string, title: string) {
    if (!canEdit) {
      return;
    }

    if (titleSaveTimer.current) {
      clearTimeout(titleSaveTimer.current);
    }

    setSaveState("saving");
    setSaveError(null);
    setSaving(true);
    setState((current) => ({
      ...current,
      activePage: current.activePage ? { ...current.activePage, title } : current.activePage,
      pages: current.pages.map((page) =>
        page.id === pageId ? { ...page, title } : page,
      ),
    }));

    titleSaveTimer.current = setTimeout(() => {
      void flushPageTitleSave(pageId, title);
    }, 700);
  }

  async function flushPageTitleSave(pageId: string, title: string) {
    if (!requireEditorPermission()) {
      return;
    }

    if (titleSaveTimer.current) {
      clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = null;
    }

    const token = await requireToken();
    setSaving(true);

    try {
      const page = await updatePage(apiUrl, token, pageId, { title });
      setState((current) => ({
        ...current,
        activePage: current.activePage?.id === page.id ? { ...current.activePage, ...page } : current.activePage,
        pages: upsertPage(current.pages, page),
      }));
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function saveBlockText(block: Block, text: string) {
    if (!canEdit) {
      return;
    }

    await flushBlockTextSave(block, text);
  }

  function scheduleBlockTextSave(block: Block, text: string) {
    if (!canEdit) {
      return;
    }

    const existingTimer = blockSaveTimers.current[block.id];

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    setSaveState("saving");
    setSaveError(null);

    blockSaveTimers.current[block.id] = setTimeout(() => {
      void flushBlockTextSave(block, text);
    }, 650);
  }

  async function flushBlockTextSave(block: Block, text: string) {
    if (!requireEditorPermission()) {
      return;
    }

    const existingTimer = blockSaveTimers.current[block.id];

    if (existingTimer) {
      clearTimeout(existingTimer);
      delete blockSaveTimers.current[block.id];
    }

    const token = await requireToken();
    setSaving(true);

    try {
      const savedBlock = await updateBlock(apiUrl, token, block.id, {
        content: {
          ...block.content,
          text,
        },
      });
      replaceBlock(savedBlock);
      pushRealtimeEvent("block:update", { block: savedBlock });
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function changeBlockType(block: Block, type: BlockType) {
    if (!requireEditorPermission()) {
      return;
    }

    if (blockSaveTimers.current[block.id]) {
      clearTimeout(blockSaveTimers.current[block.id]);
      delete blockSaveTimers.current[block.id];
    }

    const token = await requireToken();
    setSaving(true);

    try {
      const savedBlock = await updateBlock(apiUrl, token, block.id, {
        content: {
          ...block.content,
          language: type === "code" ? block.content.language ?? "text" : undefined,
        },
        type,
      });
      replaceBlock(savedBlock);
      pushRealtimeEvent("block:update", { block: savedBlock });
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function applySlashCommand(block: Block, type: BlockType) {
    if (!requireEditorPermission()) {
      return;
    }

    if (blockSaveTimers.current[block.id]) {
      clearTimeout(blockSaveTimers.current[block.id]);
      delete blockSaveTimers.current[block.id];
    }

    const token = await requireToken();
    setSlashMenu(null);
    setSlashSelectionIndex(0);
    setSaving(true);
    setSaveState("saving");

    try {
      const savedBlock = await updateBlock(apiUrl, token, block.id, {
        content: {
          language: type === "code" ? "text" : undefined,
          text: "",
        },
        type,
      });
      replaceBlock(savedBlock);
      pushRealtimeEvent("block:update", { block: savedBlock });
      setPendingFocusBlockId(savedBlock.id);
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function addBlockAfter(index: number, type: BlockType = "paragraph") {
    if (!activePage) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    const token = await requireToken();
    setSaving(true);

    try {
      const block = await createBlock(apiUrl, token, {
        content: { text: "", language: type === "code" ? "text" : undefined },
        page_id: activePage.id,
        position: positionForIndex(index + 1),
        type,
      });
      const nextBlocks = insertBlock(state.blocks, block, index + 1).map((item, itemIndex) => ({
        ...item,
        position: positionForIndex(itemIndex),
      }));

      setState((current) => ({
        ...current,
        blocks: nextBlocks,
      }));
      await persistBlockOrder(apiUrl, token, nextBlocks, pushRealtimeEvent);
      pushRealtimeEvent("block:insert", { block });
      setPendingFocusBlockId(block.id);
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function moveBlock(block: Block, index: number, direction: -1 | 1) {
    if (!requireEditorPermission()) {
      return;
    }

    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= state.blocks.length) {
      return;
    }

    const token = await requireToken();
    const nextBlocks = [...state.blocks];
    [nextBlocks[index], nextBlocks[nextIndex]] = [nextBlocks[nextIndex], nextBlocks[index]];
    const orderedBlocks = nextBlocks.map((item, itemIndex) => ({
      ...item,
      position: positionForIndex(itemIndex),
    }));

    setSaving(true);
    setSaveState("saving");
    setState((current) => ({
      ...current,
      blocks: orderedBlocks,
    }));

    try {
      await persistBlockOrder(apiUrl, token, orderedBlocks, pushRealtimeEvent);
      setPendingFocusBlockId(block.id);
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
      if (activePage) {
        void openPage(activePage.id);
      }
    } finally {
      setSaving(false);
    }
  }

  async function moveDraggedBlock(targetIndex: number) {
    if (!requireEditorPermission()) {
      setDraggingBlockId(null);
      return;
    }

    if (!draggingBlockId) {
      return;
    }

    const sourceIndex = state.blocks.findIndex((block) => block.id === draggingBlockId);

    if (sourceIndex < 0 || sourceIndex === targetIndex) {
      setDraggingBlockId(null);
      return;
    }

    const token = await requireToken();
    const nextBlocks = [...state.blocks];
    const [draggedBlock] = nextBlocks.splice(sourceIndex, 1);
    nextBlocks.splice(targetIndex, 0, draggedBlock);
    const orderedBlocks = nextBlocks.map((item, itemIndex) => ({
      ...item,
      position: positionForIndex(itemIndex),
    }));

    setSaving(true);
    setSaveState("saving");
    setState((current) => ({
      ...current,
      blocks: orderedBlocks,
    }));

    try {
      await persistBlockOrder(apiUrl, token, orderedBlocks, pushRealtimeEvent);
      setPendingFocusBlockId(draggedBlock.id);
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
      if (activePage) {
        void openPage(activePage.id);
      }
    } finally {
      setDraggingBlockId(null);
      setSaving(false);
    }
  }

  async function pasteMultilineBlocks(
    event: ClipboardEvent<HTMLTextAreaElement>,
    block: Block,
    index: number,
  ) {
    if (!activePage) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    const pastedText = event.clipboardData.getData("text/plain");
    const lines = pastedText.split(/\r?\n/).map((line) => line.trimEnd());

    if (lines.length <= 1) {
      return;
    }

    event.preventDefault();

    const token = await requireToken();
    const [firstLine, ...remainingLines] = lines.filter((line, lineIndex) => line.length > 0 || lineIndex === 0);
    setSaving(true);
    setSaveState("saving");

    try {
      const firstBlock = await updateBlock(apiUrl, token, block.id, {
        content: { ...block.content, text: firstLine },
        type: block.type,
      });
      const createdBlocks: Block[] = [];

      for (const [lineIndex, line] of remainingLines.entries()) {
        const next = blockFromPlainTextLine(line);
        createdBlocks.push(
          await createBlock(apiUrl, token, {
            content: next.content,
            page_id: activePage.id,
            position: positionForIndex(index + lineIndex + 1),
            type: next.type,
          }),
        );
      }

      const nextBlocks = [
        ...state.blocks.slice(0, index),
        firstBlock,
        ...createdBlocks,
        ...state.blocks.slice(index + 1),
      ].map((item, itemIndex) => ({
        ...item,
        position: positionForIndex(itemIndex),
      }));

      setState((current) => ({
        ...current,
        blocks: nextBlocks,
      }));
      await persistBlockOrder(apiUrl, token, nextBlocks, pushRealtimeEvent);
      createdBlocks.forEach((createdBlock) => pushRealtimeEvent("block:insert", { block: createdBlock }));
      setPendingFocusBlockId(createdBlocks.at(-1)?.id ?? firstBlock.id);
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(block: Block, index: number) {
    if (!activePage) {
      return;
    }

    if (!requireEditorPermission()) {
      return;
    }

    if (blockSaveTimers.current[block.id]) {
      clearTimeout(blockSaveTimers.current[block.id]);
      delete blockSaveTimers.current[block.id];
    }

    const token = await requireToken();
    setSaving(true);

    try {
      if (state.blocks.length <= 1) {
        const savedBlock = await updateBlock(apiUrl, token, block.id, {
          content: { ...block.content, text: "" },
          type: "paragraph",
        });
        replaceBlock(savedBlock);
        setPendingFocusBlockId(savedBlock.id);
        return;
      }

      await deleteBlock(apiUrl, token, block.id);
      const nextFocusId =
        state.blocks[Math.max(0, index - 1)]?.id ?? state.blocks[index + 1]?.id ?? null;
      const nextBlocks = state.blocks
        .filter((item) => item.id !== block.id)
        .map((item, itemIndex) => ({
          ...item,
          position: positionForIndex(itemIndex),
        }));
      setState((current) => ({
        ...current,
        blocks: nextBlocks,
      }));
      pushRealtimeEvent("block:delete", { block_id: block.id });
      await persistBlockOrder(apiUrl, token, nextBlocks, pushRealtimeEvent);
      setPendingFocusBlockId(nextFocusId);
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function updateLocalBlock(blockId: string, text: string) {
    if (!canEdit) {
      return;
    }

    const block = state.blocks.find((item) => item.id === blockId);

    if (text.startsWith("/")) {
      const index = state.blocks.findIndex((item) => item.id === blockId);
      setSlashMenu({ blockId, index, query: text.slice(1).trim().toLowerCase() });
      setSlashSelectionIndex(0);
    } else if (slashMenu?.blockId === blockId) {
      setSlashMenu(null);
      setSlashSelectionIndex(0);
    }

    setState((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId
          ? { ...block, content: { ...block.content, text } }
          : block,
      ),
    }));

    if (block) {
      scheduleBlockTextSave(block, text);
    }
  }

  function replaceBlock(block: Block) {
    setState((current) => ({
      ...current,
      blocks: current.blocks.map((item) => (item.id === block.id ? block : item)),
    }));
  }

  function pushRealtimeEvent(event: "block:insert" | "block:update" | "block:delete", payload: object) {
    channelRef.current?.push(event, payload);
  }

  function setBlockRef(blockId: string): RefCallback<HTMLTextAreaElement> {
    return (element) => {
      blockRefs.current[blockId] = element;

      if (element) {
        resizeTextarea(element);
      }
    };
  }

  async function handleBlockKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    block: Block,
    index: number,
  ) {
    if (!canEdit) {
      setSlashMenu(null);
      setSlashSelectionIndex(0);
      return;
    }

    const activeSlashMenu = slashMenu?.blockId === block.id ? slashMenu : null;

    if (activeSlashMenu) {
      const slashOptions = getSlashOptions(activeSlashMenu.query);

      if (event.key === "Escape") {
        event.preventDefault();
        setSlashMenu(null);
        setSlashSelectionIndex(0);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashSelectionIndex((current) =>
          slashOptions.length === 0 ? 0 : (current + 1) % slashOptions.length,
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashSelectionIndex((current) =>
          slashOptions.length === 0
            ? 0
            : (current - 1 + slashOptions.length) % slashOptions.length,
        );
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const option = slashOptions[slashSelectionIndex] ?? slashOptions[0];

        if (option) {
          await applySlashCommand(block, option.type);
        }

        return;
      }
    }

    if (event.key === " " && !event.shiftKey) {
      const shortcutType = markdownShortcutType(event.currentTarget.value);

      if (shortcutType) {
        event.preventDefault();
        await applySlashCommand(block, shortcutType);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await addBlockAfter(index);
      return;
    }

    if (event.key === "Backspace" && event.currentTarget.value.length === 0) {
      event.preventDefault();
      await removeBlock(block, index);
    }

    if (event.key === "ArrowUp" && event.currentTarget.selectionStart === 0) {
      const previousBlock = state.blocks[index - 1];

      if (previousBlock) {
        event.preventDefault();
        setPendingFocusBlockId(previousBlock.id);
      }
    }

    if (
      event.key === "ArrowDown" &&
      event.currentTarget.selectionEnd === event.currentTarget.value.length
    ) {
      const nextBlock = state.blocks[index + 1];

      if (nextBlock) {
        event.preventDefault();
        setPendingFocusBlockId(nextBlock.id);
      }
    }
  }

  async function requireToken() {
    const token = await getCurrentToken();

    if (!token) {
      throw new Error(labels.panel.authRequired);
    }

    return token;
  }

  if (state.status === "loading" && !state.workspace) {
    return (
      <WorkspaceFrame locale={locale} labels={labels}>
        <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-6">
          <div className="flex items-center gap-3 rounded-md border border-[#d8ddd6] bg-white px-4 py-3 text-sm text-[#41483f] shadow-sm">
            <Loader2 size={17} className="animate-spin text-[#16635b]" />
            {labels.editor.loading}
          </div>
        </div>
      </WorkspaceFrame>
    );
  }

  if (state.status === "error") {
    return (
      <WorkspaceFrame locale={locale} labels={labels}>
        <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-6">
          <div className="w-full max-w-md rounded-md border border-[#e8d5d5] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#9f1239]">
              <Trash2 size={16} />
              {labels.editor.error}
            </div>
            <p className="mt-3 break-words text-sm leading-6 text-[#514b44]">
              {state.error}
            </p>
            <button
              className="mt-5 flex h-9 items-center gap-2 rounded-md bg-[#24211d] px-3 text-sm font-semibold text-white"
              onClick={() => void load()}
              type="button"
            >
              <RefreshCw size={15} />
              {labels.editor.retry}
            </button>
          </div>
        </div>
      </WorkspaceFrame>
    );
  }

  if (state.status === "auth") {
    return (
      <WorkspaceFrame locale={locale} labels={labels}>
        <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-6">
          <div className="w-full max-w-md rounded-md border border-[#d8ddd6] bg-white p-5 text-center shadow-sm">
            <div className="mx-auto grid size-11 place-items-center rounded-md bg-[#eef2eb] text-[#16635b]">
              <Lock size={18} />
            </div>
            <h1 className="mt-4 text-xl font-bold text-[#24211d]">
              {labels.panel.authRequired}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#4d574c]">
              {labels.authExpired}
            </p>
            <button
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#16635b] px-4 text-sm font-semibold text-white"
              onClick={() => window.location.reload()}
              type="button"
            >
              <RefreshCw size={15} />
              {labels.editor.retry}
            </button>
          </div>
        </div>
      </WorkspaceFrame>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f6f2] text-[#24211d]">
      <div className={`grid min-h-screen ${sidebarOpen ? "grid-cols-[300px_minmax(0,1fr)]" : "grid-cols-1"} max-lg:grid-cols-1`}>
        {sidebarOpen ? (
        <aside className="border-r border-[#d8ddd6] bg-[#fbfbf8] px-4 py-4 max-lg:border-b max-lg:border-r-0">
          <div className="flex items-center justify-between gap-3">
            <Link className="flex min-w-0 items-center gap-3" href={`/${locale}`}>
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#16635b] text-sm font-bold text-white">
                {state.workspace?.icon ?? "H"}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">Hong-tion</span>
                <span className="block truncate text-xs text-[#687267]">
                  {state.workspace?.name ?? labels.workspaceName}
                </span>
              </span>
            </Link>
            <button
              className="grid size-9 shrink-0 place-items-center rounded-md border border-[#d8ddd6] bg-white text-[#4d574c]"
              onClick={() => setSidebarOpen(false)}
              title={labels.collapse}
              type="button"
            >
              <PanelLeft size={17} />
            </button>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              className="grid size-9 place-items-center rounded-md bg-[#24211d] text-white disabled:cursor-not-allowed disabled:bg-[#9f9a93]"
              disabled={!canEdit}
              onClick={() => void createNewPage(null)}
              title={labels.newPage}
              type="button"
            >
              <Plus size={17} />
            </button>
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9286]"
                size={15}
              />
              <input
                className="h-9 w-full rounded-md border border-[#d8ddd6] bg-white pl-9 pr-3 text-sm text-[#24211d] placeholder:text-[#8a9286]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.editor.searchPages}
                type="search"
                value={query}
              />
            </div>
            <button
              className="grid size-9 place-items-center rounded-md border border-[#d8ddd6] bg-white text-[#4d574c]"
              onClick={() => openWorkspacePanel("notifications")}
              title={labels.updates}
              type="button"
            >
              <Bell size={17} />
            </button>
          </div>

          <nav className="mt-6 max-h-[calc(100vh-15rem)] space-y-1 overflow-y-auto pr-1">
            {query.trim() ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 text-xs font-semibold uppercase text-[#687267]">
                  <span className="flex items-center gap-2">
                    <Search size={13} />
                    {labels.actions.searchResults}
                  </span>
                  {searching ? <Loader2 size={13} className="animate-spin" /> : null}
                </div>
                {state.searchResults.length > 0 ? (
                  state.searchResults.map((result) => (
                    <SearchResultItem
                      key={`${result.kind}-${result.block_id ?? result.page_id}`}
                      labels={labels}
                      onSelect={(pageId) => {
                        setQuery("");
                        void openPage(pageId);
                      }}
                      result={result}
                    />
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-[#d8ddd6] px-3 py-6 text-center text-sm text-[#687267]">
                    {searching ? labels.editor.loading : labels.actions.noSearchResults}
                  </div>
                )}
              </div>
            ) : pageTree.length > 0 ? (
              pageTree.map((page) => (
                <PageTreeItem
                  activePageId={activePage?.id}
                  canEdit={canEdit}
                  collapsedPageIds={collapsedPageIds}
                  forceOpen={false}
                  key={page.id}
                  labels={labels}
                  onCreateChild={createNewPage}
                  onRename={renamePageFromTree}
                  onSelect={openPage}
                  onToggle={togglePageCollapse}
                  page={page}
                />
              ))
            ) : (
              <div className="rounded-md border border-dashed border-[#d8ddd6] px-3 py-6 text-center text-sm text-[#687267]">
                {labels.editor.noPages}
              </div>
            )}
          </nav>

          <div className="mt-6 border-t border-[#e1e5dc] pt-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[#687267]">
              <Sparkles size={14} />
              {labels.editor.workspaceReady}
            </div>
            <p className="mt-2 text-sm leading-6 text-[#4d574c]">
              {state.workspace?.name ?? labels.bootstrap.workspaceName}
            </p>
          </div>
        </aside>
        ) : null}

        <section className="flex min-w-0 flex-col">
          <header className="flex min-h-16 items-center justify-between border-b border-[#d8ddd6] bg-[#fffefa] px-5 max-md:flex-col max-md:items-stretch max-md:gap-3 max-md:py-3">
            <div className="flex min-w-0 items-center gap-3">
              {!sidebarOpen ? (
                <button
                  className="grid size-9 shrink-0 place-items-center rounded-md border border-[#d8ddd6] bg-white text-[#4d574c]"
                  onClick={() => setSidebarOpen(true)}
                  title={labels.collapse}
                  type="button"
                >
                  <PanelLeft size={17} />
                </button>
              ) : null}
              <Hash size={18} className="shrink-0 text-[#16635b]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {activePage?.title || labels.editor.untitled}
                </p>
                <p className="truncate text-xs text-[#687267]">
                  {state.workspace?.name ?? labels.workspaceName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex -space-x-2">
                {collaborators.map((name, index) => (
                  <span
                    className={`grid size-8 place-items-center rounded-full border-2 border-[#fffefa] text-xs font-bold text-[#24211d] ${
                      index === 0
                        ? "bg-[#f6d365]"
                        : index === 1
                          ? "bg-[#b7d8ff]"
                          : "bg-[#b9e3c6]"
                    }`}
                    key={name}
                    title={name}
                  >
                    {name}
                  </span>
                ))}
              </div>
              <button
                className="grid size-9 place-items-center rounded-md border border-[#d8ddd6] bg-white text-[#4d574c]"
                onClick={() => openWorkspacePanel("share")}
                title={labels.share}
                type="button"
              >
                <Share2 size={17} />
              </button>
              <button
                className="grid size-9 place-items-center rounded-md border border-[#d8ddd6] bg-white text-[#4d574c]"
                onClick={() => openWorkspacePanel("more")}
                title={labels.more}
                type="button"
              >
                <MoreHorizontal size={17} />
              </button>
              <UserMenu apiUrl={apiUrl} labels={labels.account} onProfileSaved={updateProfileInState} />
            </div>
          </header>

          <div className="grid flex-1 grid-cols-[minmax(0,1fr)_330px] max-xl:grid-cols-1">
            <article className="mx-auto w-full max-w-4xl px-6 py-8 max-sm:px-4">
              <div className="mb-7 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-4 grid size-14 place-items-center rounded-md bg-[#dfeefe] text-2xl">
                    {activePage?.icon ?? "문"}
                  </div>
                  <input
                    className={`w-full rounded-md border border-transparent bg-transparent px-0 py-1 text-4xl font-bold tracking-normal text-[#24211d] outline-none max-sm:text-3xl ${
                      readonlyMode
                        ? "cursor-default"
                        : "hover:border-[#d8ddd6] focus:border-[#16635b] focus:bg-white focus:px-3"
                    }`}
                    onBlur={(event) => {
                      if (!readonlyMode) {
                        void savePageTitle(event.currentTarget.value);
                      }
                    }}
                    onChange={(event) => {
                      if (readonlyMode) {
                        return;
                      }

                      const title = event.target.value;
                      if (activePage) {
                        schedulePageTitleSave(activePage.id, title);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    readOnly={readonlyMode}
                    title={readonlyMode ? labels.actions.editorsOnly : undefined}
                    value={activePage?.title ?? ""}
                  />
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="grid size-10 place-items-center rounded-md border border-[#d8ddd6] bg-white text-[#4d574c] disabled:cursor-not-allowed disabled:text-[#c2c8bf]"
                    disabled={!canEdit || !activePage}
                    onClick={() => activePage && void createNewPage(activePage.id)}
                    title={labels.editor.newChildPage}
                    type="button"
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    className="grid size-10 place-items-center rounded-md border border-[#e8d5d5] bg-white text-[#9f1239] disabled:cursor-not-allowed disabled:text-[#d8a6b4]"
                    disabled={!canEdit || !activePage}
                    onClick={() => void removeActivePage()}
                    title={labels.editor.deletePage}
                    type="button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {state.blocks.length > 0 ? (
                  state.blocks.map((block, index) => (
                    <BlockEditorRow
                      block={block}
                      blockCount={state.blocks.length}
                      canEdit={canEdit}
                      focused={focusedBlockId === block.id}
                      index={index}
                      key={block.id}
                      labels={labels}
                      onAddAfter={addBlockAfter}
                      onChangeText={updateLocalBlock}
                      onDelete={removeBlock}
                      onFocus={setFocusedBlockId}
                      onKeyDown={handleBlockKeyDown}
                      onPaste={pasteMultilineBlocks}
                      onMove={moveBlock}
                      onDragStart={(blockId) => setDraggingBlockId(blockId)}
                      onDropOnBlock={(targetIndex) => void moveDraggedBlock(targetIndex)}
                      onSaveText={saveBlockText}
                      onSlashCommand={applySlashCommand}
                      slashSelectionIndex={slashSelectionIndex}
                      onTypeChange={changeBlockType}
                      slashMenu={slashMenu?.blockId === block.id ? slashMenu : null}
                      textareaRef={setBlockRef(block.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-[#d8ddd6] px-4 py-8 text-center text-sm text-[#687267]">
                    {labels.editor.empty}
                  </div>
                )}
              </div>
            </article>

            <aside className="border-l border-[#d8ddd6] bg-[#fffefa] px-5 py-6 max-xl:border-l-0 max-xl:border-t">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{labels.panel.title}</h2>
                <Sparkles size={17} className="text-[#16635b]" />
              </div>

              <div className="mt-5 space-y-5">
                <SaveNotice
                  labels={labels}
                  saveError={saveError}
                  saveState={saveState}
                  saving={saving}
                />

                <CommentsPanel
                  comments={state.comments}
                  draft={commentDraft}
                  labels={labels}
                  onChangeDraft={setCommentDraft}
                  onResolve={(commentId) => void resolvePageComment(commentId)}
                  onSubmit={() => void submitComment()}
                />

                <InfoSection
                  body={labels.panel.presenceBody}
                  icon={<Users size={14} />}
                  title={labels.panel.presence}
                />
                <InfoSection
                  body={labels.panel.nextBody}
                  icon={<BookOpen size={14} />}
                  title={labels.panel.next}
                />
              </div>

              <div className="mt-7 border-t border-[#e1e5dc] pt-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-[#687267]">
                  <Languages size={14} />
                  {labels.language}
                </div>
                <div className="flex gap-2">
                  {visibleLocales.map((nextLocale) => (
                    <Link
                      className={`grid h-9 min-w-11 place-items-center rounded-md border text-sm font-semibold ${
                        locale === nextLocale
                          ? "border-[#16635b] bg-[#16635b] text-white"
                          : "border-[#d8ddd6] bg-white text-[#4d574c]"
                      }`}
                      href={`/${nextLocale}`}
                      key={nextLocale}
                    >
                      {nextLocale.toUpperCase()}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
      {workspacePanel ? (
        <WorkspaceActionPanel
          activePage={activePage}
          canEdit={canEdit}
          canInviteMembers={canInviteMembers}
          canManageMembers={canManageMembers}
          currentRole={currentRole}
          currentUserId={state.currentUserId}
          files={state.files}
          invitations={state.invitations}
          locale={locale}
          labels={labels}
          members={state.members}
          onClose={() => setWorkspacePanel(null)}
          onChangeMemberRole={(userId, role) => void changeWorkspaceMemberRole(userId, role)}
          onCopyInvitationLink={(invitation) => void copyInvitationLink(invitation)}
          onCopyLink={() => void copyShareLink()}
          onDeletePage={() => void removeActivePage()}
          onDuplicatePage={() => void duplicateActivePage()}
          onInviteMember={() => void submitWorkspaceInvitation()}
          onMarkNotificationsRead={() => void markAllNotificationsRead()}
          onRemoveMember={(userId) => void removeWorkspaceMemberFromWorkspace(userId)}
          onRestorePage={(pageId) => void restoreTrashPage(pageId)}
          onRestoreVersion={(versionId) => void restoreActivePageVersion(versionId)}
          onSavePageSettings={() => void saveActivePageSettings()}
          onShareScopeChange={(scope) => void changeActivePageShareScope(scope)}
          onUploadFile={() => fileInputRef.current?.click()}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          notifications={state.notifications}
          pageIconDraft={pageIconDraft}
          pageVersions={state.pageVersions}
          panel={workspacePanel}
          parentPageDraft={parentPageDraft}
          possibleParentPages={possibleParentPages}
          setInviteEmail={setInviteEmail}
          setInviteRole={setInviteRole}
          setPageIconDraft={setPageIconDraft}
          setParentPageDraft={setParentPageDraft}
          shareUrl={shareUrl}
          trashPages={state.trashPages}
          uploadingFile={uploadingFile}
        />
      ) : null}
      <input
        className="hidden"
        multiple
        onChange={(event) => void uploadWorkspaceFiles(event.currentTarget.files)}
        ref={fileInputRef}
        type="file"
      />
      {toastMessage ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md border border-[#d8ddd6] bg-[#24211d] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_45px_rgba(36,33,29,0.2)]">
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}

function WorkspaceFrame({
  children,
  labels,
  locale,
}: {
  children: ReactNode;
  labels: WorkspaceShellLabels;
  locale: string;
}) {
  return (
    <main className="min-h-screen bg-[#f5f6f2] text-[#24211d]">
      <header className="flex min-h-16 items-center justify-between border-b border-[#d8ddd6] bg-[#fffefa] px-5">
        <Link className="flex items-center gap-3" href={`/${locale}`}>
          <span className="grid size-9 place-items-center rounded-md bg-[#16635b] text-sm font-bold text-white">
            H
          </span>
          <span>
            <span className="block text-sm font-semibold">Hong-tion</span>
            <span className="block text-xs text-[#687267]">{labels.workspaceName}</span>
          </span>
        </Link>
        <UserMenu apiUrl={requiredPublicEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000")} labels={labels.account} />
      </header>
      {children}
    </main>
  );
}

function PageTreeItem({
  activePageId,
  canEdit,
  collapsedPageIds,
  forceOpen,
  labels,
  onCreateChild,
  onRename,
  onSelect,
  onToggle,
  page,
}: {
  activePageId?: string;
  canEdit: boolean;
  collapsedPageIds: Set<string>;
  forceOpen: boolean;
  labels: WorkspaceShellLabels;
  onCreateChild: (parentId: string) => Promise<void>;
  onRename: (pageId: string, title: string) => Promise<void>;
  onSelect: (pageId: string) => Promise<void>;
  onToggle: (pageId: string) => void;
  page: PageNode;
}) {
  const active = page.id === activePageId;
  const hasChildren = page.children.length > 0;
  const collapsed = hasChildren && !forceOpen && collapsedPageIds.has(page.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.title || labels.editor.untitled);

  useEffect(() => {
    if (!editing) {
      setDraft(page.title || labels.editor.untitled);
    }
  }, [editing, labels.editor.untitled, page.title]);

  useEffect(() => {
    if (!canEdit && editing) {
      setEditing(false);
    }
  }, [canEdit, editing]);

  function commitRename() {
    if (!canEdit) {
      setEditing(false);
      setDraft(page.title || labels.editor.untitled);
      return;
    }

    const title = draft.trim() || labels.editor.untitled;

    setEditing(false);

    if (title !== (page.title || labels.editor.untitled)) {
      void onRename(page.id, title);
    }
  }

  return (
    <div>
      <div
        className={`group grid h-9 grid-cols-[28px_1fr_28px] items-center rounded-md text-sm ${
          active ? "bg-[#e9eee7] font-semibold text-[#24211d]" : "text-[#4d574c] hover:bg-[#eef2eb]"
        }`}
        style={{ paddingLeft: `${page.depth * 14}px` }}
      >
        <button
          className={`grid size-7 place-items-center rounded-md ${
            hasChildren ? "text-[#8a9286] hover:bg-white" : "text-transparent"
          }`}
          disabled={!hasChildren}
          onClick={() => onToggle(page.id)}
          title={labels.collapse}
          type="button"
        >
          <ChevronRight
            className={`transition-transform ${collapsed ? "" : "rotate-90"}`}
            size={14}
          />
        </button>
        {editing ? (
          <div className="flex min-w-0 items-center gap-2 px-2">
            <FileText size={15} className="shrink-0 text-[#16635b]" />
            <input
              autoFocus
              className="h-7 min-w-0 flex-1 rounded-md border border-[#16635b] bg-white px-2 text-sm outline-none"
              onBlur={commitRename}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  setEditing(false);
                  setDraft(page.title || labels.editor.untitled);
                }
              }}
              value={draft}
            />
          </div>
        ) : (
          <button
            className="flex min-w-0 items-center gap-2 px-2 text-left"
            onClick={() => void onSelect(page.id)}
            onDoubleClick={() => {
              if (canEdit) {
                setEditing(true);
              }
            }}
            type="button"
          >
            <FileText size={15} className="shrink-0 text-[#16635b]" />
            <span className="truncate">{page.title || labels.editor.untitled}</span>
          </button>
        )}
        <button
          className="grid size-7 place-items-center rounded-md text-[#687267] opacity-0 hover:bg-white disabled:cursor-not-allowed disabled:text-[#c2c8bf] group-hover:opacity-100"
          disabled={!canEdit}
          onClick={() => void onCreateChild(page.id)}
          title={labels.editor.newChildPage}
          type="button"
        >
          <Plus size={14} />
        </button>
      </div>

      {collapsed
        ? null
        : page.children.map((child) => (
            <PageTreeItem
              activePageId={activePageId}
              canEdit={canEdit}
              collapsedPageIds={collapsedPageIds}
              forceOpen={forceOpen}
              key={child.id}
              labels={labels}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onSelect={onSelect}
              onToggle={onToggle}
              page={child}
            />
          ))}
    </div>
  );
}

function WorkspaceActionPanel({
  activePage,
  canEdit,
  canInviteMembers,
  canManageMembers,
  currentRole,
  currentUserId,
  files,
  invitations,
  inviteEmail,
  inviteRole,
  locale,
  labels,
  members,
  notifications,
  onClose,
  onChangeMemberRole,
  onCopyInvitationLink,
  onCopyLink,
  onDeletePage,
  onDuplicatePage,
  onInviteMember,
  onMarkNotificationsRead,
  onRemoveMember,
  onRestorePage,
  onRestoreVersion,
  onSavePageSettings,
  onShareScopeChange,
  onUploadFile,
  pageIconDraft,
  pageVersions,
  panel,
  parentPageDraft,
  possibleParentPages,
  setInviteEmail,
  setInviteRole,
  setPageIconDraft,
  setParentPageDraft,
  shareUrl,
  trashPages,
  uploadingFile,
}: {
  activePage?: Page;
  canEdit: boolean;
  canInviteMembers: boolean;
  canManageMembers: boolean;
  currentRole?: WorkspaceMember["role"];
  currentUserId?: string;
  files: FileAsset[];
  invitations: WorkspaceInvitation[];
  inviteEmail: string;
  inviteRole: "viewer" | "editor";
  locale: string;
  labels: WorkspaceShellLabels;
  members: WorkspaceMember[];
  notifications: Notification[];
  onClose: () => void;
  onChangeMemberRole: (userId: string, role: "viewer" | "editor") => void;
  onCopyInvitationLink: (invitation: WorkspaceInvitation) => void;
  onCopyLink: () => void;
  onDeletePage: () => void;
  onDuplicatePage: () => void;
  onInviteMember: () => void;
  onMarkNotificationsRead: () => void;
  onRemoveMember: (userId: string) => void;
  onRestorePage: (pageId: string) => void;
  onRestoreVersion: (versionId: string) => void;
  onSavePageSettings: () => void;
  onShareScopeChange: (scope: Page["share_scope"]) => void;
  onUploadFile: () => void;
  pageIconDraft: string;
  pageVersions: PageVersion[];
  panel: Exclude<WorkspacePanel, null>;
  parentPageDraft: string;
  possibleParentPages: Page[];
  setInviteEmail: (value: string) => void;
  setInviteRole: (value: "viewer" | "editor") => void;
  setPageIconDraft: (value: string) => void;
  setParentPageDraft: (value: string) => void;
  shareUrl: string;
  trashPages: Page[];
  uploadingFile: boolean;
}) {
  const title =
    panel === "notifications"
      ? labels.actions.notifications
      : panel === "share"
        ? labels.actions.sharePage
        : labels.actions.pageTools;
  const currentRoleLabel = currentRole ? roleLabel(currentRole, labels) : labels.actions.viewer;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end bg-[rgba(36,33,29,0.18)] px-4 py-4">
      <section className="max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-hidden rounded-md border border-[#d8ddd6] bg-[#fffefa] shadow-[0_24px_80px_rgba(36,33,29,0.24)]">
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-[#e1e5dc] px-4">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-0.5 text-xs font-semibold text-[#687267]">{currentRoleLabel}</p>
          </div>
          <button
            className="grid size-8 place-items-center rounded-md border border-[#d8ddd6] bg-white text-[#4d574c]"
            onClick={onClose}
            title={labels.actions.closePanel}
            type="button"
          >
            <X size={15} />
          </button>
        </header>

        <div className="max-h-[calc(100vh-5.5rem)] overflow-y-auto p-4">
          {panel === "notifications" ? (
            <div>
              {notifications.length > 0 ? (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      labels={labels}
                      notification={notification}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid min-h-40 place-items-center rounded-md border border-dashed border-[#d8ddd6] bg-white px-4 text-center">
                  <div>
                    <Inbox className="mx-auto text-[#16635b]" size={24} />
                    <p className="mt-3 text-sm font-semibold text-[#24211d]">
                      {labels.actions.noNotifications}
                    </p>
                  </div>
                </div>
              )}
              <button
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#d8ddd6] bg-white text-sm font-semibold text-[#4d574c]"
                onClick={onMarkNotificationsRead}
                type="button"
              >
                <CheckCircle2 size={16} />
                {labels.actions.markAllRead}
              </button>
            </div>
          ) : null}

          {panel === "share" ? (
            <div className="space-y-4">
              {!canEdit ? (
                <div className="flex items-start gap-2 rounded-md border border-[#d8ddd6] bg-white px-3 py-3 text-sm leading-6 text-[#4d574c]">
                  <Lock className="mt-0.5 shrink-0 text-[#16635b]" size={15} />
                  <span>{labels.actions.editorsOnly}</span>
                </div>
              ) : null}

              <label className="block text-sm font-semibold text-[#4d574c]">
                {labels.actions.shareScope}
                <select
                  aria-label={labels.actions.shareScope}
                  className="mt-2 h-10 w-full rounded-md border border-[#d8ddd6] bg-white px-3 text-sm text-[#24211d] outline-none disabled:cursor-not-allowed disabled:bg-[#f4f5f0] disabled:text-[#8a9286]"
                  disabled={!canEdit}
                  onChange={(event) => onShareScopeChange(event.target.value as Page["share_scope"])}
                  value={activePage?.share_scope ?? "private"}
                >
                  <option value="private">{labels.actions.private}</option>
                  <option value="workspace">{labels.actions.workspace}</option>
                  <option value="link">{labels.actions.link}</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-[#4d574c]">
                {labels.actions.copyLink}
                <div className="mt-2 flex gap-2">
                  <input
                    aria-label={labels.actions.copyLink}
                    className="h-10 min-w-0 flex-1 rounded-md border border-[#d8ddd6] bg-white px-3 text-sm text-[#24211d] outline-none"
                    readOnly
                    value={shareUrl}
                  />
                  <button
                    className="grid size-10 shrink-0 place-items-center rounded-md bg-[#24211d] text-white"
                    onClick={onCopyLink}
                    title={labels.actions.copyLink}
                    type="button"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </label>

              <div className="border-t border-[#e1e5dc] pt-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#24211d]">
                  <UserPlus size={15} />
                  {labels.actions.inviteMember}
                </h3>
                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_112px] gap-2">
                  <input
                    className="h-10 min-w-0 rounded-md border border-[#d8ddd6] bg-white px-3 text-sm text-[#24211d] outline-none disabled:cursor-not-allowed disabled:bg-[#f4f5f0] disabled:text-[#8a9286]"
                    disabled={!canInviteMembers}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder={labels.actions.inviteEmail}
                    type="email"
                    value={inviteEmail}
                  />
                  <select
                    aria-label={labels.actions.inviteRole}
                    className="h-10 rounded-md border border-[#d8ddd6] bg-white px-2 text-sm text-[#24211d] outline-none disabled:cursor-not-allowed disabled:bg-[#f4f5f0] disabled:text-[#8a9286]"
                    disabled={!canInviteMembers}
                    onChange={(event) => setInviteRole(event.target.value as "viewer" | "editor")}
                    value={inviteRole}
                  >
                    <option value="editor">{labels.actions.editor}</option>
                    <option value="viewer">{labels.actions.viewer}</option>
                  </select>
                </div>
                <button
                  className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#16635b] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9ab7b2]"
                  disabled={!canInviteMembers || !inviteEmail.trim()}
                  onClick={onInviteMember}
                  type="button"
                >
                  <UserPlus size={16} />
                  {labels.actions.inviteMember}
                </button>
              </div>

              <div className="border-t border-[#e1e5dc] pt-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#24211d]">
                  <Users size={15} />
                  {labels.actions.members}
                </h3>
                <div className="mt-3 space-y-2">
                  {members.map((member) => (
                    <MemberRow
                      canManageMembers={canManageMembers}
                      currentUserId={currentUserId}
                      key={member.user_id}
                      labels={labels}
                      member={member}
                      onChangeRole={onChangeMemberRole}
                      onRemove={onRemoveMember}
                    />
                  ))}
                </div>
              </div>

              {invitations.length > 0 ? (
                <div className="border-t border-[#e1e5dc] pt-4">
                  <h3 className="text-sm font-semibold text-[#24211d]">
                    {labels.actions.invitations}
                  </h3>
                  <div className="mt-3 space-y-2">
                    {invitations.slice(0, 5).map((invitation) => (
                      <InvitationRow
                        invitation={invitation}
                        key={invitation.id}
                        labels={labels}
                        locale={locale}
                        onCopyInvitationLink={onCopyInvitationLink}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {panel === "more" ? (
            <div className="space-y-4">
              {!canEdit ? (
                <div className="flex items-start gap-2 rounded-md border border-[#d8ddd6] bg-white px-3 py-3 text-sm leading-6 text-[#4d574c]">
                  <Lock className="mt-0.5 shrink-0 text-[#16635b]" size={15} />
                  <span>{labels.actions.editorsOnly}</span>
                </div>
              ) : null}

              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#24211d]">
                  <Paperclip size={15} />
                  {labels.actions.files}
                </h3>
                <button
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#24211d] px-3 text-sm font-semibold text-white disabled:cursor-wait disabled:bg-[#8a847c]"
                  disabled={!canEdit || uploadingFile}
                  onClick={onUploadFile}
                  type="button"
                >
                  <Upload size={16} />
                  {uploadingFile ? labels.editor.saving : labels.actions.uploadFile}
                </button>
                <div className="mt-3 max-h-36 space-y-2 overflow-y-auto pr-1">
                  {files.length > 0 ? (
                    files.slice(0, 6).map((file) => (
                      <FileAssetRow file={file} key={file.id} />
                    ))
                  ) : (
                    <p className="rounded-md border border-dashed border-[#d8ddd6] bg-white px-3 py-4 text-center text-sm text-[#687267]">
                      {labels.actions.noUploadedFiles}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-[#e1e5dc] pt-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#24211d]">
                  <Clock3 size={15} />
                  {labels.actions.history}
                </h3>
                <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                  {pageVersions.length > 0 ? (
                    pageVersions.slice(0, 8).map((version) => (
                      <PageVersionRow
                        canRestore={canEdit}
                        key={version.id}
                        labels={labels}
                        onRestore={onRestoreVersion}
                        version={version}
                      />
                    ))
                  ) : (
                    <p className="rounded-md border border-dashed border-[#d8ddd6] bg-white px-3 py-4 text-center text-sm text-[#687267]">
                      {labels.actions.noHistory}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-[#e1e5dc] pt-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#24211d]">
                  <Trash2 size={15} />
                  {labels.actions.trash}
                </h3>
                <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
                  {trashPages.length > 0 ? (
                    trashPages.slice(0, 8).map((page) => (
                      <TrashPageRow
                        canRestore={canEdit}
                        key={page.id}
                        labels={labels}
                        onRestore={onRestorePage}
                        page={page}
                      />
                    ))
                  ) : (
                    <p className="rounded-md border border-dashed border-[#d8ddd6] bg-white px-3 py-4 text-center text-sm text-[#687267]">
                      {labels.actions.noTrash}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-[#e1e5dc] pt-4" />

              <label className="block text-sm font-semibold text-[#4d574c]">
                {labels.actions.pageIcon}
                <input
                  aria-label={labels.actions.pageIcon}
                  className="mt-2 h-10 w-full rounded-md border border-[#d8ddd6] bg-white px-3 text-sm text-[#24211d] outline-none disabled:cursor-not-allowed disabled:bg-[#f4f5f0] disabled:text-[#8a9286]"
                  disabled={!canEdit}
                  maxLength={12}
                  onChange={(event) => setPageIconDraft(event.target.value)}
                  value={pageIconDraft}
                />
              </label>

              <label className="block text-sm font-semibold text-[#4d574c]">
                {labels.actions.parentPage}
                <select
                  aria-label={labels.actions.parentPage}
                  className="mt-2 h-10 w-full rounded-md border border-[#d8ddd6] bg-white px-3 text-sm text-[#24211d] outline-none disabled:cursor-not-allowed disabled:bg-[#f4f5f0] disabled:text-[#8a9286]"
                  disabled={!canEdit}
                  onChange={(event) => setParentPageDraft(event.target.value)}
                  value={parentPageDraft}
                >
                  <option value="">{labels.actions.rootPage}</option>
                  {possibleParentPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title || labels.editor.untitled}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#16635b] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9ab7b2]"
                disabled={!canEdit}
                onClick={onSavePageSettings}
                type="button"
              >
                <Settings size={16} />
                {labels.actions.savePageSettings}
              </button>

              <button
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#d8ddd6] bg-white px-3 text-sm font-semibold text-[#4d574c] disabled:cursor-not-allowed disabled:text-[#c2c8bf]"
                disabled={!canEdit}
                onClick={onDuplicatePage}
                type="button"
              >
                <Copy size={16} />
                {labels.actions.duplicatePage}
              </button>

              <button
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#e8d5d5] bg-white px-3 text-sm font-semibold text-[#9f1239] disabled:cursor-not-allowed disabled:text-[#d8a6b4]"
                disabled={!canEdit}
                onClick={onDeletePage}
                type="button"
              >
                <Trash2 size={16} />
                {labels.editor.deletePage}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function NotificationItem({
  labels,
  notification,
}: {
  labels: WorkspaceShellLabels;
  notification: Notification;
}) {
  const title =
    notification.type === "mention"
      ? labels.actions.comments
      : notification.type === "workspace_invite"
        ? labels.actions.inviteMember
        : labels.actions.notifications;
  const content = String(notification.payload.content ?? notification.payload.page_title ?? "");

  return (
    <div className="rounded-md border border-[#d8ddd6] bg-white px-3 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-semibold text-[#24211d]">
          <span className={`size-2 rounded-full ${notification.read_at ? "bg-[#b8bfb6]" : "bg-[#16635b]"}`} />
          {title}
        </span>
        <span className="text-xs text-[#687267]">{formatShortDate(notification.created_at)}</span>
      </div>
      {content ? <p className="mt-2 line-clamp-2 text-[#4d574c]">{content}</p> : null}
    </div>
  );
}

function MemberRow({
  canManageMembers,
  currentUserId,
  labels,
  member,
  onChangeRole,
  onRemove,
}: {
  canManageMembers: boolean;
  currentUserId?: string;
  labels: WorkspaceShellLabels;
  member: WorkspaceMember;
  onChangeRole: (userId: string, role: "viewer" | "editor") => void;
  onRemove: (userId: string) => void;
}) {
  const canManageMember =
    canManageMembers && member.role !== "owner" && member.user_id !== currentUserId;
  const editableRole = member.role === "editor" ? "editor" : "viewer";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-[#d8ddd6] bg-white px-3 py-2 text-sm">
      <span className="min-w-0">
        <span className="block truncate font-semibold text-[#24211d]">
          {member.display_name || member.email || member.user_id}
        </span>
        <span className="block truncate text-xs text-[#687267]">{member.email}</span>
      </span>
      {canManageMember ? (
        <span className="flex shrink-0 items-center gap-1">
          <select
            aria-label={labels.actions.inviteRole}
            className="h-8 rounded-md border border-[#d8ddd6] bg-[#fffefa] px-2 text-xs font-semibold text-[#4d574c] outline-none"
            onChange={(event) => onChangeRole(member.user_id, event.target.value as "viewer" | "editor")}
            value={editableRole}
          >
            <option value="editor">{labels.actions.editor}</option>
            <option value="viewer">{labels.actions.viewer}</option>
          </select>
          <button
            className="grid size-8 place-items-center rounded-md border border-[#e8d5d5] bg-[#fffefa] text-[#9f1239]"
            onClick={() => onRemove(member.user_id)}
            title={labels.actions.removeMember}
            type="button"
          >
            <X size={14} />
          </button>
        </span>
      ) : (
        <span className="shrink-0 rounded-md bg-[#eef2eb] px-2 py-1 text-xs font-semibold text-[#4d574c]">
          {roleLabel(member.role, labels)}
        </span>
      )}
    </div>
  );
}

function InvitationRow({
  invitation,
  labels,
  locale,
  onCopyInvitationLink,
}: {
  invitation: WorkspaceInvitation;
  labels: WorkspaceShellLabels;
  locale: string;
  onCopyInvitationLink: (invitation: WorkspaceInvitation) => void;
}) {
  const pending = invitation.status === "pending";
  const inviteUrl =
    pending && typeof window !== "undefined"
      ? buildInviteUrl(window.location.origin, locale, invitation.invite_token)
      : "";

  return (
    <div className="rounded-md border border-[#d8ddd6] bg-white px-3 py-2 text-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <span className="min-w-0 truncate text-[#4d574c]">{invitation.email}</span>
        {pending ? (
          <span className="shrink-0 rounded-md bg-[#eef2eb] px-2 py-1 text-xs font-semibold text-[#4d574c]">
            {labels.actions.pending}
          </span>
        ) : (
          <span className="shrink-0 rounded-md bg-[#eef2eb] px-2 py-1 text-xs font-semibold text-[#4d574c]">
            {invitation.status === "accepted" ? labels.actions.accepted : labels.actions.pending}
          </span>
        )}
      </div>
      {pending ? (
        <div className="mt-2 flex gap-2">
          <input
            aria-label={labels.actions.inviteLink}
            className="h-9 min-w-0 flex-1 rounded-md border border-[#d8ddd6] bg-[#fffefa] px-2 text-xs text-[#4d574c] outline-none"
            readOnly
            value={inviteUrl}
          />
          <button
            className="grid size-9 shrink-0 place-items-center rounded-md border border-[#d8ddd6] bg-[#fffefa] text-[#16635b]"
            onClick={() => onCopyInvitationLink(invitation)}
            title={labels.actions.copyInvitationLink}
            type="button"
          >
            <Copy size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FileAssetRow({ file }: { file: FileAsset }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[#d8ddd6] bg-white px-3 py-2 text-sm">
      <Paperclip size={15} className="shrink-0 text-[#16635b]" />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-[#24211d]">{file.original_name}</span>
        <span className="block truncate text-xs text-[#687267]">
          {file.mime_type ?? "file"} · {formatBytes(file.size_bytes)}
        </span>
      </span>
    </div>
  );
}

function SearchResultItem({
  labels,
  onSelect,
  result,
}: {
  labels: WorkspaceShellLabels;
  onSelect: (pageId: string) => void;
  result: SearchResult;
}) {
  const isBlock = result.kind === "block";

  return (
    <button
      className="grid w-full grid-cols-[28px_minmax(0,1fr)] gap-2 rounded-md border border-transparent px-2 py-2 text-left text-sm text-[#4d574c] hover:border-[#d8ddd6] hover:bg-white"
      onClick={() => onSelect(result.page_id)}
      type="button"
    >
      <span className="mt-0.5 grid size-7 place-items-center rounded-md bg-[#eef2eb] text-[#16635b]">
        {isBlock ? <FileText size={14} /> : <Hash size={14} />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold text-[#24211d]">
            {result.title || labels.editor.untitled}
          </span>
          <span className="shrink-0 rounded bg-[#edf4f2] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#16635b]">
            {isBlock ? labels.panel.blocks : labels.panel.page}
          </span>
        </span>
        {result.excerpt ? (
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#687267]">
            {result.excerpt}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function PageVersionRow({
  canRestore,
  labels,
  onRestore,
  version,
}: {
  canRestore: boolean;
  labels: WorkspaceShellLabels;
  onRestore: (versionId: string) => void;
  version: PageVersion;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_32px] items-center gap-2 rounded-md border border-[#d8ddd6] bg-white px-3 py-2 text-sm">
      <span className="min-w-0">
        <span className="block truncate font-semibold text-[#24211d]">
          {version.title || labels.editor.untitled}
        </span>
        <span className="mt-1 block truncate text-xs text-[#687267]">
          {versionReasonLabel(version.reason, labels)} · {version.block_count} {labels.panel.blocks} · {formatShortDate(version.created_at)}
        </span>
      </span>
      <button
        className="grid size-8 place-items-center rounded-md border border-[#d8ddd6] bg-[#fffefa] text-[#16635b] disabled:cursor-not-allowed disabled:text-[#9ab7b2]"
        disabled={!canRestore}
        onClick={() => onRestore(version.id)}
        title={labels.actions.restoreVersion}
        type="button"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}

function TrashPageRow({
  canRestore,
  labels,
  onRestore,
  page,
}: {
  canRestore: boolean;
  labels: WorkspaceShellLabels;
  onRestore: (pageId: string) => void;
  page: Page;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_32px] items-center gap-2 rounded-md border border-[#d8ddd6] bg-white px-3 py-2 text-sm">
      <span className="min-w-0">
        <span className="block truncate font-semibold text-[#24211d]">
          {page.title || labels.editor.untitled}
        </span>
        <span className="mt-1 block truncate text-xs text-[#687267]">
          {formatShortDate(page.updated_at)}
        </span>
      </span>
      <button
        className="grid size-8 place-items-center rounded-md border border-[#d8ddd6] bg-[#fffefa] text-[#16635b] disabled:cursor-not-allowed disabled:text-[#9ab7b2]"
        disabled={!canRestore}
        onClick={() => onRestore(page.id)}
        title={labels.actions.restorePage}
        type="button"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}

function CommentsPanel({
  comments,
  draft,
  labels,
  onChangeDraft,
  onResolve,
  onSubmit,
}: {
  comments: Comment[];
  draft: string;
  labels: WorkspaceShellLabels;
  onChangeDraft: (value: string) => void;
  onResolve: (commentId: string) => void;
  onSubmit: () => void;
}) {
  const unresolvedComments = comments.filter((comment) => !comment.resolved_at);

  return (
    <div className="rounded-md border border-[#d8ddd6] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare size={15} className="text-[#16635b]" />
          {labels.actions.comments}
        </h3>
        <span className="rounded-md bg-[#eef2eb] px-2 py-1 text-xs font-semibold text-[#4d574c]">
          {unresolvedComments.length}
        </span>
      </div>

      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        {unresolvedComments.length > 0 ? (
          unresolvedComments.map((comment) => (
            <div className="rounded-md border border-[#d8ddd6] bg-[#fbfbf8] p-3 text-sm" key={comment.id}>
              <p className="leading-6 text-[#3d433b]">{comment.content}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-[#687267]">{formatShortDate(comment.created_at)}</span>
                <button
                  className="flex h-8 items-center gap-1 rounded-md border border-[#d8ddd6] bg-white px-2 text-xs font-semibold text-[#4d574c]"
                  onClick={() => onResolve(comment.id)}
                  type="button"
                >
                  <CheckCircle2 size={13} />
                  {labels.actions.resolveComment}
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-[#d8ddd6] bg-[#fbfbf8] px-3 py-5 text-center text-sm text-[#687267]">
            {labels.actions.noComments}
          </p>
        )}
      </div>

      <label className="mt-3 block text-sm font-semibold text-[#4d574c]">
        <span className="sr-only">{labels.actions.addComment}</span>
        <textarea
          className="h-20 w-full resize-none rounded-md border border-[#d8ddd6] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#16635b]"
          onChange={(event) => onChangeDraft(event.target.value)}
          placeholder={labels.actions.commentPlaceholder}
          value={draft}
        />
      </label>
      <button
        className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#16635b] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9ab7b2]"
        disabled={!draft.trim()}
        onClick={onSubmit}
        type="button"
      >
        <AtSign size={15} />
        {labels.actions.addComment}
      </button>
    </div>
  );
}

function BlockEditorRow({
  block,
  blockCount,
  canEdit,
  focused,
  index,
  labels,
  onAddAfter,
  onChangeText,
  onDelete,
  onDragStart,
  onDropOnBlock,
  onFocus,
  onKeyDown,
  onMove,
  onPaste,
  onSaveText,
  onSlashCommand,
  onTypeChange,
  slashSelectionIndex,
  slashMenu,
  textareaRef,
}: {
  block: Block;
  blockCount: number;
  canEdit: boolean;
  focused: boolean;
  index: number;
  labels: WorkspaceShellLabels;
  onAddAfter: (index: number, type?: BlockType) => Promise<void>;
  onChangeText: (blockId: string, text: string) => void;
  onDelete: (block: Block, index: number) => Promise<void>;
  onDragStart: (blockId: string) => void;
  onDropOnBlock: (targetIndex: number) => void;
  onFocus: (blockId: string | null) => void;
  onKeyDown: (
    event: KeyboardEvent<HTMLTextAreaElement>,
    block: Block,
    index: number,
  ) => Promise<void>;
  onMove: (block: Block, index: number, direction: -1 | 1) => Promise<void>;
  onPaste: (
    event: ClipboardEvent<HTMLTextAreaElement>,
    block: Block,
    index: number,
  ) => Promise<void>;
  onSaveText: (block: Block, text: string) => Promise<void>;
  onSlashCommand: (block: Block, type: BlockType) => Promise<void>;
  onTypeChange: (block: Block, type: BlockType) => Promise<void>;
  slashSelectionIndex: number;
  slashMenu: SlashMenuState | null;
  textareaRef: RefCallback<HTMLTextAreaElement>;
}) {
  const text = block.content.text ?? "";
  const typeMeta = blockTypeOptions.find((option) => option.type === block.type) ?? blockTypeOptions[0];
  const inputClass = blockInputClass(block.type);
  const slashOptions = slashMenu ? getSlashOptions(slashMenu.query) : [];
  const displayMarker = blockDisplayMarker(block.type, index);

  return (
    <div
      className={`group grid min-h-12 grid-cols-[74px_minmax(0,1fr)] items-start rounded-md px-2 py-2 ${
        focused ? "bg-white shadow-[0_0_0_1px_#d8ddd6]" : "hover:bg-[#fbfbf8]"
      }`}
      draggable={canEdit}
      onDragEnd={() => {
        if (canEdit) {
          onDragStart("");
        }
      }}
      onDragOver={(event: DragEvent<HTMLDivElement>) => {
        if (canEdit) {
          event.preventDefault();
        }
      }}
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        if (!canEdit) {
          event.preventDefault();
          return;
        }

        event.dataTransfer.effectAllowed = "move";
        onDragStart(block.id);
      }}
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        if (!canEdit) {
          return;
        }

        event.preventDefault();
        onDropOnBlock(index);
      }}
    >
      <div className="flex items-start gap-1 pt-1">
        <select
          aria-label={labels.editor.selectBlockType}
          className="h-8 w-12 rounded-md border border-transparent bg-transparent text-center text-xs font-semibold text-[#687267] outline-none hover:border-[#d8ddd6] hover:bg-white disabled:cursor-not-allowed disabled:text-[#b8bfb6] disabled:hover:border-transparent disabled:hover:bg-transparent"
          disabled={!canEdit}
          onChange={(event) => void onTypeChange(block, event.target.value as BlockType)}
          title={labels.editor.selectBlockType}
          value={block.type}
        >
          {blockTypeOptions.map((option) => (
            <option key={option.type} value={option.type}>
              {option.marker}
            </option>
          ))}
        </select>
        <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className="grid size-7 place-items-center rounded-md text-[#687267] hover:bg-[#e9eee7] disabled:cursor-not-allowed disabled:text-[#c2c8bf]"
            disabled={!canEdit || index === 0}
            onClick={() => void onMove(block, index, -1)}
            title={labels.actions.blockUp}
            type="button"
          >
            <MoveUp size={14} />
          </button>
          <button
            className="grid size-7 place-items-center rounded-md text-[#687267] hover:bg-[#e9eee7] disabled:cursor-not-allowed disabled:text-[#c2c8bf]"
            disabled={!canEdit || index >= blockCount - 1}
            onClick={() => void onMove(block, index, 1)}
            title={labels.actions.blockDown}
            type="button"
          >
            <MoveDown size={14} />
          </button>
          <button
            className="grid size-7 place-items-center rounded-md text-[#687267] hover:bg-[#e9eee7] disabled:cursor-not-allowed disabled:text-[#c2c8bf]"
            disabled={!canEdit}
            onClick={() => void onAddAfter(index)}
            title={labels.editor.addBlock}
            type="button"
          >
            <Plus size={14} />
          </button>
          <button
            className="grid size-7 place-items-center rounded-md text-[#9f1239] hover:bg-[#f7e8e8] disabled:cursor-not-allowed disabled:text-[#d8a6b4]"
            disabled={!canEdit}
            onClick={() => void onDelete(block, index)}
            title={labels.editor.deleteBlock}
            type="button"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="relative min-w-0">
        <div className="mb-1 hidden items-center gap-2 text-xs text-[#687267] group-focus-within:flex">
          <BlockTypeIcon type={block.type} />
          <span>{labels.editor[typeMeta.labelKey]}</span>
        </div>
        <div className={blockContentClass(block.type)}>
          {displayMarker ? (
            <span className="select-none pt-1 text-sm font-semibold text-[#687267]">
              {displayMarker}
            </span>
          ) : null}
          {block.type === "image" || block.type === "file" ? (
            <FileBlockPreview block={block} labels={labels} />
          ) : null}
          <textarea
            className={`${inputClass} ${canEdit ? "" : "cursor-default"}`}
            onBlur={(event) => {
              onFocus(null);
              if (canEdit) {
                void onSaveText(block, event.currentTarget.value);
              }
            }}
            onChange={(event) => {
              if (!canEdit) {
                return;
              }

              resizeTextarea(event.currentTarget);
              onChangeText(block.id, event.currentTarget.value);
            }}
            onFocus={() => onFocus(block.id)}
            onKeyDown={(event) => {
              if (canEdit) {
                void onKeyDown(event, block, index);
              }
            }}
            onPaste={(event) => {
              if (canEdit) {
                void onPaste(event, block, index);
              }
            }}
            placeholder={blockPlaceholder(block.type, labels)}
            readOnly={!canEdit}
            ref={textareaRef}
            rows={1}
            spellCheck={block.type !== "code"}
            value={text}
          />
        </div>

        {canEdit && slashMenu ? (
          <div className="absolute left-2 top-full z-20 mt-2 w-[min(360px,calc(100vw-7rem))] rounded-md border border-[#d8ddd6] bg-white p-2 shadow-[0_16px_50px_rgba(36,33,29,0.14)]">
            <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase text-[#687267]">
              <Command size={13} />
              {labels.editor.slashHint}
            </div>
            <div className="space-y-1">
              {slashOptions.map((option, optionIndex) => (
                <button
                  className={`grid w-full grid-cols-[34px_1fr] items-center rounded-md px-2 py-2 text-left text-sm text-[#3d433b] ${
                    slashSelectionIndex === optionIndex
                      ? "bg-[#e9eee7]"
                      : "hover:bg-[#eef2eb]"
                  }`}
                  key={option.type}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void onSlashCommand(block, option.type)}
                  type="button"
                >
                  <span className="grid size-7 place-items-center rounded-md bg-[#f2f4ef] text-xs font-semibold text-[#16635b]">
                    {option.marker}
                  </span>
                  <span>{labels.editor[option.labelKey]}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BlockTypeIcon({ type }: { type: BlockType }) {
  if (type === "heading_1") {
    return <Heading1 size={14} />;
  }

  if (type === "heading_2" || type === "heading_3") {
    return <Heading2 size={14} />;
  }

  if (type === "code") {
    return <Code2 size={14} />;
  }

  if (type === "image") {
    return <ImageIcon size={14} />;
  }

  if (type === "file") {
    return <Paperclip size={14} />;
  }

  if (type === "bulleted_list" || type === "numbered_list") {
    return <List size={14} />;
  }

  return <FileText size={14} />;
}

function FileBlockPreview({ block, labels }: { block: Block; labels: WorkspaceShellLabels }) {
  const name = String(block.content.text ?? labels.actions.uploadedFiles);
  const mimeType = typeof block.content.mime_type === "string" ? block.content.mime_type : "";
  const url = typeof block.content.url === "string" ? block.content.url : "";
  const sizeBytes =
    typeof block.content.size_bytes === "number" ? block.content.size_bytes : null;

  return (
    <div className="mb-2 rounded-md border border-[#d8ddd6] bg-white p-3">
      {block.type === "image" && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={name}
          className="mb-3 max-h-72 w-full rounded-md object-contain"
          src={url}
        />
      ) : null}
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#eef2eb] text-[#16635b]">
          {block.type === "image" ? <ImageIcon size={17} /> : <Paperclip size={17} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[#24211d]">{name}</span>
          <span className="block truncate text-xs text-[#687267]">
            {mimeType || labels.editor.file} · {formatBytes(sizeBytes)}
          </span>
        </span>
      </div>
    </div>
  );
}

function InfoSection({
  body,
  icon,
  title,
}: {
  body: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[#687267]">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-[#4d574c]">{body}</p>
    </div>
  );
}

function SaveNotice({
  labels,
  saveError,
  saveState,
  saving,
}: {
  labels: WorkspaceShellLabels;
  saveError: string | null;
  saveState: SaveState;
  saving: boolean;
}) {
  if (saveError || saveState === "error") {
    return (
      <div className="rounded-md border border-[#f1c7c7] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9f1239]">
        <p className="flex items-start gap-2 break-words">
          <CircleAlert className="mt-1 shrink-0" size={14} />
          {saveError ?? labels.editor.error}
        </p>
      </div>
    );
  }

  if (saving || saveState === "saving") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-[#d8ddd6] bg-white px-3 py-2 text-sm text-[#4d574c]">
        <Loader2 className="animate-spin text-[#16635b]" size={14} />
        {labels.editor.saving}
      </div>
    );
  }

  return null;
}

async function getCurrentToken() {
  const session = await getCurrentSession();

  return session?.access_token ?? null;
}

async function getCurrentSession() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session ?? null;
}

async function createInitialWorkspace(
  apiUrl: string,
  token: string,
  userId: string,
  labels: WorkspaceShellLabels,
) {
  const lockKey = `hongtion:initial-workspace:${userId}`;
  const ownsLock = claimBootstrapLock(lockKey);

  if (!ownsLock) {
    const workspace = await waitForInitialWorkspace(apiUrl, token);

    if (workspace) {
      return workspace;
    }
  }

  try {
    const existingWorkspace = (await listWorkspaces(apiUrl, token))[0];

    if (existingWorkspace) {
      return existingWorkspace;
    }

    return createWorkspace(apiUrl, token, {
      default_locale: "ko",
      icon: "H",
      name: labels.bootstrap.workspaceName,
    });
  } finally {
    if (ownsLock) {
      releaseBootstrapLock(lockKey);
    }
  }
}

async function createInitialPage(
  apiUrl: string,
  token: string,
  workspaceId: string,
  labels: WorkspaceShellLabels,
) {
  const lockKey = `hongtion:initial-page:${workspaceId}`;
  const ownsLock = claimBootstrapLock(lockKey);

  if (!ownsLock) {
    const page = await waitForInitialPage(apiUrl, token, workspaceId);

    if (page) {
      return page;
    }
  }

  try {
    const existingPage = selectPageAfterRefresh(
      await listPages(apiUrl, token, workspaceId),
      null,
    );

    if (existingPage) {
      return existingPage;
    }

    return createPage(apiUrl, token, {
      icon: "문",
      position: nextPosition(),
      title: labels.bootstrap.pageTitle,
      workspace_id: workspaceId,
    });
  } finally {
    if (ownsLock) {
      releaseBootstrapLock(lockKey);
    }
  }
}

async function waitForInitialWorkspace(apiUrl: string, token: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await delay(500);

    const workspace = (await listWorkspaces(apiUrl, token))[0];

    if (workspace) {
      return workspace;
    }
  }

  return null;
}

async function waitForInitialPage(apiUrl: string, token: string, workspaceId: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await delay(500);

    const page = selectPageAfterRefresh(
      await listPages(apiUrl, token, workspaceId),
      null,
    );

    if (page) {
      return page;
    }
  }

  return null;
}

async function waitForStarterBlocks(
  apiUrl: string,
  token: string,
  pageId: string,
  starterBlocks: ReturnType<typeof getStarterBlocks>,
) {
  const requiredPositions = new Set(starterBlocks.map((block) => block.position));

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await delay(500);

    const page = await getPage(apiUrl, token, pageId);
    const positions = new Set((page.blocks ?? []).map((block) => block.position));

    if ([...requiredPositions].every((position) => positions.has(position))) {
      return page;
    }
  }

  return null;
}

function claimBootstrapLock(lockKey: string) {
  if (typeof window === "undefined") {
    return true;
  }

  const now = Date.now();
  const activeLock = Number(window.localStorage.getItem(lockKey) ?? 0);

  if (activeLock && now - activeLock < 10_000) {
    return false;
  }

  window.localStorage.setItem(lockKey, String(now));
  return true;
}

function releaseBootstrapLock(lockKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(lockKey);
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function ensureStarterBlocks(
  apiUrl: string,
  token: string,
  pageId: string,
  labels: WorkspaceShellLabels,
) {
  const page = await getPage(apiUrl, token, pageId);
  const blocks = page.blocks ?? [];
  const starterBlocks = getStarterBlocks(labels);

  if (blocks.length > 0 && page.title !== labels.bootstrap.pageTitle) {
    return page;
  }

  const lockKey = `hongtion:starter-blocks:${pageId}`;
  const ownsLock = claimBootstrapLock(lockKey);

  if (!ownsLock) {
    const hydratedPage = await waitForStarterBlocks(apiUrl, token, pageId, starterBlocks);

    if (hydratedPage) {
      return hydratedPage;
    }
  }

  try {
    const latestPage = await getPage(apiUrl, token, pageId);
    const latestBlocks = latestPage.blocks ?? [];

    if (latestBlocks.length > 0 && latestPage.title !== labels.bootstrap.pageTitle) {
      return latestPage;
    }

    const existingPositions = new Set(latestBlocks.map((block) => block.position));
    const missingBlocks = starterBlocks.filter(
      (block) => !existingPositions.has(block.position),
    );

    if (missingBlocks.length === 0) {
      return latestPage;
    }

    for (const block of missingBlocks) {
      await createBlock(apiUrl, token, {
        ...block,
        page_id: pageId,
      });
    }

    return getPage(apiUrl, token, pageId);
  } finally {
    if (ownsLock) {
      releaseBootstrapLock(lockKey);
    }
  }
}

function getStarterBlocks(labels: WorkspaceShellLabels) {
  return [
    {
      content: { text: labels.blocks.headline },
      position: "a0",
      type: "heading_1" as BlockType,
    },
    {
      content: { text: labels.blocks.paragraph },
      position: "a1",
      type: "paragraph" as BlockType,
    },
    {
      content: { text: labels.blocks.bulletOne },
      position: "a2",
      type: "bulleted_list" as BlockType,
    },
    {
      content: { text: labels.blocks.bulletTwo },
      position: "a3",
      type: "bulleted_list" as BlockType,
    },
    {
      content: { language: "elixir", text: labels.blocks.code },
      position: "a4",
      type: "code" as BlockType,
    },
  ];
}

async function ensurePageHasAtLeastOneBlock(apiUrl: string, token: string, pageId: string) {
  const page = await getPage(apiUrl, token, pageId);

  if (page.blocks?.length) {
    return page;
  }

  const block = await createBlock(apiUrl, token, {
    content: { text: "" },
    page_id: pageId,
    position: nextPosition(),
    type: "paragraph",
  });

  return { ...page, blocks: [block] };
}

function buildPageTree(pages: Page[]) {
  const nodes = new Map<string, PageNode>();
  const roots: PageNode[] = [];

  pages.forEach((page) => {
    nodes.set(page.id, { ...page, children: [], depth: 0 });
  });

  nodes.forEach((node) => {
    if (node.parent_id && nodes.has(node.parent_id)) {
      const parent = nodes.get(node.parent_id);
      parent?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (items: PageNode[], depth: number) => {
    items.sort(comparePages);
    items.forEach((item) => {
      item.depth = depth;
      sortNodes(item.children, depth + 1);
    });
  };

  sortNodes(roots, 0);

  return roots;
}

function comparePages(a: Page, b: Page) {
  return (
    (a.position ?? "").localeCompare(b.position ?? "") ||
    (a.created_at ?? "").localeCompare(b.created_at ?? "")
  );
}

function selectPageAfterRefresh(pages: Page[], preferredPageId?: string | null) {
  if (preferredPageId) {
    const preferred = pages.find((page) => page.id === preferredPageId);

    if (preferred) {
      return preferred;
    }
  }

  return [...pages].sort(comparePages)[0];
}

function collectAncestorPageIds(pages: Page[], page: Page) {
  const byId = new Map(pages.map((item) => [item.id, item]));
  const ancestorIds: string[] = [];
  let parentId = page.parent_id;

  while (parentId) {
    const parent = byId.get(parentId);

    if (!parent) {
      break;
    }

    ancestorIds.push(parent.id);
    parentId = parent.parent_id;
  }

  return ancestorIds;
}

function getPageIdFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("page");
}

function getStoredPageId(workspaceId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(`hongtion:last-page:${workspaceId}`);
}

function persistActivePage(workspaceId: string, pageId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`hongtion:last-page:${workspaceId}`, pageId);

  const url = new URL(window.location.href);
  url.searchParams.set("page", pageId);
  window.history.replaceState(null, "", url);
}

function upsertPage(pages: Page[], page: Page) {
  const exists = pages.some((item) => item.id === page.id);

  if (!exists) {
    return [...pages, page].sort(comparePages);
  }

  return pages.map((item) => (item.id === page.id ? { ...item, ...page } : item)).sort(comparePages);
}

function isDescendantPage(pages: Page[], pageId: string, ancestorId: string) {
  const byId = new Map(pages.map((page) => [page.id, page]));
  let current = byId.get(pageId);

  while (current?.parent_id) {
    if (current.parent_id === ancestorId) {
      return true;
    }

    current = byId.get(current.parent_id);
  }

  return false;
}

function insertBlock(blocks: Block[], block: Block, index: number) {
  const nextBlocks = [...blocks];
  nextBlocks.splice(index, 0, block);
  return nextBlocks;
}

function upsertBlock(blocks: Block[], block: Block) {
  const exists = blocks.some((item) => item.id === block.id);
  const nextBlocks = exists
    ? blocks.map((item) => (item.id === block.id ? block : item))
    : [...blocks, block];

  return sortBlocks(nextBlocks);
}

function upsertInvitation(
  current: WorkspaceInvitation[],
  invitation: WorkspaceInvitation,
  refreshed: WorkspaceInvitation[],
) {
  if (refreshed.some((item) => item.id === invitation.id)) {
    return refreshed;
  }

  const exists = current.some((item) => item.id === invitation.id);
  return exists
    ? current.map((item) => (item.id === invitation.id ? invitation : item))
    : [invitation, ...current];
}

function sortBlocks(blocks: Block[]) {
  return [...blocks].sort(compareBlocks);
}

function compareBlocks(a: Block, b: Block) {
  return (
    (a.parent_block_id ?? "").localeCompare(b.parent_block_id ?? "") ||
    (a.position ?? "").localeCompare(b.position ?? "") ||
    (a.created_at ?? "").localeCompare(b.created_at ?? "")
  );
}

async function persistBlockOrder(
  apiUrl: string,
  token: string,
  blocks: Block[],
  pushRealtimeEvent: (event: "block:update", payload: object) => void,
) {
  await Promise.all(
    blocks.map(async (block, index) => {
      const position = positionForIndex(index);
      const savedBlock = await updateBlock(apiUrl, token, block.id, { position });
      pushRealtimeEvent("block:update", { block: savedBlock });
    }),
  );
}

function getSlashOptions(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return blockTypeOptions;
  }

  return blockTypeOptions.filter((option) =>
    [option.type, option.labelKey, option.marker]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

function markdownShortcutType(value: string): BlockType | null {
  if (value === "#") {
    return "heading_1";
  }

  if (value === "##") {
    return "heading_2";
  }

  if (value === "###") {
    return "heading_3";
  }

  if (value === "-" || value === "*") {
    return "bulleted_list";
  }

  if (value === "1.") {
    return "numbered_list";
  }

  if (value === "```") {
    return "code";
  }

  return null;
}

function blockFromPlainTextLine(line: string): {
  content: Block["content"];
  type: BlockType;
} {
  const trimmed = line.trimStart();

  if (trimmed.startsWith("### ")) {
    return { content: { text: trimmed.slice(4) }, type: "heading_3" };
  }

  if (trimmed.startsWith("## ")) {
    return { content: { text: trimmed.slice(3) }, type: "heading_2" };
  }

  if (trimmed.startsWith("# ")) {
    return { content: { text: trimmed.slice(2) }, type: "heading_1" };
  }

  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    return { content: { text: trimmed.slice(2) }, type: "bulleted_list" };
  }

  if (/^\d+\.\s/.test(trimmed)) {
    return { content: { text: trimmed.replace(/^\d+\.\s/, "") }, type: "numbered_list" };
  }

  return { content: { text: line }, type: "paragraph" };
}

function nextPosition(seed = 0) {
  return `${Date.now().toString(36)}-${seed.toString(36)}`;
}

function positionForIndex(index: number) {
  return String((index + 1) * 100).padStart(6, "0");
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
}

function validateUploadFiles(files: File[], labels: WorkspaceShellLabels) {
  for (const file of files) {
    if (file.size > maxUploadBytes) {
      return `${labels.actions.uploadTooLarge}: ${file.name}`;
    }

    if (!allowedUploadTypes.has(file.type)) {
      return `${labels.actions.uploadTypeUnsupported}: ${file.name}`;
    }
  }

  return null;
}

function formatBytes(value: number | null | undefined) {
  if (!value) {
    return "0 KB";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function roleLabel(role: WorkspaceMember["role"], labels: WorkspaceShellLabels) {
  if (role === "owner") {
    return labels.actions.owner;
  }

  if (role === "editor") {
    return labels.actions.editor;
  }

  return labels.actions.viewer;
}

function versionReasonLabel(reason: string | null, labels: WorkspaceShellLabels) {
  if (reason === "page_create") {
    return labels.newPage;
  }

  if (reason === "page_delete") {
    return labels.editor.deletePage;
  }

  if (reason === "page_restore") {
    return labels.actions.restorePage;
  }

  if (reason === "version_restore") {
    return labels.actions.restoreVersion;
  }

  if (reason?.startsWith("block_")) {
    return labels.panel.blocks;
  }

  return labels.actions.history;
}

function buildPageUrl(origin: string, locale: string, pageId: string) {
  const url = new URL(`/${locale}`, origin);
  url.searchParams.set("page", pageId);
  return url.toString();
}

function buildInviteUrl(origin: string, locale: string, inviteToken: string) {
  return new URL(`/${locale}/invite/${inviteToken}`, origin).toString();
}

async function writeClipboardText(text: string) {
  try {
    if (!navigator.clipboard?.writeText) {
      return false;
    }

    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "0px";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function blockPlaceholder(type: BlockType, labels: WorkspaceShellLabels) {
  if (type === "heading_1" || type === "heading_2" || type === "heading_3") {
    return labels.editor.placeholderHeading;
  }

  if (type === "code") {
    return labels.editor.placeholderCode;
  }

  if (type === "image") {
    return labels.editor.image;
  }

  if (type === "file") {
    return labels.editor.file;
  }

  return labels.editor.placeholder;
}

function blockDisplayMarker(type: BlockType, index: number) {
  if (type === "bulleted_list") {
    return "•";
  }

  if (type === "numbered_list") {
    return `${index + 1}.`;
  }

  return null;
}

function blockContentClass(type: BlockType) {
  if (type === "bulleted_list" || type === "numbered_list") {
    return "grid grid-cols-[24px_minmax(0,1fr)] items-start";
  }

  return "block";
}

function blockInputClass(type: BlockType) {
  const base =
    "block w-full resize-none overflow-hidden rounded-md border border-transparent bg-transparent px-2 py-1 outline-none transition-colors placeholder:text-[#a0a89d] hover:border-[#d8ddd6] focus:border-[#16635b] focus:bg-white";

  if (type === "heading_1") {
    return `${base} text-3xl font-bold leading-tight text-[#24211d] max-sm:text-2xl`;
  }

  if (type === "heading_2") {
    return `${base} text-2xl font-bold leading-tight text-[#24211d] max-sm:text-xl`;
  }

  if (type === "heading_3") {
    return `${base} text-xl font-bold leading-tight text-[#24211d]`;
  }

  if (type === "code") {
    return `${base} border-[#d8ddd6] bg-[#f2f4ef] font-mono text-sm leading-6 text-[#3d3832] shadow-inner focus:bg-[#f2f4ef]`;
  }

  if (type === "image" || type === "file") {
    return `${base} text-sm leading-6 text-[#4d574c]`;
  }

  return `${base} text-base leading-7 text-[#3d433b]`;
}

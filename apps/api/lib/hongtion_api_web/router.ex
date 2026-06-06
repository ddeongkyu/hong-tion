defmodule HongtionApiWeb.Router do
  use HongtionApiWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :authenticated_api do
    plug HongtionApiWeb.Plugs.CurrentUser
  end

  scope "/api", HongtionApiWeb do
    pipe_through :api

    get "/health", HealthController, :show
    get "/health/db", HealthController, :db
  end

  scope "/api", HongtionApiWeb do
    pipe_through [:api, :authenticated_api]

    get "/profile", ProfileController, :show
    patch "/profile", ProfileController, :update

    resources "/workspaces", WorkspaceController, only: [:index, :show, :create]
    get "/workspaces/:workspace_id/pages", PageController, :index
    get "/workspaces/:workspace_id/search", SearchController, :index
    get "/workspaces/:workspace_id/trash", PageController, :trash
    get "/workspaces/:workspace_id/members", WorkspaceMemberController, :index
    patch "/workspaces/:workspace_id/members/:user_id", WorkspaceMemberController, :update
    delete "/workspaces/:workspace_id/members/:user_id", WorkspaceMemberController, :delete
    get "/workspaces/:workspace_id/invitations", WorkspaceInvitationController, :index
    post "/workspaces/:workspace_id/invitations", WorkspaceInvitationController, :create
    post "/invitations/:token/accept", WorkspaceInvitationController, :accept
    get "/workspaces/:workspace_id/files", FileAssetController, :index
    post "/workspaces/:workspace_id/files", FileAssetController, :create

    patch "/pages/:id/restore", PageController, :restore
    get "/pages/:page_id/versions", PageVersionController, :index
    post "/pages/:page_id/versions/:version_id/restore", PageVersionController, :restore
    resources "/pages", PageController, only: [:show, :create, :update, :delete]
    get "/pages/:page_id/blocks", BlockController, :index
    get "/pages/:page_id/comments", CommentController, :index
    post "/pages/:page_id/comments", CommentController, :create

    resources "/blocks", BlockController, only: [:create, :update, :delete]
    patch "/comments/:id/resolve", CommentController, :resolve
    get "/notifications", NotificationController, :index
    patch "/notifications/read", NotificationController, :mark_all_read
    patch "/notifications/:id/read", NotificationController, :mark_read
  end

  # Enable LiveDashboard in development
  if Application.compile_env(:hongtion_api, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]

      live_dashboard "/dashboard", metrics: HongtionApiWeb.Telemetry
    end
  end
end

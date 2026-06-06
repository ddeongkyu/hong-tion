import { getTranslations } from "next-intl/server";

import { AuthGate } from "@/components/auth-gate";
import { InviteAccept } from "@/components/invite-accept";

type InvitePageProps = {
  params: Promise<{ locale: string; token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { locale, token } = await params;
  const t = await getTranslations("workspace");

  return (
    <AuthGate
      labels={{
        brandLine: t("auth.brandLine"),
        title: t("auth.title"),
        subtitle: t("auth.subtitle"),
        email: t("auth.email"),
        password: t("auth.password"),
        signIn: t("auth.signIn"),
        signUp: t("auth.signUp"),
        signingIn: t("auth.signingIn"),
        signingUp: t("auth.signingUp"),
        forgotPassword: t("auth.forgotPassword"),
        resetPassword: t("auth.resetPassword"),
        resetEmailSent: t("auth.resetEmailSent"),
        updatePassword: t("auth.updatePassword"),
        updatingPassword: t("auth.updatingPassword"),
        passwordUpdated: t("auth.passwordUpdated"),
        backToSignIn: t("auth.backToSignIn"),
        newPassword: t("auth.newPassword"),
        toggleToSignUp: t("auth.toggleToSignUp"),
        toggleToSignIn: t("auth.toggleToSignIn"),
        confirmEmail: t("auth.confirmEmail"),
        loading: t("auth.loading"),
        realtime: t("auth.realtime"),
        multilingual: t("auth.multilingual"),
        documentPreviewTitle: t("auth.documentPreviewTitle"),
        documentPreviewBody: t("auth.documentPreviewBody"),
        workspacePreview: t("auth.workspacePreview"),
        language: t("language"),
      }}
      locale={locale}
    >
      <InviteAccept
        inviteToken={token}
        labels={{
          accepting: t("invite.accepting"),
          expired: t("invite.expired"),
          forbidden: t("invite.forbidden"),
          goWorkspace: t("invite.goWorkspace"),
          ready: t("invite.ready"),
          retry: t("invite.retry"),
          success: t("invite.success"),
          title: t("invite.title"),
        }}
        locale={locale}
      />
    </AuthGate>
  );
}

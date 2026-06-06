import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";

import "../globals.css";
import { routing } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "Hong-tion",
  description: "Collaborative document workspace",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

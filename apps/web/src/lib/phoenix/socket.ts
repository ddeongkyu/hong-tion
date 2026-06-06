"use client";

import { Socket } from "phoenix";

import { requiredPublicEnv } from "@/lib/env";

export function createHongtionSocket(token: string) {
  const socketUrl = requiredPublicEnv("NEXT_PUBLIC_PHOENIX_SOCKET_URL", "ws://localhost:4000/socket");

  return new Socket(socketUrl, {
    params: { token },
  });
}

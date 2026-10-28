"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { onOpenAssistant } from "./open";

const ChatPanel = dynamic(() => import("./ChatPanel").then((m) => m.ChatPanel), { ssr: false });

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);

  function show() {
    setEverOpened(true);
    setOpen(true);
  }

  useEffect(() => onOpenAssistant(show), []);

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  return (
    <div className="no-print">
      {everOpened && <ChatPanel open={open} onClose={close} />}
      {!open && (
        <button
          ref={launcher}
          type="button"
          onClick={show}
          className="fixed right-4 bottom-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-heading shadow-lg shadow-black/40 transition hover:bg-gold-bright"
        >
          <span aria-hidden="true">✦</span> Ask about the festival
        </button>
      )}
    </div>
  );
}

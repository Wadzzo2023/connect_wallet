import React from "react";
import toast from "react-hot-toast";
import { DocumentDuplicateIcon } from "@heroicons/react/24/solid";
import { addrShort } from "../../../lib/utils";

export function showFundAccountToast(pubkey: string) {
  toast.custom(
    (t) => (
      <div
        style={{ opacity: t.visible ? 1 : 0, transition: "opacity 150ms ease" }}
        className="flex w-full max-w-sm items-start gap-3 rounded-xl border border-amber-200 bg-white p-4 shadow-lg dark:border-amber-800 dark:bg-zinc-900"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
          <svg
            className="h-4 w-4 text-amber-600 dark:text-amber-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Fund your account
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Your Stellar account isn&apos;t activated yet. Send at least 1 XLM to
            the address below to activate it.
          </p>

          <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-zinc-100 px-2.5 py-1.5 dark:bg-zinc-800">
            <code className="flex-1 truncate font-mono text-xs text-zinc-700 dark:text-zinc-300">
              {addrShort(pubkey, 16)}
            </code>
            <button
              onClick={() => {
                void toast.promise(navigator.clipboard.writeText(pubkey), {
                  loading: "Copying…",
                  success: "Address copied!",
                  error: "Failed to copy",
                });
              }}
              className="flex-shrink-0 rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
              title="Copy full address"
            >
              <DocumentDuplicateIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    ),
    { id: "account-not-funded", duration: 14000 },
  );
}

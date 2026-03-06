"use client";

import { MailCheck, ArrowRight } from "lucide-react";

/* eslint-disable @next/next/no-html-link-for-pages */

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 relative overflow-hidden">
      {/* Ambient orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "color-mix(in srgb, var(--color-primary-500) 5%, transparent)", filter: "blur(100px)" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "rgba(5, 150, 105, 0.04)", filter: "blur(80px)" }}
      />

      <div className="relative z-10 w-full max-w-md px-6 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/shipos-logo-mark.svg"
            alt="ShipOS"
            width={48}
            height={48}
            className="mb-4 rounded-xl"
          />
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-surface-100">Ship</span>
            <span className="text-2xl font-bold text-primary-500">OS</span>
          </div>
        </div>

        {/* Success card */}
        <div className="rounded-2xl p-8 shadow-2xl shadow-surface-700/30 dark:shadow-surface-100/40 layout-card-surface">
          <div className="flex flex-col items-center gap-5">
            {/* Animated check icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-status-success-500/10">
              <MailCheck className="h-8 w-8 text-status-success-500" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-surface-100 mb-2">
                Check Your Email
              </h1>
              <p className="text-sm text-surface-400 leading-relaxed">
                We&apos;ve sent a verification link to your email address.
                Click the link to verify your account and get started with your free trial.
              </p>
            </div>

            <div className="w-full rounded-lg bg-surface-800 p-4 text-left">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">
                What happens next?
              </h3>
              <ol className="space-y-2 text-sm text-surface-400">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-[10px] font-bold text-primary-500">
                    1
                  </span>
                  Verify your email address
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-[10px] font-bold text-primary-500">
                    2
                  </span>
                  Log in to your new dashboard
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-[10px] font-bold text-primary-500">
                    3
                  </span>
                  Start managing packages & mailboxes
                </li>
              </ol>
            </div>

            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white
                hover:bg-primary-500 active:bg-primary-700 transition-all duration-150 w-full min-h-[44px] shadow-sm shadow-primary-900/30"
            >
              Go to Login
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <p className="mt-6 text-xs text-surface-500">
          Didn&apos;t receive the email? Check your spam folder or{" "}
          <a href="/support" className="text-primary-500 hover:underline">
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}

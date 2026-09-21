"use client";

import { useState } from "react";

/**
 * EIP-6963 `providerInfo.icon` is specified as a data URI. We only render data
 * image URIs and never hotlink remote assets, so wallet branding cannot break
 * or leak requests to third parties.
 */
const SAFE_ICON_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i;

function GenericWalletGlyph() {
  return (
    <span className="wal-generic" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h9.75A2.25 2.25 0 0 1 18 7.5v.75"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect
          x="3.75"
          y="7.5"
          width="16.5"
          height="11.25"
          rx="2.25"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="16.4" cy="13.1" r="1.35" fill="currentColor" />
      </svg>
    </span>
  );
}

export function WalletIcon({
  icon,
  size = 30,
}: {
  icon?: string;
  size?: number;
}) {
  const [failedIcon, setFailedIcon] = useState<string | null>(null);
  const valid =
    !!icon && SAFE_ICON_PATTERN.test(icon) && failedIcon !== icon;

  if (valid) {
    return (
      <img
        className="wal-ico-img"
        src={icon}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailedIcon(icon ?? null)}
      />
    );
  }
  return <GenericWalletGlyph />;
}

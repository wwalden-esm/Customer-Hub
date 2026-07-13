"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomerLogo({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (failed) return null;

  return (
    <>
      <div className="w-px h-6 bg-white/20 hidden sm:block" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="h-8 max-w-[120px] object-contain hidden sm:block"
        onError={() => setFailed(true)}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth === 0) setFailed(true);
        }}
      />
    </>
  );
}

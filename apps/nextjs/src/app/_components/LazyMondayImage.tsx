"use client";

import * as React from "react";

import Image from "next/image";
import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import { useMonday } from "~/app/providers";

export function LazyMondayImage({
  productId,
  width = 40,
  height = 40,
  className = "h-10 w-10 rounded border object-cover",
  alt = "",
}: {
  productId: string;
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}) {
  const { isInMonday } = useMonday();
  const getImageUrl = useAction(api.products.actions.getImageUrl);
  console.log("[MONDAY] getImageUrl", getImageUrl);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = React.useState(false);
  const [url, setUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const inFlightRef = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
          }
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  React.useEffect(() => {
    console.log("[MONDAY] LazyMondayImage1", {
      inView,
      isInMonday,
      url,
      loading,
      productId,
    });
    if (!inView || !isInMonday || url) return;
    inFlightRef.current = true;
    console.log("[MONDAY] LazyMondayImage2", {
      inView,
      isInMonday,
      url,
      loading,
      productId,
    });

    (async () => {
      try {
        setLoading(true);
        const res = await getImageUrl({ productId: productId as any });
        console.log("[MONDAY] LazyMondayImage3", {
          res,
        });
        console.log("[MONDAY] isActive", { active: inFlightRef.current });
        if (!inFlightRef.current) return;
        if (res?.url) {
          console.log("[MONDAY] LazyMondayImage4", {
            res,
          });
          setUrl(res.url);
          setLoading(false);
        }
      } catch {
      } finally {
        if (inFlightRef.current) setLoading(false);
      }
    })();

    return () => {
      inFlightRef.current = false;
    };
  }, [inView, isInMonday, productId]);

  return (
    <div ref={ref} className="shrink-0">
      {url ? (
        <Image
          src={url}
          alt={alt}
          className={className}
          width={width}
          height={height}
        />
      ) : (
        <div className="h-10 w-10 rounded border bg-muted" />
      )}
    </div>
  );
}

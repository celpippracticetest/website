import { useEffect, useState } from "react";

export function useChunkErrorHandler() {
  const [shouldReload, setShouldReload] = useState(false);

  // Reset retry counter after a stable load window (immediate clear on mount broke
  // the "retry once" guard and treated unrelated script failures as chunk errors).
  useEffect(() => {
    const t = window.setTimeout(() => {
      sessionStorage.removeItem("chunkReloadCount");
    }, 8000);
    return () => window.clearTimeout(t);
  }, []);

  // Handle Promise-based chunk failures (unhandledrejection)
  useEffect(() => {
    const handlePromiseRejection = (e: PromiseRejectionEvent) => {
      const isChunkError =
        e.reason?.name === "ChunkLoadError" ||
        e.reason?.message?.includes("ChunkLoadError");

      if (!isChunkError) return;

      const reloadAttempts = parseInt(
        sessionStorage.getItem("chunkReloadCount") || "0",
        10
      );
      if (reloadAttempts < 1) {
        sessionStorage.setItem("chunkReloadCount", "1");
        console.warn("Promise rejection due to ChunkLoadError → reloading...");
        setShouldReload(true);
        setTimeout(() => {
          window.location.reload();
        }, 0);
      } else {
        console.error(
          "Chunk still failing after reload (from Promise rejection)."
        );
      }
    };

    window.addEventListener("unhandledrejection", handlePromiseRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handlePromiseRejection);
    };
  }, []);

  useEffect(() => {
    const handleChunkError = (e: Event) => {
      const target = e.target as HTMLScriptElement;
      const isChunkError =
        (e.type === "error" &&
          target?.tagName?.toUpperCase() === "SCRIPT" &&
          target?.src.includes("/_next/")) ||
        (e instanceof ErrorEvent &&
          /Loading chunk \d+ failed|ChunkLoadError/.test(e.message));

      if (!isChunkError) return;

      const reloadAttempts = parseInt(
        sessionStorage.getItem("chunkReloadCount") || "0",
        10
      );
      if (reloadAttempts < 1) {
        sessionStorage.setItem("chunkReloadCount", "1");
        console.warn("SCRIPT load error → reloading...");
        setShouldReload(true);
        setTimeout(() => {
          window.location.reload();
        }, 0);
      } else {
        console.error(
          "Chunk still failing after reload (from <script> error)."
        );
      }
    };

    window.addEventListener("error", handleChunkError, true);
    return () => {
      window.removeEventListener("error", handleChunkError, true);
    };
  }, []);

  return shouldReload;
}

import { useEffect, useState } from "react";

export function useChunkErrorHandler() {
  const [shouldReload, setShouldReload] = useState(false);

  // Remove chunkReloadCount from sessionStorage after successful load
  useEffect(() => {
    sessionStorage.removeItem("chunkReloadCount");
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
          (target?.src.includes("/_next/") || target?.src.includes("clerk"))) ||
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

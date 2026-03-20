type MediaPlayErrorLike = {
  name?: unknown;
  message?: unknown;
};

export const isIgnoredMediaPlayError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const { name, message } = error as MediaPlayErrorLike;

  return (
    name === "AbortError" ||
    (typeof message === "string" &&
      message.includes("media was removed from the document"))
  );
};

export const safePlayMedia = async (
  media: HTMLMediaElement | null | undefined,
  options?: {
    onPlayStart?: () => void;
    onError?: (error: unknown) => void;
  }
) => {
  if (!media) {
    return false;
  }

  try {
    await media.play();
    options?.onPlayStart?.();
    return true;
  } catch (error) {
    if (isIgnoredMediaPlayError(error)) {
      return false;
    }

    options?.onError?.(error);
    return false;
  }
};

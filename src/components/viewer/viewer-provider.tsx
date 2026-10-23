"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { viewerSnapshot } from "@/lib/viewer/presentation";
import { previewKinds, previewViewer, type PreviewKind } from "@/lib/viewer/demo";
import type { ViewerSnapshot } from "@/lib/viewer/presentation";

const storageKey = "taskhive.viewer-preview.v1";

type ViewerContextValue = {
  viewer: ViewerSnapshot;
  previewKind: PreviewKind | null;
  isPreview: boolean;
  setPreviewKind: (kind: PreviewKind | null) => void;
  startVerification: () => Promise<boolean>;
  submitAppeal: (note: string) => Promise<boolean>;
};

const ViewerContext = createContext<ViewerContextValue | null>(null);

// The preview lives in a tiny external store so the first client render matches
// the server (guest) and then settles on the chosen state without an effect.
let currentPreview: PreviewKind | null = null;
let previewInitialized = false;
const previewListeners = new Set<() => void>();

function readPreview(): PreviewKind | null {
  if (typeof window === "undefined") return null;

  if (!previewInitialized) {
    previewInitialized = true;
    try {
      const candidate =
        new URLSearchParams(window.location.search).get("as") ??
        window.sessionStorage.getItem(storageKey);
      currentPreview = previewKinds.includes(candidate as PreviewKind)
        ? (candidate as PreviewKind)
        : null;
    } catch {
      currentPreview = null;
    }
  }

  return currentPreview;
}

function subscribePreview(listener: () => void) {
  previewListeners.add(listener);
  return () => {
    previewListeners.delete(listener);
  };
}

function writePreview(kind: PreviewKind | null) {
  currentPreview = kind;
  previewInitialized = true;
  try {
    if (kind) window.sessionStorage.setItem(storageKey, kind);
    else window.sessionStorage.removeItem(storageKey);
  } catch {
    // The preview still works for this render when storage is unavailable.
  }
  previewListeners.forEach((listener) => listener());
}

function getServerPreview(): PreviewKind | null {
  return null;
}

/**
 * Supplies the viewer the UI renders. Until sign-in is wired to this prototype,
 * the real actor is a guest; the state switcher previews the remaining states so
 * every gate can be reviewed without a backend session.
 */
export function ViewerProvider({
  children,
  initialViewer,
}: {
  children: ReactNode;
  initialViewer?: ViewerSnapshot;
}) {
  const router = useRouter();
  const previewKind = useSyncExternalStore(
    subscribePreview,
    readPreview,
    getServerPreview,
  );

  const setPreviewKind = useCallback((kind: PreviewKind | null) => {
    writePreview(kind);
  }, []);

  const startVerification = useCallback(async () => {
    if (previewKind) {
      writePreview("pending");
      return true;
    }

    try {
      const response = await fetch("/api/verification", { method: "POST" });
      if (!response.ok) return false;
      router.refresh();
      return true;
    } catch {
      return false;
    }
  }, [previewKind, router]);

  const submitAppeal = useCallback(
    async (note: string) => {
      if (previewKind) {
        writePreview("appealed");
        return true;
      }

      try {
        const response = await fetch("/api/verification/appeal", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ note }),
        });
        if (!response.ok) return false;
        router.refresh();
        return true;
      } catch {
        return false;
      }
    },
    [previewKind, router],
  );

  const value = useMemo<ViewerContextValue>(() => {
    return {
      viewer: previewViewer(previewKind, initialViewer ?? viewerSnapshot(null)),
      previewKind,
      isPreview: previewKind !== null,
      setPreviewKind,
      startVerification,
      submitAppeal,
    };
  }, [initialViewer, previewKind, setPreviewKind, startVerification, submitAppeal]);

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer(): ViewerContextValue {
  const value = useContext(ViewerContext);
  if (!value) {
    throw new Error("useViewer must be used inside ViewerProvider.");
  }
  return value;
}

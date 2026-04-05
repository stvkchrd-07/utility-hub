import { useRef, useEffect, useCallback } from "react";

export function useBlobManager() {
  const blobUrls = useRef(new Set());

  const createUrl = useCallback((blobOrFile) => {
    const url = URL.createObjectURL(blobOrFile);
    blobUrls.current.add(url);
    return url;
  }, []);

  const revokeUrl = useCallback((url) => {
    if (url && blobUrls.current.has(url)) {
      URL.revokeObjectURL(url);
      blobUrls.current.delete(url);
    }
  }, []);

  const clearAll = useCallback(() => {
    blobUrls.current.forEach(URL.revokeObjectURL);
    blobUrls.current.clear();
  }, []);

  useEffect(() => {
    return clearAll; // Automatically clean up memory when tool closes
  }, [clearAll]);

  return { createUrl, revokeUrl, clearAll };
}

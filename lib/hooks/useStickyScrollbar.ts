import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Hook that provides a "sticky" horizontal scrollbar fixed to the viewport bottom
 * when the real scrollbar of a wide table is out of view.
 *
 * Uses IntersectionObserver on a sentinel element to detect visibility,
 * ResizeObserver for dimension tracking, and bidirectional scroll sync.
 */
export function useStickyScrollbar() {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fixedScrollbarRef = useRef<HTMLDivElement | null>(null);
  const isSyncingRef = useRef(false);

  const [sentinelVisible, setSentinelVisible] = useState(true);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [containerLeft, setContainerLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const updateDimensions = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setScrollWidth(el.scrollWidth);
    setContainerLeft(rect.left);
    setContainerWidth(rect.width);
  }, []);

  // IntersectionObserver: detect if real scrollbar area is visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setSentinelVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // ResizeObserver: track dimension changes
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(el);

    const handleWindowChange = () => updateDimensions();
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [updateDimensions]);

  // Sync: real container -> fixed scrollbar
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      if (fixedScrollbarRef.current) {
        fixedScrollbarRef.current.scrollLeft = el.scrollLeft;
      }
      isSyncingRef.current = false;
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync: fixed scrollbar -> real container
  const onFixedScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollLeft = e.currentTarget.scrollLeft;
    }
    isSyncingRef.current = false;
  }, []);

  const showFixedScrollbar = !sentinelVisible && scrollWidth > containerWidth;

  return {
    scrollContainerRef,
    sentinelRef,
    fixedScrollbarRef,
    showFixedScrollbar,
    scrollWidth,
    containerLeft,
    containerWidth,
    onFixedScroll,
  };
}

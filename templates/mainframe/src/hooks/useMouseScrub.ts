import { useEffect, type RefObject } from 'react';

const SENSITIVITY = 0.8;

export function useMouseScrub(videoRef: RefObject<HTMLVideoElement>) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let prevX: number | null = null;
    let targetTime = video.currentTime;
    let seekInFlight = false;

    const seekNext = () => {
      if (
        seekInFlight ||
        video.seeking ||
        !Number.isFinite(video.duration) ||
        video.duration <= 0
      ) {
        return;
      }

      targetTime = Math.min(video.duration, Math.max(0, targetTime));
      if (Math.abs(video.currentTime - targetTime) < 0.001) return;

      seekInFlight = true;
      video.currentTime = targetTime;
    };

    const onSeeked = () => {
      seekInFlight = false;
      seekNext();
    };

    const onLoadedMetadata = () => {
      targetTime = video.currentTime;
      seekInFlight = false;
    };

    const onMouseMove = (event: MouseEvent) => {
      const currentX = event.clientX;
      if (prevX === null) {
        prevX = currentX;
        return;
      }

      const delta = currentX - prevX;
      prevX = currentX;
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;

      const offset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      targetTime = Math.min(video.duration, Math.max(0, targetTime + offset));
      seekNext();
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [videoRef]);
}

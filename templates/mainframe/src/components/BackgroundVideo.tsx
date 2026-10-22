import { useRef } from 'react';
import { VIDEO_FALLBACK_URL, VIDEO_URL } from '../content';
import { useMouseScrub } from '../hooks/useMouseScrub';

export function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useMouseScrub(videoRef);

  return (
    <video
      ref={videoRef}
      className="fixed inset-0 z-0 h-full w-full object-cover object-[70%_center]"
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
    >
      <source src={VIDEO_URL} type="video/mp4" />
      <source src={VIDEO_FALLBACK_URL} type="video/mp4" />
    </video>
  );
}

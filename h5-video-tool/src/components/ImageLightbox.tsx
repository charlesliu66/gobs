import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { disposePortalRoot, ensurePortalRoot } from './portalRoot';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const root = ensurePortalRoot('gobs-lightbox-root');
    setPortalRoot(root);
    return () => disposePortalRoot(root);
  }, []);

  if (!portalRoot) return null;

  return createPortal(
    <div
      className="fixed top-0 right-0 bottom-0 left-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm sm:left-56"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt ?? ''}
          className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          draggable={false}
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>
    </div>,
    portalRoot,
  );
}

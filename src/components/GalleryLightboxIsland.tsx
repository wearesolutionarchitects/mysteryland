import { useEffect } from 'preact/hooks';

type GalleryLightbox = {
  destroy: () => void;
  openAt: (index?: number) => void;
};

type GalleryLightboxFactory = (options: Record<string, unknown>) => GalleryLightbox;

interface Props {
  galleryId: string;
}

let glightboxImport: Promise<GalleryLightboxFactory> | undefined;

const loadGLightbox = () => {
  glightboxImport ??= import('glightbox').then((module) => module.default as GalleryLightboxFactory);
  return glightboxImport;
};

export default function GalleryLightboxIsland({ galleryId }: Props) {
  useEffect(() => {
    const gallery = document.getElementById(galleryId);
    if (!gallery) return;

    let lightbox: GalleryLightbox | undefined;
    let initializing: Promise<void> | undefined;
    let disposed = false;

    const initialize = () => {
      if (lightbox) return Promise.resolve();
      if (initializing) return initializing;

      initializing = (async () => {
      const GLightbox = await loadGLightbox();
      if (disposed) return;

      lightbox = GLightbox({
        elements: Array.from(gallery.querySelectorAll<HTMLAnchorElement>('a.glightbox')).map((link) => ({
          href: link.href,
          type: 'image',
          title: link.dataset.title,
        })),
        touchNavigation: true,
        loop: true,
        zoomable: true,
        openEffect: 'zoom',
        closeEffect: 'fade',
        slideEffect: 'slide',
      }) as GalleryLightbox;
      })();

      return initializing;
    };

    const onClick = async (event: Event) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a.glightbox')
        : null;
      if (!target || !gallery.contains(target)) return;

      event.preventDefault();
      await initialize();
      lightbox?.openAt(Number(target.dataset.index || '0'));
    };

    gallery.addEventListener('click', onClick);

    return () => {
      disposed = true;
      gallery.removeEventListener('click', onClick);
      lightbox?.destroy();
    };
  }, [galleryId]);

  return null;
}

import GLightbox from 'glightbox';
import { useEffect } from 'preact/hooks';

type GalleryLightbox = {
  destroy: () => void;
};

interface Props {
  galleryId: string;
}

export default function GalleryLightboxIsland({ galleryId }: Props) {
  useEffect(() => {
    const gallery = document.getElementById(galleryId);
    if (!gallery) return;

    const lightbox = GLightbox({
      selector: `#${CSS.escape(galleryId)} a.glightbox`,
      touchNavigation: true,
      loop: true,
      zoomable: true,
      openEffect: 'zoom',
      closeEffect: 'fade',
      slideEffect: 'slide',
    }) as GalleryLightbox;

    return () => {
      lightbox.destroy();
    };
  }, [galleryId]);

  return null;
}

import { useEffect } from 'preact/hooks';

interface Props {
  sliderId: string;
}

export default function TicketSliderIsland({ sliderId }: Props) {
  useEffect(() => {
    const slider = document.getElementById(sliderId);
    const track = slider?.querySelector<HTMLElement>('[data-ticket-slider-track]');
    const prev = slider?.querySelector<HTMLButtonElement>('[data-ticket-slider-prev]');
    const next = slider?.querySelector<HTMLButtonElement>('[data-ticket-slider-next]');

    if (!slider || !track || !prev || !next) return;

    const slides = Array.from(track.querySelectorAll<HTMLElement>('.ticket-slider__slide'));
    let activeIndex = 0;
    let autoplay: number | undefined;
    let scrollFrame: number | undefined;

    const updateActiveIndex = () => {
      activeIndex = slides.reduce((nearestIndex, slide, index) => {
        const currentDistance = Math.abs(slide.offsetLeft - track.offsetLeft - track.scrollLeft);
        const nearestDistance = Math.abs(slides[nearestIndex].offsetLeft - track.offsetLeft - track.scrollLeft);
        return currentDistance < nearestDistance ? index : nearestIndex;
      }, activeIndex);
    };
    const scrollToSlide = (index: number) => {
      if (!slides.length) return;
      activeIndex = (index + slides.length) % slides.length;
      track.scrollTo({ left: slides[activeIndex].offsetLeft - track.offsetLeft, behavior: 'smooth' });
    };
    const stopAutoplay = () => autoplay && window.clearInterval(autoplay);
    const startAutoplay = () => {
      stopAutoplay();
      autoplay = window.setInterval(() => scrollToSlide(activeIndex + 1), 5000);
    };
    const onPrev = () => scrollToSlide(activeIndex - 1);
    const onNext = () => scrollToSlide(activeIndex + 1);
    const onScroll = () => {
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(updateActiveIndex);
    };
    const onFocusOut = (event: Event) => {
      if (!slider.contains((event as FocusEvent).relatedTarget as Node | null)) startAutoplay();
    };

    prev.addEventListener('click', onPrev);
    next.addEventListener('click', onNext);
    track.addEventListener('scroll', onScroll);
    slider.addEventListener('mouseenter', stopAutoplay);
    slider.addEventListener('mouseleave', startAutoplay);
    slider.addEventListener('focusin', stopAutoplay);
    slider.addEventListener('focusout', onFocusOut);
    startAutoplay();

    return () => {
      stopAutoplay();
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      prev.removeEventListener('click', onPrev);
      next.removeEventListener('click', onNext);
      track.removeEventListener('scroll', onScroll);
      slider.removeEventListener('mouseenter', stopAutoplay);
      slider.removeEventListener('mouseleave', startAutoplay);
      slider.removeEventListener('focusin', stopAutoplay);
      slider.removeEventListener('focusout', onFocusOut);
    };
  }, [sliderId]);

  return null;
}

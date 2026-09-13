import { useEffect, useState } from 'react';

export const APPLICATION_FORM_SECTION_IDS = [
  'application-basic-information',
  'application-progress-and-time',
  'application-additional-information',
] as const;

interface FormSectionNavigation {
  activeStep: number;
  setActiveStep: (index: number) => void;
  handleStepClick: (index: number) => void;
}

export function useFormSectionNavigation(
  sectionIds: readonly string[] = APPLICATION_FORM_SECTION_IDS,
): FormSectionNavigation {
  const [activeStep, setActiveStep] = useState<number>(0);

  useEffect(() => {
    let animationFrame: number | null = null;
    const scrollContainer: HTMLElement | null =
      document.querySelector('.layout-main');

    const updateActiveStep = (): void => {
      animationFrame = null;
      const containerAtBottom: boolean = Boolean(
        scrollContainer &&
          scrollContainer.scrollTop > 0 &&
          scrollContainer.scrollTop + scrollContainer.clientHeight >=
            scrollContainer.scrollHeight - 4,
      );
      const windowAtBottom: boolean =
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 4;

      if (containerAtBottom || windowAtBottom) {
        setActiveStep(sectionIds.length - 1);
        return;
      }

      const activationLine: number = Math.min(window.innerHeight * 0.25, 180);
      let nextStep: number = 0;

      sectionIds.forEach((id: string, index: number) => {
        const section: HTMLElement | null = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= activationLine) {
          nextStep = index;
        }
      });

      setActiveStep((current: number) =>
        current === nextStep ? current : nextStep,
      );
    };

    const scheduleUpdate = (): void => {
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(updateActiveStep);
    };

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scrollContainer?.addEventListener('scroll', scheduleUpdate, {
      passive: true,
    });
    scheduleUpdate();

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      scrollContainer?.removeEventListener('scroll', scheduleUpdate);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [sectionIds]);

  const handleStepClick = (index: number): void => {
    const sectionId: string | undefined = sectionIds[index];
    if (!sectionId) return;

    const section: HTMLElement | null = document.getElementById(sectionId);
    if (!section) return;

    setActiveStep(index);
    const reduceMotion: boolean = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    section.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return { activeStep, setActiveStep, handleStepClick };
}

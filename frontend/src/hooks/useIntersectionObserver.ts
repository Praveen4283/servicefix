import { useRef, useState, useEffect } from 'react';

interface IntersectionOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface IntersectionResult {
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
}

/**
 * Hook to detect when an element is visible in the viewport
 * @param options - IntersectionObserver options
 * @returns Object with ref to attach to the element and boolean indicating if it's visible
 */
const useIntersectionObserver = (options: IntersectionOptions = {}): IntersectionResult => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      // If triggerOnce is true, only set to true once and never back to false
      if (options.triggerOnce) {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      } else {
        setIsVisible(entry.isIntersecting);
      }
    }, options);

    const currentRef = ref.current;
    
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [options, options.triggerOnce]);

  return { ref, isVisible };
};

export default useIntersectionObserver; 
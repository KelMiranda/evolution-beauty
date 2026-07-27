import { useEffect, useRef } from 'react';

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (error: string) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileProps {
  siteKey: string;
  onToken: (token: string | null) => void;
  onError?: (error: string) => void;
  onUnavailable?: () => void;
}

export function Turnstile({ siteKey, onToken, onError, onUnavailable }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const onUnavailableRef = useRef(onUnavailable);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;
  onUnavailableRef.current = onUnavailable;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const script = document.querySelector<HTMLScriptElement>('script[data-turnstile-script]');

    const removeWidget = () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };

    const renderWidget = () => {
      if (cancelled || widgetIdRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: siteKey,
        callback: token => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(null),
        'error-callback': error => {
          onTokenRef.current(null);
          onErrorRef.current?.(error);
        },
      });
    };

    const handleScriptError = () => {
      if (!cancelled) onUnavailableRef.current?.();
    };

    const availabilityTimeout = window.setTimeout(() => {
      if (!cancelled && !window.turnstile) onUnavailableRef.current?.();
    }, 8000);

    if (window.turnstile) {
      renderWidget();
    } else if (script) {
      script.addEventListener('load', renderWidget);
      script.addEventListener('error', handleScriptError);
    } else {
      onUnavailableRef.current?.();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(availabilityTimeout);
      script?.removeEventListener('load', renderWidget);
      script?.removeEventListener('error', handleScriptError);
      removeWidget();
      onTokenRef.current(null);
    };
  }, [siteKey]);

  return <div ref={containerRef} className="cf-turnstile min-h-[65px]" data-testid="turnstile-widget" />;
}

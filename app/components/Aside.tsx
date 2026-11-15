import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {useLocation} from 'react-router';
import {FOCUSABLE_SELECTOR, keepTabInside} from '~/lib/focusTrap';

type AsideType = 'search' | 'cart' | 'mobile' | 'closed';
type AsideContextValue = {
  type: AsideType;
  open: (mode: AsideType) => void;
  close: () => void;
};

const AsideContext = createContext<AsideContextValue | null>(null);

function AsideProvider({children}: {children: ReactNode}) {
  const [type, setType] = useState<AsideType>('closed');
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const close = useCallback(() => setType('closed'), []);
  // A route change (back/forward, swipe-back, a link outside the drawer)
  // must not leave the overlay, the body scroll lock and the drawer focus
  // behind on the new page.
  const {pathname} = useLocation();
  useEffect(() => {
    setType('closed');
  }, [pathname]);
  const open = useCallback(
    (mode: AsideType) => {
      if (mode === 'closed') {
        close();
        return;
      }

      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setType(mode);
    },
    [close],
  );

  useEffect(() => {
    if (type === 'closed') return;

    const previousOverflow = document.body.style.overflow;
    const returnFocus = returnFocusRef.current;
    const panel = document.querySelector<HTMLElement>(
      `[data-aside-panel="${type}"]`,
    );
    const focusTarget = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    const focusFrame = window.requestAnimationFrame(() => {
      (focusTarget ?? panel)?.focus();
    });
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab' && panel) keepTabInside(event, panel);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeydown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeydown);
      if (returnFocus?.isConnected) {
        window.requestAnimationFrame(() => returnFocus.focus());
      }
    };
  }, [close, type]);

  return (
    <AsideContext.Provider
      value={{
        type,
        open,
        close,
      }}
    >
      {children}
    </AsideContext.Provider>
  );
}

/** The drawer state the shell's cart, menu and search panels share. */
export const Aside = {Provider: AsideProvider};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}

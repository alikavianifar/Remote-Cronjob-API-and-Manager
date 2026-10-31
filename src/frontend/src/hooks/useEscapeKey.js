import { useEffect } from 'react';

/** Calls `handler` when Escape is pressed while the component is mounted. */
export function useEscapeKey(handler) {
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') handler();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [handler]);
}

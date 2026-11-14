import { useEffect } from 'react';

/** Título de la pestaña por pantalla: ayuda a ubicarse y a los lectores de pantalla. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · MineTrack360`;
  }, [title]);
}

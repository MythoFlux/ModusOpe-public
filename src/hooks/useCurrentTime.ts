// src/hooks/useCurrentTime.ts
import { useState, useEffect } from 'react';

/**
 * Custom hook, joka palauttaa nykyisen ajan ja päivittyy minuutin välein.
 * @returns Nykyinen Date-objekti.
 */
export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Asetetaan ajastin, joka päivittää ajan 60 sekunnin välein
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Siivotaan ajastin, kun komponentti poistetaan näkyvistä
    return () => clearInterval(timerId);
  }, []);

  return currentTime;
}

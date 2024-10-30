import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import { slideshowLessonWithExternalInfoSchema } from '@/utils/generateSlides/parse';

export default function Home() {
  const [slideshowJson, setSlideshowJson] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Cargar el JSON externo una vez montado el componente
    const loadSlideshowJson = async () => {
      try {
        const response = await fetch('/slideshow.json');
        if (!response.ok) throw new Error('Error al cargar el JSON');
        const data = await response.json();
        setSlideshowJson(data);
      } catch (error) {
        console.error(error);
      }
    };

    loadSlideshowJson();
  }, []);

  const validationResult = slideshowJson
    ? (() => {
        try {
          const { data, problems } = slideshowLessonWithExternalInfoSchema(slideshowJson);
          return { data, error: problems?.toString() };
        } catch (error) {
          return { error: 'Could not validate JSON' };
        }
      })()
    : { error: 'JSON not loaded' };

  useEffect(() => {
    if (!validationResult?.data) return;
    navigate('/player', { state: validationResult.data });
  }, [validationResult, navigate]);

  return <main></main>;
}

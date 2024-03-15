import { arrayOf, type } from 'arktype';
import { type FormEvent, useId, useState } from 'react';
import clsx from 'clsx';

import styles from './Home.module.css';
import { useNavigate } from 'react-router-dom';
import { generateSlides } from '@/utils/generateSlides';
import { toast } from 'sonner';

const validateSlideshow = type({
  title: 'string',
  asset: { type: "'image' | 'video'", url: 'string' },
  slides: arrayOf({
    title: 'string',
    paragraphs: 'string[]',
    asset: { type: "'image' | 'video'", url: 'string' },
  }),
});

export function Home() {
  const jsonTextAreaId = useId();
  const errorMessageId = useId();
  const [slideshowJson, setSlideshowJson] = useState(slideshowJsonExample);
  const [isGeneratingSlide, setIsGeneratingSlide] = useState(false);

  const navigate = useNavigate();

  const validationResult = (() => {
    try {
      const parsed = JSON.parse(slideshowJson) as unknown;
      const { data, problems } = validateSlideshow(parsed);
      return { data, error: problems?.toString() };
    } catch (error) {
      return { error: 'Could not parse JSON' };
    }
  })();

  async function handleSubmitForm(event: FormEvent<HTMLFormElement>) {
    // Prevent form default behavior
    event.preventDefault();

    if (!validationResult?.data) return;

    const slideshow = validationResult.data;
    setIsGeneratingSlide(true);

    toast.promise(generateSlides(slideshow), {
      loading: 'Generating slide...',
      success: (slides) => {
        navigate('/player', { state: slides });
        return 'Slides generated successfully!';
      },
      error: (error) => {
        console.log(error);
        return 'Could not generate slides, please try again or check your slideshow JSON.';
      },
      finally: () => {
        setIsGeneratingSlide(false);
      },
    });
  }

  return (
    <main className={styles.main}>
      <form className={styles.form} onSubmit={handleSubmitForm}>
        <h1 className={styles.title}>Enter slideshow as JSON</h1>

        <label htmlFor={jsonTextAreaId} className="sr-only">
          Slideshow JSON
        </label>
        <textarea
          id={jsonTextAreaId}
          className={clsx(styles.textArea, 'focus-ring')}
          value={slideshowJson}
          aria-invalid={!validationResult?.error !== undefined}
          aria-labelledby={errorMessageId}
          onChange={(event) => setSlideshowJson(event.target.value)}
        />
        {validationResult?.error !== undefined && (
          <span
            id={errorMessageId}
            className={styles.errorMessage}
            role="alert"
          >
            <pre>{validationResult.error}</pre>
          </span>
        )}

        <button
          className={styles.submitButton}
          type="submit"
          disabled={!validationResult?.data || isGeneratingSlide}
        >
          Generate slides
        </button>
      </form>
    </main>
  );
}

const slideshowJsonExample = JSON.stringify(
  {
    title: 'Redes sociales y Salud mental',
    asset: {
      type: 'image',
      url: 'https://picsum.photos/seed/ce7aadbc-f04b-4dc9-b494-ad8f3e6efd03/1920/446',
    },
    slides: [
      {
        title: '¿Sabias qué?',
        asset: {
          type: 'image',
          url: 'https://picsum.photos/seed/f29f3e08-aeae-4fbe-a56c-242318ac1518/958/1080',
        },
        paragraphs: [
          'En los últimos años...',
          'Las redes sociales se han convertido en una herramienta muy importante para la inteacción humana, especialmente entre los adolescentes y adultos jóvenes.',
        ],
      },
      {
        title:
          '¿Pero qué pasa cuando las redes sociales afectan nuestra salud mental?',
        asset: {
          type: 'image',
          url: 'https://picsum.photos/seed/ab33cf99-07c6-4926-8824-d3016777e958/834/1080',
        },
        paragraphs: [
          'A pesar de su gran utilidad, en los últimos años, diversos estudios en Norteamérica y Europa han encontrado que el uso desmedido de las redes sociales contribuye al aumento de síntomas y problemas de salud mental.',
        ],
      },
      {
        title:
          'Principales problemas de salud mental que se han incrementado con el uso excesivo de las redes sociales:',
        asset: {
          type: 'image',
          url: 'https://picsum.photos/seed/bc8edfb4-8755-4387-8a5d-7f19d56f7ca3/1019/1080',
        },
        paragraphs: [
          '• Transtornos del sueño\n• Acoso cibernético o ciberbullying\n• Ansiedad y síndrome de abstinencia\n• Baja autoestima',
        ],
      },
      {
        title: 'Transtornos del sueño',
        asset: {
          type: 'image',
          url: 'https://picsum.photos/seed/bfa39a6c-0315-43f6-aca8-ee596e7d1d08/585/1080',
        },
        paragraphs: [
          'El uso desmedido de las redes sociales ha sido asociado con un incremento en la aparición de transtorno de sueño, ansiedad, depresión y problemas de autoestima, sobre todo en personas con edades comprendidas entre 16 y 26 años.',
        ],
      },
      {
        title: 'Acoso cibérnetico',
        asset: {
          type: 'image',
          url: 'https://picsum.photos/seed/5ad18577-3811-4452-ba67-4edff3f0488a/821/1080',
        },
        paragraphs: [
          'El bullying cibernético o ciberbullying, es cada vez más frecuente entre los escolares, universitarios y adultos jóvenes.',
          'Las redes sociales también se han convertido en un espacio en donde muchos descargan sentimientos de hostilidad y rechazo hacia otras personas, especialmente en el anonimato',
        ],
      },
      {
        title: 'Ansiedad y sindrome de abstinencia',
        asset: {
          type: 'image',
          url: 'https://picsum.photos/seed/72ecd5de-0d21-4c32-8257-26f5a2a944ae/827/1080',
        },
        paragraphs: [
          'Por otra parte, aquellos que tienen dificultades para controlar el uso de las redes sociales, constantemente han experimentado síntomas de',
          'Esto se debe a la necesidad de estar conectado contantemente y así mantenerse actualizados de lo que sucede a su alrededor',
          'Entre otros de los efectos del uso desmedido de las redes sociales, está el efecto negativo entre aquellas personas que las utilizan como una suerte de parámetro a partir del cual tienen a compararse',
        ],
      },
      {
        title:
          '¿Cómo evitar los efectos negativos de las redes sociales en la salud mental?',
        asset: {
          type: 'image',
          url: 'https://picsum.photos/seed/0e7900ee-a54b-4750-80ac-d97537c08e76/1008/1080',
        },
        paragraphs: [],
      },
      {
        title: 'Puede que parezca un problema de menos relevancia, pero:',
        asset: {
          type: 'image',
          url: 'https://picsum.photos/seed/510e0bfc-1a41-487f-8492-c43172159a31/1920/538',
        },
        paragraphs: [
          'Lo cierto es que es importante estar atentos al uso que le damos a nuestras redes sociales, principalmente los más jovenes.',
          'Revisemos la cantidad de tiempo que se dedica a la actividad en línea y prestemos atención al tipo de material que consumimos',
        ],
      },
      {
        title: 'Finalmente, también es necesario recordar que:',
        asset: {
          type: 'image',
          url: 'https://picsum.photos/seed/b5c65fe7-1922-42a5-8568-5b58500bac20/1920/514',
        },
        paragraphs: [
          'Un uso adecuado de las redes sociales puede ser una fuente importante de apoyo social y emocional. Sin embargo, es esencial mantener un equilibrio y conciencia en su uso, evitando posibles efectos negativos y la sobreexposición a contenidos estresantes.',
        ],
      },
    ],
  },
  null,
  2
);

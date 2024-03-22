import { useNavigate } from 'react-router-dom';
import { type FormEvent, useId, useState } from 'react';
import { toast } from 'sonner';
import clsx from 'clsx';

import styles from './Home.module.css';

import { generateSlides } from '@/utils/generateSlides';
import {
  parseSlideshowLesson,
  slideshowLessonSchema,
} from '@/utils/generateSlides/parse';

export function Home() {
  const jsonTextAreaId = useId();
  const errorMessageId = useId();
  const [slideshowJson, setSlideshowJson] = useState(slideshowJsonExample);
  const [isGeneratingSlide, setIsGeneratingSlide] = useState(false);

  const navigate = useNavigate();

  const validationResult = (() => {
    try {
      const parsed = JSON.parse(slideshowJson) as unknown;
      const { data, problems } = slideshowLessonSchema(parsed);
      return { data, error: problems?.toString() };
    } catch (error) {
      return { error: 'Could not parse JSON' };
    }
  })();

  async function handleSubmitForm(event: FormEvent<HTMLFormElement>) {
    // Prevent form default behavior
    event.preventDefault();

    if (!validationResult?.data) return;

    const slideshowBase = validationResult.data;
    setIsGeneratingSlide(true);

    const slideshowContent = parseSlideshowLesson(slideshowBase);

    toast.promise(generateSlides(slideshowContent), {
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
    type: 'Lección Engine',
    title: 'Presentation',
    elementCode: '67400928-3c9b-4730-8c60-a21a7f666b6c',
    elementLesson: {
      lessonTheme: '1',
      paragraphs: [
        {
          content:
            'Descubriendo el corazón de los Países Nórdicos: "Descubriendo el corazón de los Países Nórdicos" es una temática fascinante que nos lleva a explorar una región del mundo conocida por su impresionante belleza natural, una calidad de vida excepcional y una cultura rica y distinta.',
          audioScript:
            'Descubriendo el corazón de los Países Nórdicos: "Descubriendo el corazón de los Países Nórdicos" es una temática fascinante que nos lleva a explorar una región del mundo conocida por su impresionante belleza natural, una calidad de vida excepcional y una cultura rica y distinta.',
          audioUrl:
            'https://sophieassets.blob.core.windows.net/speeches/671cefb4-ee82-4efa-87af-160638a493d7.mp3',
          titleAI: 'Exploring the Nordic Heartlands',
          videoData: {
            thumb: { url: '', width: 0, height: 0 },
            finalVideo: { url: '', width: 0, height: 0 },
          },
          imageData: {
            image: {},
            thumb: {},
            finalImage: {
              url: 'https://images.pexels.com/photos/12741259/pexels-photo-12741259.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
              width: '',
              height: '',
            },
            imagesIds: [],
            urlBing: '',
          },
          keyPhrases: [
            'Descubriendo el corazón de los Países Nórdicos',
            'explorar una región del mundo',
            'impresionante belleza natural',
            'calidad de vida excepcional',
            'cultura rica y distinta',
          ],
          alternativePronunciations: [],
        },
        {
          content:
            'Los Países Nórdicos, compuestos por Dinamarca, Finlandia, Islandia, Noruega y Suecia, ofrecen un mosaico de experiencias y tradiciones que reflejan su profundo respeto por la naturaleza, la igualdad y la innovación.',
          audioScript:
            'Los Países Nórdicos, compuestos por Dinamarca, Finlandia, Islandia, Noruega y Suecia, ofrecen un mosaico de experiencias y tradiciones que reflejan su profundo respeto por la naturaleza, la igualdad y la innovación.',
          audioUrl:
            'https://sophieassets.blob.core.windows.net/speeches/9dfc0762-a5ed-4761-8689-7509d3d4ef96.mp3',
          titleAI: "Exploring Nordic Countries' Heart",
          imageData: {
            image: {},
            thumb: {},
            finalImage: {},
            imagesIds: '',
            urlBing: '',
          },
          videoData: {
            thumb: { url: '', width: 0, height: 0 },
            finalVideo: {
              url: 'https://player.vimeo.com/progressive_redirect/playback/530634522/rendition/1080p/file.mp4?loc=external&oauth2_token_id=1747418641&signature=2eb9faa6d68a82da3b78d904143d568a567e9b06a47b6ca88bb90fee9566a21f',
              width: 0,
              height: 0,
            },
          },
          keyPhrases: [
            'Los Países Nórdicos',
            'compuestos por Dinamarca',
            'Finlandia',
            'Islandia',
            'Noruega y Suecia',
            'ofrecen un mosaico de experiencias y tradiciones',
            'reflejan su profundo respeto por la naturaleza',
            'la igualdad y la innovación',
          ],
        },
        {
          content:
            'En el corazón de la región nórdica, la naturaleza juega un papel fundamental en la vida cotidiana de sus habitantes. Desde los dramáticos fiordos noruegos hasta los bosques densos de Finlandia, pasando por las llanuras heladas de Islandia y las islas idílicas de Dinamarca y Suecia, el respeto por el medio ambiente es un valor compartido y una fuente de inspiración constante.',
          audioScript:
            'En el corazón de la región nórdica, la naturaleza juega un papel fundamental en la vida cotidiana de sus habitantes. Desde los dramáticos fiordos noruegos hasta los bosques densos de Finlandia, pasando por las llanuras heladas de Islandia y las islas idílicas de Dinamarca y Suecia, el respeto por el medio ambiente es un valor compartido y una fuente de inspiración constante.',
          audioUrl:
            'https://sophieassets.blob.core.windows.net/speeches/fd5107f6-0e3a-41dc-a4ca-b85ea9ebbe59.mp3',
          titleAI: '"Nature\'s Heart in Nordic Lands"',
          videoData: {
            thumb: { url: '', width: 0, height: 0 },
            finalVideo: { url: '', width: 0, height: 0 },
          },
          imageData: {
            image: {},
            thumb: {},
            finalImage: {
              url: 'https://images.pexels.com/photos/17384852/pexels-photo-17384852.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
              width: '',
              height: '',
            },
            imagesIds: [],
            urlBing: '',
          },
          keyPhrases: [
            'En el corazón de la región nórdica',
            'la naturaleza juega un papel fundamental',
            'dramáticos fiordos noruegos',
            'bosques densos de Finlandia',
            'llanuras heladas de Islandia',
            'islas idílicas de Dinamarca y Suecia',
            'respeto por el medio ambiente es un valor compartido',
          ],
        },
        {
          content:
            'Este vínculo intrínseco con la naturaleza no solo ha dado forma a la forma de vida nórdica, sino que también se refleja en sus políticas ambientales vanguardistas y su liderazgo global en sostenibilidad.',
          audioScript:
            'Este vínculo intrínseco con la naturaleza no solo ha dado forma a la forma de vida nórdica, sino que también se refleja en sus políticas ambientales vanguardistas y su liderazgo global en sostenibilidad.',
          audioUrl:
            'https://sophieassets.blob.core.windows.net/speeches/68e8c4d4-0ad6-4c45-9447-e57c6be479a1.mp3',
          titleAI: 'Nordic Nature and Sustainability Leadership',
          imageData: {
            image: {},
            thumb: {},
            finalImage: {},
            imagesIds: '',
            urlBing: '',
          },
          videoData: {
            thumb: { url: '', width: 0, height: 0 },
            finalVideo: {
              url: 'https://player.vimeo.com/progressive_redirect/playback/530655808/rendition/1080p/file.mp4?loc=external&oauth2_token_id=1747418641&signature=5b3f18072a107f3e1f9d7d2e927d8715b29449ef78c5464f14541653d39248c5',
              width: 0,
              height: 0,
            },
          },
          keyPhrases: [
            'Este vínculo intrínseco con la naturaleza',
            'forma de vida nórdica',
            'políticas ambientales vanguardistas',
            'liderazgo global en sostenibilidad',
          ],
        },
        {
          content:
            'La calidad de vida en los Países Nórdicos es otra faceta que cautiva a quienes profundizan en su conocimiento. Estas naciones destacan regularmente en los índices globales de felicidad, educación, igualdad de género y bienestar social.',
          audioScript:
            'La calidad de vida en los Países Nórdicos es otra faceta que cautiva a quienes profundizan en su conocimiento. Estas naciones destacan regularmente en los índices globales de felicidad, educación, igualdad de género y bienestar social.',
          audioUrl:
            'https://sophieassets.blob.core.windows.net/speeches/cd7bd8ee-f89e-40c2-9cb8-71c716d1c629.mp3',
          titleAI: 'Nordic Quality of Life Highlights',
          videoData: {
            thumb: { url: '', width: 0, height: 0 },
            finalVideo: { url: '', width: 0, height: 0 },
          },
          imageData: {
            image: {},
            thumb: {},
            finalImage: {
              url: 'https://images.pexels.com/photos/17384862/pexels-photo-17384862.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
              width: '',
              height: '',
            },
            imagesIds: [],
            urlBing: '',
          },
          keyPhrases: [
            'La calidad de vida en los Países Nórdicos',
            'destacan regularmente en los índices globales',
            'felicidad',
            'educación',
            'igualdad de género y bienestar social',
          ],
        },
        {
          content:
            'Este logro es el resultado de un modelo de bienestar social sólido, sistemas educativos inclusivos y un compromiso con la igualdad de derechos y oportunidades para todos sus ciudadanos. La transparencia, la confianza en las instituciones públicas y un alto grado de participación cívica son pilares que sostienen la cohesión social y la satisfacción general en estos países.',
          audioScript:
            'Este logro es el resultado de un modelo de bienestar social sólido, sistemas educativos inclusivos y un compromiso con la igualdad de derechos y oportunidades para todos sus ciudadanos. La transparencia, la confianza en las instituciones públicas y un alto grado de participación cívica son pilares que sostienen la cohesión social y la satisfacción general en estos países.',
          audioUrl:
            'https://sophieassets.blob.core.windows.net/speeches/9e71da5a-6cdd-4fb8-baca-4a8771fdeddc.mp3',
          titleAI: 'Nordic Social Welfare Success',
          imageData: {
            image: {},
            thumb: {},
            finalImage: {},
            imagesIds: '',
            urlBing: '',
          },
          videoData: {
            thumb: { url: '', width: 0, height: 0 },
            finalVideo: {
              url: 'https://player.vimeo.com/progressive_redirect/playback/530656871/rendition/1080p/file.mp4?loc=external&oauth2_token_id=1747418641&signature=150b24b2b8343156df76a2c48c941eacddf963cdf87ba61ed48a07a75f477d27',
              width: 0,
              height: 0,
            },
          },
          keyPhrases: [
            'modelo de bienestar social sólido',
            'sistemas educativos inclusivos',
            'compromiso con la igualdad de derechos y oportunidades',
            'transparencia',
            'confianza en las instituciones públicas',
            'alto grado de participación cívica',
            'cohesión social y la satisfacción general',
          ],
        },
        {
          content:
            'La cultura nórdica, con su profunda veneración por las tradiciones y al mismo tiempo una apertura a la innovación y a nuevas ideas, ofrece un espectro rico y variado. Desde la literatura robusta, la cual incluye sagas épicas y obras contemporáneas que han ganado reconocimiento internacional, hasta movimientos artísticos y de diseño que han influenciado significativamente las tendencias globales.',
          audioScript:
            'La cultura nórdica, con su profunda veneración por las tradiciones y al mismo tiempo una apertura a la innovación y a nuevas ideas, ofrece un espectro rico y variado. Desde la literatura robusta, la cual incluye sagas épicas y obras contemporáneas que han ganado reconocimiento internacional, hasta movimientos artísticos y de diseño que han influenciado significativamente las tendencias globales.',
          audioUrl:
            'https://sophieassets.blob.core.windows.net/speeches/57ef3d41-f672-43f2-810b-a9a3f412c294.mp3',
          titleAI: 'Nordic Culture: Tradition and Innovation',
          videoData: {
            thumb: { url: '', width: 0, height: 0 },
            finalVideo: { url: '', width: 0, height: 0 },
          },
          imageData: {
            image: {},
            thumb: {},
            finalImage: {
              url: 'https://images.pexels.com/photos/20156997/pexels-photo-20156997.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
              width: '',
              height: '',
            },
            imagesIds: [],
            urlBing: '',
          },
          keyPhrases: [
            'La cultura nórdica',
            'profunda veneración por las tradiciones',
            'apertura a la innovación y a nuevas ideas',
            'espectro rico y variado',
            'literatura robusta',
            'sagas épicas y obras contemporáneas',
            'reconocimiento internacional',
            'movimientos artísticos y de diseño',
            'influenciado significativamente las tendencias globales',
          ],
        },
        {
          content:
            'La música, la gastronomía y las festividades también reflejan la diversidad y la creatividad de estos pueblos, mostrando un equilibrio admirable entre el resguardo de su patrimonio y la exploración de nuevos horizontes.',
          audioScript:
            'La música, la gastronomía y las festividades también reflejan la diversidad y la creatividad de estos pueblos, mostrando un equilibrio admirable entre el resguardo de su patrimonio y la exploración de nuevos horizontes.',
          audioUrl:
            'https://sophieassets.blob.core.windows.net/speeches/96c1af4d-158d-4f63-9ce9-532d64bfcf8e.mp3',
          titleAI: 'Nordic Culture: Tradition and Innovation',
          imageData: {
            image: {},
            thumb: {},
            finalImage: {},
            imagesIds: '',
            urlBing: '',
          },
          videoData: {
            thumb: { url: '', width: 0, height: 0 },
            finalVideo: {
              url: 'https://player.vimeo.com/progressive_redirect/playback/530644627/rendition/1080p/file.mp4?loc=external&oauth2_token_id=1747418641&signature=bbed0b9c157c59c2d4311c45539f95b4294e971b3d9f695c13d28e53d3bbad43',
              width: 0,
              height: 0,
            },
          },
          keyPhrases: [
            'La música',
            'la gastronomía y las festividades',
            'reflejan la diversidad y la creatividad',
            'equilibrio admirable',
            'resguardo de su patrimonio',
            'exploración de nuevos horizontes',
          ],
        },
        {
          content:
            'Finalmente, es imposible hablar del corazón de los Países Nórdicos sin mencionar su compromiso con la paz y la colaboración internacional. Estos países son conocidos por su diplomacia activa, su solidaridad internacional y su participación en esfuerzos de paz y desarrollo sostenible alrededor del mundo.',
          audioScript:
            'Finalmente, es imposible hablar del corazón de los Países Nórdicos sin mencionar su compromiso con la paz y la colaboración internacional. Estos países son conocidos por su diplomacia activa, su solidaridad internacional y su participación en esfuerzos de paz y desarrollo sostenible alrededor del mundo.',
          audioUrl:
            'https://sophieassets.blob.core.windows.net/speeches/46d2198c-3398-4e1f-a5b8-34662896e57e.mp3',
          titleAI: 'Nordic Commitment to Global Peace',
          videoData: {
            thumb: { url: '', width: 0, height: 0 },
            finalVideo: { url: '', width: 0, height: 0 },
          },
          imageData: {
            image: {},
            thumb: {},
            finalImage: {
              url: 'https://images.pexels.com/photos/17384863/pexels-photo-17384863.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
              width: '',
              height: '',
            },
            imagesIds: [],
            urlBing: '',
          },
          keyPhrases: [
            'compromiso con la paz y la colaboración internacional',
            'diplomacia activa',
            'solidaridad internacional',
            'participación en esfuerzos de paz y desarrollo sostenible',
          ],
        },
        {
          content:
            'Este enfoque hacia la paz y la cooperación no solo fortalece su posición en la comunidad internacional, sino que también refleja los valores intrínsecos de su sociedad.',
          audioScript:
            'Este enfoque hacia la paz y la cooperación no solo fortalece su posición en la comunidad internacional, sino que también refleja los valores intrínsecos de su sociedad.',
          audioUrl:
            'https://sophieassets.blob.core.windows.net/speeches/fea4fd40-6f5d-4321-afdf-463f2741d8b5.mp3',
          titleAI: '"Peace and Cooperation Values"',
          imageData: {
            image: {},
            thumb: {},
            finalImage: {},
            imagesIds: '',
            urlBing: '',
          },
          videoData: {
            thumb: { url: '', width: 0, height: 0 },
            finalVideo: {
              url: 'https://player.vimeo.com/progressive_redirect/playback/530640865/rendition/1080p/file.mp4?loc=external&oauth2_token_id=1747418641&signature=6525c219821c644004535ace321ce996eb741a849ba03f7fb84eeaf0501a6ecf',
              width: 0,
              height: 0,
            },
          },
          keyPhrases: [
            'Este enfoque hacia la paz y la cooperación',
            'fortalece su posición en la comunidad internacional',
            'refleja los valores intrínsecos de su sociedad',
          ],
        },
        {
          content:
            'En conclusión, descubrir el corazón de los Países Nórdicos es adentrarse en un mundo donde la naturaleza, la calidad de vida, la riqueza cultural y el compromiso con la paz y la sostenibilidad son ejes fundamentales que tejen la esencia de esta región. Esta exploración nos revela cómo la armonía entre el ser humano y su entorno puede crear sociedades prósperas, resilientes e inspiradoras.',
          audioScript:
            'En conclusión, descubrir el corazón de los Países Nórdicos es adentrarse en un mundo donde la naturaleza, la calidad de vida, la riqueza cultural y el compromiso con la paz y la sostenibilidad son ejes fundamentales que tejen la esencia de esta región. Esta exploración nos revela cómo la armonía entre el ser humano y su entorno puede crear sociedades prósperas, resilientes e inspiradoras.',
          audioUrl:
            'https://sophieassets.blob.core.windows.net/speeches/c51bbd67-1bb8-46d9-9c70-8fb70abe71d5.mp3',
          titleAI: 'Exploring Nordic Heartlands',
          videoData: {
            thumb: { url: '', width: 0, height: 0 },
            finalVideo: { url: '', width: 0, height: 0 },
          },
          imageData: {
            image: {},
            thumb: {},
            finalImage: {
              url: 'https://images.pexels.com/photos/2853632/pexels-photo-2853632.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
              width: '',
              height: '',
            },
            imagesIds: [],
            urlBing: '',
          },
          keyPhrases: [
            'descubrir el corazón de los Países Nórdicos',
            'la naturaleza',
            'la calidad de vida',
            'la riqueza cultural y el compromiso con la paz y la sostenibilidad',
            'tejen la esencia de esta región',
            'armonía entre el ser humano y su entorno',
            'sociedades prósperas',
            'resilientes e inspiradoras',
          ],
        },
      ],
    },
  },
  null,
  2
);

import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';


import { slideshowLessonWithExternalInfoSchema } from '@/utils/generateSlides/parse';

export default function Home() {

  const [slideshowJson] = useState(slideshowJsonExample);

  const navigate = useNavigate();

  const validationResult = (() => {
    try {
      const parsed = JSON.parse(slideshowJson) as unknown;
      const { data, problems } = slideshowLessonWithExternalInfoSchema(parsed);
      return { data, error: problems?.toString() };
    } catch (error) {
      return { error: 'Could not parse JSON' };
    }
  })();

  useEffect(() => {
    if (!validationResult?.data) return;
    navigate('/player', { state: validationResult.data });
  }, []);


  return (
    <main></main>
  )
}

const slideshowJsonExample = JSON.stringify(
  {
    courseCover:
      'https://images.pexels.com/photos/4558461/pexels-photo-4558461.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    sectionTitle: 'Bienvenidos al fascinante curso Los agujeros negros',
    type: 'Lección Engine',
    title: 'Presentation',
    elementCode: '67400928-3c9b-4730-8c60-a21a7f666b6c',
    elementLesson: {
      lessonTheme: '1',
      "paragraphs": [
        {
          "content": "Bienvenidos al fascinante curso Los agujeros negros, un emocionante viaje que nos invita a adentrarnos en el misterio insondable del cosmos. Este curso busca introducir a los estudiantes en uno de los fenómenos más enigmáticos y sorprendentes del universo: los agujeros negros.",
          "audioScript": "Bienvenidos al fascinante curso Los agujeros negros, un emocionante viaje que nos invita a adentrarnos en el misterio insondable del cosmos. Este curso busca introducir a los estudiantes en uno de los fenómenos más enigmáticos y sorprendentes del universo: los agujeros negros.",
          "imageData": {
            "finalImage": {
              "url": "https://sophieassets.blob.core.windows.net/dalle/feec6718-96e8-4617-a0ba-b11cc2cfd771.jpeg",
              "width": 1024,
              "height": 1024
            }
          },
          "videoData": {
            "thumb": {
              "url": "",
              "width": 0,
              "height": 0
            },
            "finalVideo": {
              "url": "",
              "width": 0,
              "height": 0
            }
          },
          "titleAI": "Exploring the Mysteries of Black Holes",
          "translatedTitleAI": "Explorando los misterios de los agujeros negros",
          "audioUrl": "https://sophieassets.blob.core.windows.net/speeches/331d5a39-85cc-4926-839c-16920d56275d.mp3",
          "srt": []
        },
        {
          "content": "A lo largo de este recorrido, exploraremos su naturaleza, orígenes, características y el impacto que ejercen en nuestro entendimiento del universo.",
          "audioScript": "A lo largo de este recorrido, exploraremos su naturaleza, orígenes, características y el impacto que ejercen en nuestro entendimiento del universo.",
          "imageData": {
            "image": {},
            "thumb": {},
            "finalImage": {},
            "imagesIds": "",
            "urlBing": ""
          },
          "videoData": {
            "thumb": {
              "url": "https://images.pexels.com/videos/28210569/pictures/preview-0.jpg",
              "width": -1,
              "height": -1
            },
            "finalVideo": {
              "url": "https://videos.pexels.com/video-files/28210569/12328323_1920_1080_30fps.mp4",
              "width": -1,
              "height": -1
            }
          },
          "titleAI": "Exploring Black Holes",
          "translatedTitleAI": "Explorando Agujeros Negros",
          "audioUrl": "https://sophieassets.blob.core.windows.net/speeches/5f2873f2-0ec4-418b-8990-75a8eb9f9a89.mp3",
          "srt": []
        },
        {
          "content": "Comenzaremos nuestro viaje con una introducción a los agujeros negros, donde desentrañaremos por qué estas entidades han capturado la imaginación tanto de científicos como del público en general. En esta primera etapa, ofreceremos una visión general de qué son los agujeros negros y por qué representan uno de los elementos más intrigantes del estudio cosmológico.",
          "audioScript": "Comenzaremos nuestro viaje con una introducción a los agujeros negros, donde desentrañaremos por qué estas entidades han capturado la imaginación tanto de científicos como del público en general. En esta primera etapa, ofreceremos una visión general de qué son los agujeros negros y por qué representan uno de los elementos más intrigantes del estudio cosmológico.",
          "imageData": {
            "finalImage": {
              "url": "https://sophieassets.blob.core.windows.net/dalle/103f8d86-f377-4231-8682-463146d12544.jpeg",
              "width": 1024,
              "height": 1024
            }
          },
          "videoData": {
            "thumb": {
              "url": "",
              "width": 0,
              "height": 0
            },
            "finalVideo": {
              "url": "",
              "width": 0,
              "height": 0
            }
          },
          "titleAI": "Introduction to Black Holes",
          "translatedTitleAI": "Introducción a los agujeros negros",
          "audioUrl": "https://sophieassets.blob.core.windows.net/speeches/5c74bb08-6c0b-443f-928e-d7563098225d.mp3",
          "srt": []
        },
        {
          "content": "Avanzando en nuestra exploración, nos sumergiremos en los orígenes y la evolución histórica de la teoría de los agujeros negros. Analizaremos cómo ha evolucionado el concepto a lo largo del tiempo, desde las ideas iniciales hasta convertirse en un pilar fundamental de la física moderna.",
          "audioScript": "Avanzando en nuestra exploración, nos sumergiremos en los orígenes y la evolución histórica de la teoría de los agujeros negros. Analizaremos cómo ha evolucionado el concepto a lo largo del tiempo, desde las ideas iniciales hasta convertirse en un pilar fundamental de la física moderna.",
          "imageData": {
            "finalImage": {
              "url": "https://sophieassets.blob.core.windows.net/dalle/f8d40a03-f688-4769-afef-27586cc053e9.jpeg",
              "width": 1024,
              "height": 1024
            }
          },
          "videoData": {
            "thumb": {
              "url": "",
              "width": 0,
              "height": 0
            },
            "finalVideo": {
              "url": "",
              "width": 0,
              "height": 0
            }
          },
          "titleAI": "Origins of Black Hole Theory",
          "translatedTitleAI": "Orígenes de la teoría de agujeros negros",
          "audioUrl": "https://sophieassets.blob.core.windows.net/speeches/d9705b98-b863-4779-aa10-624ddab4979c.mp3",
          "srt": []
        },
        {
          "content": "A continuación, expondremos la física detrás del horizonte de eventos, llevando a los estudiantes a comprender los conceptos fundamentales que explican cómo funcionan los agujeros negros y por qué son un punto de interés dentro de la astrofísica.",
          "audioScript": "A continuación, expondremos la física detrás del horizonte de eventos, llevando a los estudiantes a comprender los conceptos fundamentales que explican cómo funcionan los agujeros negros y por qué son un punto de interés dentro de la astrofísica.",
          "imageData": {
            "finalImage": {
              "url": "https://sophieassets.blob.core.windows.net/dalle/0285ddef-d307-4de1-8a98-eb6f04438707.jpeg",
              "width": 1024,
              "height": 1024
            }
          },
          "videoData": {
            "thumb": {
              "url": "",
              "width": 0,
              "height": 0
            },
            "finalVideo": {
              "url": "",
              "width": 0,
              "height": 0
            }
          },
          "titleAI": "Understanding Black Hole Physics",
          "translatedTitleAI": "Comprendiendo la física de los agujeros negros",
          "audioUrl": "https://sophieassets.blob.core.windows.net/speeches/4ad50615-81f3-47bc-9119-8b4c4426203f.mp3",
          "srt": []
        },
        {
          "content": "La siguiente sección del curso se centrará en la estructura y clasificación de los agujeros negros. Desde los agujeros negros de Schwarzschild hasta los de Kerr, examinaremos las diversas categorías y características que definen a estas singulares formaciones cósmicas.",
          "audioScript": "La siguiente sección del curso se centrará en la estructura y clasificación de los agujeros negros. Desde los agujeros negros de Schwarzschild hasta los de Kerr, examinaremos las diversas categorías y características que definen a estas singulares formaciones cósmicas.",
          "imageData": {
            "finalImage": {
              "url": "https://sophieassets.blob.core.windows.net/dalle/a4d341d0-894f-4631-8d40-6966793a460f.jpeg",
              "width": 1024,
              "height": 1792
            }
          },
          "videoData": {
            "thumb": {
              "url": "",
              "width": 0,
              "height": 0
            },
            "finalVideo": {
              "url": "",
              "width": 0,
              "height": 0
            }
          },
          "titleAI": "Classification of Black Holes",
          "translatedTitleAI": "Clasificación de los agujeros negros",
          "audioUrl": "https://sophieassets.blob.core.windows.net/speeches/4060e3f2-ad22-432d-892f-3801aaece6af.mp3",
          "srt": []
        },
        {
          "content": "En la parte de métodos de detección y evidencia observacional, exploraremos cómo los científicos han sido capaces de identificar y estudiar agujeros negros a través de innovadoras tecnologías y técnicas. Este tema nos permitirá entender la complejidad de investigar un fenómeno que, por definición, es invisible.",
          "audioScript": "En la parte de métodos de detección y evidencia observacional, exploraremos cómo los científicos han sido capaces de identificar y estudiar agujeros negros a través de innovadoras tecnologías y técnicas. Este tema nos permitirá entender la complejidad de investigar un fenómeno que, por definición, es invisible.",
          "imageData": {
            "finalImage": {
              "url": "https://sophieassets.blob.core.windows.net/dalle/0299e508-d5e2-4337-8b6d-40dddaa451a3.jpeg",
              "width": 1024,
              "height": 1024
            }
          },
          "videoData": {
            "thumb": {
              "url": "",
              "width": 0,
              "height": 0
            },
            "finalVideo": {
              "url": "",
              "width": 0,
              "height": 0
            }
          },
          "titleAI": "Detecting Black Holes Methodologies",
          "translatedTitleAI": "Métodos de Detección de Agujeros Negros",
          "audioUrl": "https://sophieassets.blob.core.windows.net/speeches/bed42743-be6b-46a5-a490-80179a8b11b8.mp3",
          "srt": []
        },
        {
          "content": "Finalmente, nos enfocaremos en el impacto de los agujeros negros en la estructura y evolución del universo. Aquí consideraremos su papel en la formación de galaxias, su influencia gravitacional y la manera en que continúan desafiando nuestras expectativas y teorías sobre la cosmología.",
          "audioScript": "Finalmente, nos enfocaremos en el impacto de los agujeros negros en la estructura y evolución del universo. Aquí consideraremos su papel en la formación de galaxias, su influencia gravitacional y la manera en que continúan desafiando nuestras expectativas y teorías sobre la cosmología.",
          "imageData": {
            "finalImage": {
              "url": "https://sophieassets.blob.core.windows.net/dalle/1aecded4-231d-40fb-9a52-fe0a8b044eba.jpeg",
              "width": 1024,
              "height": 1792
            }
          },
          "videoData": {
            "thumb": {
              "url": "",
              "width": 0,
              "height": 0
            },
            "finalVideo": {
              "url": "",
              "width": 0,
              "height": 0
            }
          },
          "titleAI": "Black Holes and Universe Evolution",
          "translatedTitleAI": "Agujeros Negros y Evolución del Universo",
          "audioUrl": "https://sophieassets.blob.core.windows.net/speeches/d02379c3-c73a-4400-8aaf-8160026c96c5.mp3",
          "srt": []
        },
        {
          "content": "Concluiremos nuestro curso examinando cómo el estudio de los agujeros negros está moldeando el futuro de la cosmología, sugiriendo nuevas direcciones de investigación y expandiendo nuestra comprensión del universo en su totalidad. Acompáñenos en este viaje cósmico y adentrémonos juntos en el fascinante mundo de los agujeros negros.",
          "audioScript": "Concluiremos nuestro curso examinando cómo el estudio de los agujeros negros está moldeando el futuro de la cosmología, sugiriendo nuevas direcciones de investigación y expandiendo nuestra comprensión del universo en su totalidad. Acompáñenos en este viaje cósmico y adentrémonos juntos en el fascinante mundo de los agujeros negros.",
          "imageData": {
            "finalImage": {
              "url": "https://sophieassets.blob.core.windows.net/dalle/e330e959-9fd7-4747-b183-494a3a5571fa.jpeg",
              "width": 1792,
              "height": 1024
            }
          },
          "videoData": {
            "thumb": {
              "url": "",
              "width": 0,
              "height": 0
            },
            "finalVideo": {
              "url": "",
              "width": 0,
              "height": 0
            }
          },
          "titleAI": "The Future of Cosmology",
          "translatedTitleAI": "El futuro de la cosmología",
          "audioUrl": "https://sophieassets.blob.core.windows.net/speeches/d3c59d3d-37c7-45a2-adc9-0911f936ef48.mp3",
          "srt": []
        }
      ],
    },
  },
  null,
  2
);

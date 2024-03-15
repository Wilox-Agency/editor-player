import gsap from 'gsap';

export function randomIntFromInterval(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function randomFloatFromInterval(
  min: number,
  max: number,
  maxDecimalPlaces = 20
) {
  return parseFloat(
    (Math.random() * (max - min) + min).toFixed(maxDecimalPlaces)
  );
}

export function getLoremPicsum() {
  const seed = crypto.randomUUID();

  const greaterOrSmallerAspectRatio = gsap.utils.random([
    'smallerAspectRatio',
    'greaterAspectRatio',
  ] as const);

  let width;
  let height;
  if (greaterOrSmallerAspectRatio === 'smallerAspectRatio') {
    width = 1920;
    height = randomIntFromInterval(324, 648 - 1);
  } else {
    height = 1080;
    width = randomIntFromInterval(576, 1_152 - 1);
  }

  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

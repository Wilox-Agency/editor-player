export function assertType<
  TType extends string,
  TElement extends { attributes: { type: string } }
>(
  element: TElement,
  type: TType
): asserts element is Extract<TElement, { attributes: { type: TType } }> {
  if (element.attributes.type !== type) {
    throw new Error(`Provided element is not of type '${type}'`);
  }
}

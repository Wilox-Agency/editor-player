import { useEffect, useRef } from 'react';
import type Konva from 'konva';
import { Transformer } from 'react-konva';

import { useTransformerSelectionStore } from '@/hooks/useTransformerSelectionStore';

export function BordersOfNodesThatAreOrWillBeSelected() {
  const { selection, nodesInsideSelectionRect } =
    useTransformerSelectionStore();

  // Only include the selected nodes if there's node than one node selected
  const nodes = new Set(
    Array.isArray(selection)
      ? selection.concat(nodesInsideSelectionRect)
      : nodesInsideSelectionRect
  );

  const borderTransformers: JSX.Element[] = [];
  nodes.forEach((node) => {
    borderTransformers.push(<BorderTransformer key={node.id()} node={node} />);
  });

  return borderTransformers;
}

function BorderTransformer({ node }: { node: Konva.Node }) {
  const borderTransformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    borderTransformerRef.current?.nodes([node]);
  }, [node]);

  return (
    <Transformer
      resizeEnabled={false}
      rotateEnabled={false}
      keepRatio={false}
      ref={borderTransformerRef}
    />
  );
}

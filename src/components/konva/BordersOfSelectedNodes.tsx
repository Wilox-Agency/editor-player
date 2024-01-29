import { useEffect, useRef } from 'react';
import type Konva from 'konva';
import { Transformer } from 'react-konva';

import {
  selectionToNodeArray,
  useTransformerSelectionStore,
} from '@/hooks/useTransformerSelectionStore';

export function BordersOfSelectedNodes() {
  const { selection, nodesInsideSelectionRect } =
    useTransformerSelectionStore();

  const nodes = new Set(
    selectionToNodeArray(selection).concat(nodesInsideSelectionRect)
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

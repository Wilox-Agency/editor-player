import { type RefObject } from 'react';
import Konva from 'konva';

import { useTransformerSelectionStore } from '@/hooks/useTransformerSelectionStore';
import { StageVirtualSize } from '@/utils/konva';
import { convertScale } from '@/utils/konva/scale';

type LinePosition = 'start' | 'center' | 'end';

type Axis = 'horizontal' | 'vertical';

type SnapGuideLine = {
  coordinate: number;
  axis: Axis;
  linePosition: LinePosition;
};

export function useNodeSnapping({
  shapesLayerRef,
  snapGuideLinesLayerRef,
  transformerRef,
}: {
  shapesLayerRef: RefObject<Konva.Layer>;
  snapGuideLinesLayerRef: RefObject<Konva.Layer>;
  transformerRef: RefObject<Konva.Transformer>;
}) {
  function handleDragMove(event: Konva.KonvaEventObject<DragEvent>) {
    const shapesLayer = shapesLayerRef.current;
    const snapGuideLinesLayer = snapGuideLinesLayerRef.current;
    if (!shapesLayer || !snapGuideLinesLayer) return;

    const isTargetInShapesLayer = event.target.getLayer() === shapesLayer;
    if (!isTargetInShapesLayer || !(event.target instanceof Konva.Shape)) {
      return;
    }

    const multipleNodesAreSelected = getSelectedNodes().length > 1;
    const transformer = transformerRef.current;
    if (multipleNodesAreSelected && !transformer) return;

    const referenceNode = multipleNodesAreSelected
      ? transformer!
      : event.target;

    const possibleSnapGuideLines = getPossibleSnapGuideLines(referenceNode, {
      shapesLayer,
    });
    const nodeSnappingLines = getNodeSnappingLines(referenceNode);
    const activeSnapGuideLines = getActiveSnapGuideLines(
      nodeSnappingLines,
      possibleSnapGuideLines
    );
    drawSnapGuideLines(activeSnapGuideLines, { snapGuideLinesLayer });
    snapNodeToSnapGuideLines(referenceNode, activeSnapGuideLines);
  }

  function handleDragEnd() {
    // Clear the snap guide lines when the user finishes dragging
    snapGuideLinesLayerRef.current?.destroyChildren();
  }

  return {
    handleDragMove,
    handleDragEnd,
  };
}

// Gets where the node can snap to
function getPossibleSnapGuideLines(
  node: Konva.Shape | Konva.Transformer,
  { shapesLayer }: { shapesLayer: Konva.Layer }
) {
  // It should always be able to snap to the stage borders and stage center
  const horizontalSnapGuideLines = [
    0,
    StageVirtualSize.height / 2,
    StageVirtualSize.height,
  ];
  const verticalSnapGuideLines = [
    0,
    StageVirtualSize.width / 2,
    StageVirtualSize.width,
  ];

  const guideNodes = shapesLayer.getChildren((guideNode) => {
    const isReferenceNode = node === guideNode;

    /* When the reference node is a transformer (when dragging multiple nodes),
    the selected nodes should not be used as guides */
    if (node instanceof Konva.Transformer) {
      const isInsideTransformer = getSelectedNodes().includes(guideNode);
      return !isReferenceNode && !isInsideTransformer;
    }

    return !isReferenceNode;
  });
  // It should be able to snap to the edges and center of each node in the layer
  for (const guideNode of guideNodes) {
    // Ignore the node that's being dragged
    if (node === guideNode) continue;

    const guideNodeBox = { ...guideNode.position(), ...guideNode.size() };
    horizontalSnapGuideLines.push(
      guideNodeBox.y, // Top
      guideNodeBox.y + guideNodeBox.height / 2, // Horizontal center
      guideNodeBox.y + guideNodeBox.height // Bottom
    );
    verticalSnapGuideLines.push(
      guideNodeBox.x, // Left
      guideNodeBox.x + guideNodeBox.width / 2, // Vertical center
      guideNodeBox.x + guideNodeBox.width // Right
    );
  }

  return {
    horizontal: horizontalSnapGuideLines,
    vertical: verticalSnapGuideLines,
  };
}

// Gets the lines of the node that can snap to the guide lines
function getNodeSnappingLines(node: Konva.Shape | Konva.Transformer) {
  const nodeBox =
    node instanceof Konva.Shape
      ? { ...node.position(), ...node.size() }
      : convertScale(
          { ...node.position(), ...node.size() },
          { to: 'unscaled' }
        );

  return {
    horizontal: [
      {
        coordinate: nodeBox.y,
        linePosition: 'start',
      },
      {
        coordinate: nodeBox.y + nodeBox.height / 2,
        linePosition: 'center',
      },
      {
        coordinate: nodeBox.y + nodeBox.height,
        linePosition: 'end',
      },
    ],
    vertical: [
      {
        coordinate: nodeBox.x,
        linePosition: 'start',
      },
      {
        coordinate: nodeBox.x + nodeBox.width / 2,
        linePosition: 'center',
      },
      {
        coordinate: nodeBox.x + nodeBox.width,
        linePosition: 'end',
      },
    ],
  } as const;
}

// TODO: Think of a better name
function getActiveSnapGuideLines(
  nodeSnappingLines: ReturnType<typeof getNodeSnappingLines>,
  possibleSnapGuideLines: ReturnType<typeof getPossibleSnapGuideLines>
) {
  const GUIDE_LINE_OFFSET = 5;

  /** Each axis should always have one snap guide line except when there's
   * multiple snap guide lines with 0 distance */
  const closestSnapGuideLines: {
    horizontal: (SnapGuideLine & { distanceFromNode: number })[];
    vertical: (SnapGuideLine & { distanceFromNode: number })[];
  } = { horizontal: [], vertical: [] };

  const axes = ['horizontal', 'vertical'] as const;

  for (const axis of axes) {
    for (const possibleSnapGuideLine of possibleSnapGuideLines[axis]) {
      for (const nodeSnappingLine of nodeSnappingLines[axis]) {
        const distance = Math.abs(
          possibleSnapGuideLine - nodeSnappingLine.coordinate
        );
        /* If the distance of the possible snap guide line if greater than the
        guide line offset, ignore it */
        if (distance > GUIDE_LINE_OFFSET) continue;

        const snapGuideLine = {
          coordinate: possibleSnapGuideLine,
          axis,
          linePosition: nodeSnappingLine.linePosition,
          distanceFromNode: distance,
        };
        const currentClosestSnapGuideLines = closestSnapGuideLines[axis];

        /* When there's no line to compare to, set it as the current closest
        snap guide line */
        if (currentClosestSnapGuideLines.length === 0) {
          closestSnapGuideLines[axis] = [snapGuideLine];
          continue;
        }

        /* When there's only one line to compare to, compare to that line and,
        if the current possible line is closer to the node than the current
        closest line, replace it */
        if (currentClosestSnapGuideLines.length === 1) {
          const currentClosestLine = currentClosestSnapGuideLines[0]!;
          if (distance < currentClosestLine.distanceFromNode) {
            closestSnapGuideLines[axis] = [snapGuideLine];
            continue;
          }
        }

        /* The array of closest snap guide lines on any axis will only have more
        than one line when all of them have zero distance from the node */
        const currentSnapGuideLinesHaveZeroDistance =
          currentClosestSnapGuideLines.some((currentClosestLine) => {
            return currentClosestLine.distanceFromNode === 0;
          });

        if (distance === 0 && currentSnapGuideLinesHaveZeroDistance) {
          currentClosestSnapGuideLines.push(snapGuideLine);
        }
      }
    }
  }

  const activeSnapGuideLines = [
    ...closestSnapGuideLines.horizontal,
    ...closestSnapGuideLines.vertical,
  ];

  return activeSnapGuideLines;
}

function drawSnapGuideLines(
  snapGuideLines: SnapGuideLine[],
  { snapGuideLinesLayer }: { snapGuideLinesLayer: Konva.Layer }
) {
  // Clear all the old snap guide lines before drawing the current ones
  snapGuideLinesLayer.destroyChildren();

  for (const snapGuideLine of snapGuideLines) {
    const linePoints =
      snapGuideLine.axis === 'horizontal'
        ? [
            0, // x1
            snapGuideLine.coordinate, // y1
            StageVirtualSize.width, // x2
            snapGuideLine.coordinate, // y2
          ]
        : [
            snapGuideLine.coordinate, // x1
            0, // y1
            snapGuideLine.coordinate, // x2
            StageVirtualSize.height, // y2
          ];
    const line = new Konva.Line({
      points: linePoints,
      stroke: 'rgb(14 165 233)',
      strokeWidth: 1,
      dash: [4 /* Size */, 6 /* Gap */],
    });
    snapGuideLinesLayer.add(line);
  }
}

function snapNodeToSnapGuideLines(
  node: Konva.Shape | Konva.Transformer,
  snapGuideLines: SnapGuideLine[]
) {
  for (const snapGuideLine of snapGuideLines) {
    /* The snap guide line axis is always opposite to the coordinate the guide
    line refers to */
    const coordinateToMove = snapGuideLine.axis === 'horizontal' ? 'y' : 'x';
    const dimensionEquivalentToCoordinate =
      coordinateToMove === 'x' ? 'width' : 'height';
    const nodeBox =
      node instanceof Konva.Shape
        ? { ...node.position(), ...node.size() }
        : convertScale(
            { ...node.position(), ...node.size() },
            { to: 'unscaled' }
          );

    const positionInAxisToMoveTo =
      snapGuideLine.linePosition === 'start'
        ? snapGuideLine.coordinate
        : snapGuideLine.linePosition === 'center'
        ? snapGuideLine.coordinate -
          nodeBox[dimensionEquivalentToCoordinate] / 2
        : snapGuideLine.coordinate - nodeBox[dimensionEquivalentToCoordinate];

    // Snap node to the position
    if (node instanceof Konva.Shape) {
      node[coordinateToMove](positionInAxisToMoveTo);
      continue;
    }

    // Get the distance that each selected node has to move
    const movementInAxis = positionInAxisToMoveTo - nodeBox[coordinateToMove];

    // Snap nodes to the position
    getSelectedNodes().forEach((selectedNode) => {
      const currentCoordinatePosition = selectedNode[coordinateToMove]();
      selectedNode[coordinateToMove](
        currentCoordinatePosition + movementInAxis
      );
    });
  }
}

function getSelectedNodes() {
  return useTransformerSelectionStore.getState().getSelectedNodes();
}

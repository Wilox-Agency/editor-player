import {
  type CSSProperties,
  forwardRef,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import Konva from 'konva';
import { Text as KonvaText } from 'react-konva';
import { Html } from 'react-konva-utils';

import styles from './Text.module.css';

import { useTransformerSelectionStore } from '@/hooks/useTransformerSelectionStore';
import { useNodeBeingEditedStore } from '@/hooks/useNodeBeingEditedStore';
import { useKonvaRefsStore } from '@/hooks/useKonvaRefsStore';
import { TextSizes } from '@/utils/validation';
import { MouseButton } from '@/utils/input';
import { mergeRefs } from '@/utils/mergeRefs';
import type {
  CanvasElementOfTypeWithActions,
  RemoveIndex,
} from '@/utils/types';

export type TextProps = Pick<
  RemoveIndex<Konva.TextConfig>,
  | 'id'
  | 'text'
  | 'x'
  | 'y'
  | 'width'
  | 'fill'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'fontStyle'
  | 'textDecoration'
  | 'align'
  | 'rotation'
  | 'draggable'
> & {
  saveAttrs: CanvasElementOfTypeWithActions<'text'>['saveAttrs'];
  remove: () => void;
};

export const Text = forwardRef<Konva.Text, TextProps>(
  ({ id, saveAttrs, ...initialAttributes }, forwardedRef) => {
    const { stageRef, transformerRef } = useKonvaRefsStore();
    const textRef = useRef<Konva.Text>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const didJustCloseTextAreaWithEnterRef = useRef(false);

    const getSelectedNodes = useTransformerSelectionStore(
      (state) => state.getSelectedNodes
    );
    const isTextBeingEdited = useNodeBeingEditedStore(
      (state) => state.textBeingEdited?.id() === id
    );
    const setNodeBeingEdited = useNodeBeingEditedStore(
      (state) => state.setNodeBeingEdited
    );

    const [textAreaValue, setTextAreaValue] = useState('');
    const [textAreaStyles, setTextAreaStyles] = useState<CSSProperties>();

    function handleDoubleClick(
      event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
    ) {
      // Only accept clicks from the left mouse button
      if (
        event.evt instanceof MouseEvent &&
        event.evt.button !== MouseButton.left
      ) {
        return;
      }

      openTextArea();
    }

    function handleTransform(event: Konva.KonvaEventObject<Event>) {
      const text = event.target as Konva.Text;

      const activeAnchor = transformerRef.current?.getActiveAnchor();
      // The middle anchors are only for resizing the width
      const isResizingOnlyWidth =
        activeAnchor && activeAnchor.startsWith('middle');
      // Updating the width according to the scale, while also resetting the scale
      if (isResizingOnlyWidth) {
        text.setAttrs({
          width: Math.max(text.width() * text.scaleX(), text.fontSize()),
          scaleX: 1,
          scaleY: 1,
        } satisfies Konva.TextConfig);
      }
    }

    function handleTransformEnd(event: Konva.KonvaEventObject<Event>) {
      const text = event.target as Konva.Text;

      const newFontSize = Math.max(
        text.fontSize() * text.scaleY(),
        TextSizes.minFontSize
      );
      /* Updating the font size and the width according to the scale, while also
      resetting the scale */
      text.setAttrs({
        width: Math.max(text.width() * text.scaleX(), newFontSize),
        fontSize: newFontSize,
        scaleX: 1,
        scaleY: 1,
      });
      // Saving the new position, width, rotation and font size
      saveAttrs({
        x: text.x(),
        y: text.y(),
        width: text.width(),
        rotation: text.rotation(),
        fontSize: text.fontSize(),
      } satisfies Konva.TextConfig);
    }

    function handleTextAreaChange(
      event: React.ChangeEvent<HTMLTextAreaElement>
    ) {
      const newTextAreaValue = event.target.value;

      setTextAreaValue(newTextAreaValue);
      // Updating the height to fit the text
      setTextAreaStyles((currentValue) => {
        return { ...currentValue, height: event.target.scrollHeight };
      });

      const text = textRef.current!;

      /* When the text node width was unchanged when adding/removing text, the
      width automatically adapts to fit the text, to prevent this, the text node
      width is set to the width it had before updating the text */
      const widthBeforeUdpate = text.width();
      text.text(newTextAreaValue);
      text.width(widthBeforeUdpate);
    }

    function handleTextAreaKeyDown(event: React.KeyboardEvent) {
      /* When pressing Enter without the shift key pressed, or when pressing
      Escape, close the text area */
      if (
        (event.key === 'Enter' && !event.shiftKey) ||
        event.key === 'Escape'
      ) {
        closeTextArea();

        /* Focus the canvas container so the user can interact with the canvas
        elements with the keyboard */
        const canvasContainer = stageRef.current?.container();
        canvasContainer?.focus();

        if (event.key === 'Enter') {
          didJustCloseTextAreaWithEnterRef.current = true;
        }
      }
    }

    function handleDragEnd(event: Konva.KonvaEventObject<DragEvent>) {
      // Saving the new position
      saveAttrs({ x: event.target.x(), y: event.target.y() });
    }

    const openTextArea = useCallback(() => {
      const text = textRef.current!;
      const stageBox = stageRef.current!.container().getBoundingClientRect();
      const textPosition = text.getAbsolutePosition();

      // Hiding the text node
      text.visible(false);

      let textHeight = text.height();

      if (text.textDecoration().includes('underline')) {
        // Text decoration thickness
        textHeight += text.fontSize() * 0.07;
      }

      const textAreaStyles: CSSProperties = {
        color: text.fill(),
        fontFamily: text.fontFamily(),
        fontSize: text.fontSize(),
        lineHeight: text.lineHeight(),
        letterSpacing: text.letterSpacing(),
        fontWeight: text.fontStyle().includes('bold') ? 'bold' : undefined,
        fontStyle: text.fontStyle().includes('italic') ? 'italic' : undefined,
        textDecorationLine: text.textDecoration(),
        textAlign: text.align() as 'left' | 'center' | 'right',
        top: stageBox.top + textPosition.y,
        left: stageBox.left + textPosition.x,
        width: text.width(),
        height: textHeight,
        transformOrigin: 'left top',
        transform: `rotate(${text.rotation()}deg)`,
      };

      /* Setting a negative Y translation to position the text of the text area
      closer to the text of the text node. Note that this is not perfect and
      varies a lot depending on font size and browser */
      const userAgent = navigator.userAgent.toLowerCase();
      const isSafari =
        userAgent.includes('safari') && !userAgent.includes('chrome');
      const isFirefox = userAgent.includes('firefox');
      textAreaStyles.transform += `translateY(-${
        isSafari
          ? 0
          : isFirefox
          ? Math.round(text.fontSize() / 24)
          : Math.round(text.fontSize() / 20)
      }px)`;

      // Setting the value and styles of the textarea
      setTextAreaValue(text.text());
      setTextAreaStyles(textAreaStyles);
      // Setting the node as the one being edited
      setNodeBeingEdited({ textBeingEdited: text });
    }, [setNodeBeingEdited, stageRef]);

    const closeTextArea = useCallback(() => {
      const text = textRef.current;
      if (!text) return;

      /* TODO: Remove the text node if the text is empty (after trimmed). This
      will need a state that controls all the nodes of the main layer */

      // Updating the text node
      text.visible(true);
      // Hiding the textarea
      setTextAreaStyles(undefined);
      // Saving the new text and width
      saveAttrs({ text: text.text(), width: text.width() });
      // Clearing the node being edited
      setNodeBeingEdited({ textBeingEdited: undefined });
    }, [saveAttrs, setNodeBeingEdited]);

    // Set the initial attributes only on the first render
    useEffect(() => {
      textRef.current?.setAttrs(initialAttributes satisfies Konva.TextConfig);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Set event listener for opening the textarea when pressing Enter with the
    current text node as the only selected node */
    useEffect(() => {
      if (isTextBeingEdited) return;

      const canvasContainer = stageRef.current?.container();
      if (!canvasContainer) return;

      /* Open the textarea when pressing Enter with the current text node as the
      only selected node */
      function handleTextKeyDown(event: KeyboardEvent) {
        if (event.key !== 'Enter') return;

        /* The keydown listener of the canvas container runs after the
        textarea's keydown listener, so when the user presses Enter, the
        textarea closes (by its event listener) and then opens again (by the
        event listener of the canvas container) */
        if (didJustCloseTextAreaWithEnterRef.current) {
          didJustCloseTextAreaWithEnterRef.current = false;
          return;
        }

        const isCurrentTextSelected =
          getSelectedNodes().length === 1 &&
          getSelectedNodes()[0] === textRef.current;
        if (isCurrentTextSelected) {
          /* When opening the textarea with a keydown, (most of the time) the
          same event is also catched by the textarea. Preventing the default
          behavior also prevents the key from being added to the textarea */
          event.preventDefault();
          openTextArea();
        }
      }

      canvasContainer.addEventListener('keydown', handleTextKeyDown);
      return () => {
        canvasContainer.removeEventListener('keydown', handleTextKeyDown);
      };
    }, [getSelectedNodes, isTextBeingEdited, openTextArea, stageRef]);

    // Set event listener for closing the textarea when clicking outisde
    useEffect(() => {
      if (!isTextBeingEdited || !textAreaRef.current) return;

      // Focusing the textarea when opening it
      textAreaRef.current.focus();
      // Placing the cursor at the end of the textarea
      textAreaRef.current.setSelectionRange(
        textAreaRef.current.value.length,
        textAreaRef.current.value.length
      );

      // Close the textarea when clicking outisde
      function handleMouseDownOutside(event: MouseEvent | TouchEvent) {
        const isMouseDownOutside = !(event.target as HTMLElement).contains(
          textAreaRef.current
        );
        if (isMouseDownOutside) closeTextArea();
      }

      window.addEventListener('mousedown', handleMouseDownOutside);
      window.addEventListener('touchstart', handleMouseDownOutside);
      return () => {
        window.removeEventListener('mousedown', handleMouseDownOutside);
        window.removeEventListener('touchstart', handleMouseDownOutside);
      };
    }, [closeTextArea, isTextBeingEdited]);

    /* Clear text being edited state if this is the text being edited and it
    gets deleted */
    useEffect(() => {
      return () => {
        const { textBeingEdited, setNodeBeingEdited } =
          useNodeBeingEditedStore.getState();
        const isTextBeingEdited = textBeingEdited?.id() === id;

        /* When the text gets deleted (i.e. the component unmounts) and it's
        being edited, clear the text being edited state */
        if (isTextBeingEdited) {
          setNodeBeingEdited({ textBeingEdited: undefined });
        }
      };
      /* The effect should be executed only once and none of its dependecies
      should change */
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <>
        <KonvaText
          id={id}
          onDblClick={handleDoubleClick}
          onDblTap={handleDoubleClick}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
          onDragEnd={handleDragEnd}
          ref={mergeRefs(textRef, forwardedRef)}
        />
        {isTextBeingEdited && (
          <Html divProps={{ style: { zIndex: 'unset' } }}>
            <textarea
              style={textAreaStyles}
              className={styles.textArea}
              value={textAreaValue}
              onChange={handleTextAreaChange}
              onKeyDown={handleTextAreaKeyDown}
              ref={textAreaRef}
            />
          </Html>
        )}
      </>
    );
  }
);

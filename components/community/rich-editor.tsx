"use dom";

import {
  createContext,
  type Ref,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  type DOMImperativeFactory,
  type DOMProps,
  useDOMImperativeHandle,
} from "expo/dom";
import { Node } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import {
  EditorContent,
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import type { RichNode } from "@/domain/community/types";
import "./rich-editor.css";

export interface CommunityEditorHandle extends DOMImperativeFactory {
  snapshot: () => void;
}
type ImageState = { url?: string; status?: string };
const Images = createContext<Record<string, ImageState>>({});
function ImageView(
  { node, editor, getPos, deleteNode, selected }: NodeViewProps,
) {
  const images = useContext(Images);
  const item = images[String(node.attrs.attachmentId)];
  function move(direction: -1 | 1) {
    const pos = getPos();
    if (pos === undefined) return;
    const $pos = editor.state.doc.resolve(pos);
    const sibling = direction < 0
      ? $pos.nodeBefore
      : editor.state.doc.nodeAt(pos + node.nodeSize);
    if (!sibling) return;
    const destination = direction < 0
      ? pos - sibling.nodeSize
      : pos + sibling.nodeSize;
    editor.view.dispatch(
      editor.state.tr.delete(pos, pos + node.nodeSize).insert(
        destination,
        node,
      ),
    );
    editor.commands.focus();
  }
  return (
    <NodeViewWrapper
      as="figure"
      className={`community-image ${selected ? "is-selected" : ""}`}
    >
      {item?.url
        ? (
          <img
            src={item.url}
            alt={String(node.attrs.alt ?? "첨부 이미지")}
            draggable={false}
          />
        )
        : (
          <div className="image-placeholder">
            {item?.status ?? "이미지를 불러오는 중입니다."}
          </div>
        )}
      {editor.isEditable
        ? (
          <div className="image-actions" contentEditable={false}>
            <span data-drag-handle>⠿ 이동</span>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="이미지 위로 이동"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="이미지 아래로 이동"
            >
              ↓
            </button>
            <button type="button" onClick={deleteNode}>이미지 삭제</button>
          </div>
        )
        : null}
    </NodeViewWrapper>
  );
}
const CommunityImage = Node.create({
  name: "communityImage",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({
    attachmentId: { default: null },
    alt: { default: "" },
  }),
  // External HTML cannot introduce storage IDs. Images are added only through the picker.
  parseHTML: () => [],
  renderHTML: (
    { node },
  ) => ["figure", { "data-attachment-id": node.attrs.attachmentId }, [
    "span",
    {},
    String(node.attrs.alt || "이미지"),
  ]],
  addNodeView: () => ReactNodeViewRenderer(ImageView),
  addProseMirrorPlugins: () => [
    new Plugin({
      filterTransaction: (transaction) => {
        let valid = true;
        transaction.doc.descendants((node, _position, parent) => {
          if (
            node.type.name === "communityImage" && parent?.type.name !== "doc"
          ) valid = false;
        });
        return valid;
      },
    }),
  ],
});
export default function RichEditor(
  {
    initialContent,
    readOnly = false,
    images,
    dark = false,
    onChange,
    onSnapshot,
    onPickImage,
    onLink,
    onReady,
    ref,
  }: {
    initialContent: RichNode;
    readOnly?: boolean;
    images: Record<string, ImageState>;
    dark?: boolean;
    onChange?: (body: RichNode) => Promise<void>;
    onSnapshot?: (body: RichNode) => Promise<void>;
    onPickImage?: (id: string) => Promise<boolean>;
    onLink?: (url: string) => Promise<void>;
    onReady?: () => Promise<void>;
    ref?: Ref<CommunityEditorHandle>;
    dom?: DOMProps;
  },
) {
  const [link, setLink] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        horizontalRule: false,
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          protocols: ["http", "https"],
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
      }),
      CommunityImage,
    ],
    content: initialContent,
    editable: !readOnly,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        "aria-label": readOnly ? "글 본문" : "글 본문 편집",
        "role": "textbox",
        "aria-multiline": "true",
      },
      handleClick: (_view, _pos, event) => {
        const anchor = (event.target as HTMLElement).closest("a");
        if (anchor) {
          event.preventDefault();
          if (readOnly && /^https?:\/\//i.test(anchor.href)) {
            void onLink?.(anchor.href);
          }
          return true;
        }
        return false;
      },
      handleDrop: (_view, event) => {
        if (event.dataTransfer?.files.length) {
          event.preventDefault();
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        if (event.clipboardData?.files.length) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: current }) => {
      void onChange?.(current.getJSON() as RichNode);
    },
  });
  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);
  useDOMImperativeHandle(ref ?? null, () => ({
    snapshot: () => {
      if (!editor) return;
      editor.view.dom.blur();
      // Let the native IME finish its composition before serializing the document.
      setTimeout(() => {
        void onSnapshot?.(editor.getJSON() as RichNode);
      }, 0);
    },
  }), [editor, onSnapshot]);
  useEffect(() => {
    if (editor) void onReady?.();
  }, [editor, onReady]);
  async function insertImage() {
    if (!editor || !onPickImage) return;
    const id = crypto.randomUUID();
    editor.chain().focus().splitBlock().run();
    const selection = editor.state.selection;
    const position = selection.$from.depth > 0
      ? selection.$from.before(1)
      : selection.from;
    editor.commands.insertContentAt(position, {
      type: "communityImage",
      attrs: { attachmentId: id, alt: "" },
    });
    // An atom node otherwise remains selected; typing would replace the image.
    editor.commands.setTextSelection(
      Math.min(position + 2, editor.state.doc.content.size),
    );
    // The node is placed BEFORE opening the picker. Subsequent typing/undo maps its position naturally.
    const accepted = await onPickImage(id);
    if (!accepted && !editor.isDestroyed) {
      const tr = editor.state.tr;
      editor.state.doc.descendants((node, pos) => {
        if (
          node.type.name === "communityImage" && node.attrs.attachmentId === id
        ) tr.delete(tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize));
      });
      editor.view.dispatch(tr);
    }
  }
  const controls = editor
    ? [
      ["굵게", () => editor.chain().focus().toggleBold().run(), "bold"],
      ["기울임", () => editor.chain().focus().toggleItalic().run(), "italic"],
      [
        "밑줄",
        () => editor.chain().focus().toggleUnderline().run(),
        "underline",
      ],
      ["취소선", () => editor.chain().focus().toggleStrike().run(), "strike"],
      [
        "제목",
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        "heading",
      ],
      [
        "목록",
        () => editor.chain().focus().toggleBulletList().run(),
        "bulletList",
      ],
      [
        "번호",
        () => editor.chain().focus().toggleOrderedList().run(),
        "orderedList",
      ],
      [
        "인용",
        () => editor.chain().focus().toggleBlockquote().run(),
        "blockquote",
      ],
    ] as const
    : [];
  return (
    <div
      className={`community-editor ${dark ? "dark" : ""} ${
        readOnly ? "read-only" : ""
      }`}
    >
      {!readOnly
        ? (
          <div className="toolbar" role="toolbar" aria-label="본문 서식">
            {controls.map(([label, action, type]) => (
              <button
                type="button"
                key={label}
                aria-pressed={editor?.isActive(type)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={action}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setLinkOpen(!linkOpen)}
            >
              링크
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void insertImage()}
              disabled={!editor}
            >
              이미지 삽입
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().undo().run()}
            >
              되돌리기
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().redo().run()}
            >
              다시 실행
            </button>
          </div>
        )
        : null}
      {linkOpen
        ? (
          <div className="link-form">
            <input
              aria-label="링크 주소"
              placeholder="https://"
              value={link}
              onChange={(event) => setLink(event.target.value)}
            />
            <button
              type="button"
              disabled={!/^https?:\/\/\S+$/i.test(link)}
              onClick={() => {
                editor?.chain().focus().setLink({ href: link }).run();
                setLinkOpen(false);
              }}
            >
              적용
            </button>
            <button
              type="button"
              onClick={() => {
                editor?.chain().focus().unsetLink().run();
                setLinkOpen(false);
              }}
            >
              링크 제거
            </button>
          </div>
        )
        : null}
      <Images.Provider value={images}>
        <EditorContent editor={editor} />
      </Images.Provider>
    </div>
  );
}

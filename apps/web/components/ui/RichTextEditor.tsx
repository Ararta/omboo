"use client";

import { useEffect, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Heading2 } from "lucide-react";
import { KNOWN_PLACEHOLDER_FIELDS, KNOWN_PLACEHOLDER_LABELS } from "@omboo/shared";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

// "Placeholder" here means the {{fieldName}} tokens (see below), not TipTap's empty-state
// placeholder extension — this editor doesn't need the latter.
export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-text-content min-h-[220px] px-3 py-2.5 text-[13.5px] text-ink focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // Keep the editor in sync when `value` is replaced wholesale from outside (e.g. switching
  // which template is being edited) — not on every keystroke, since onUpdate already owns that.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) editor.commands.setContent(value, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value === editor?.getHTML() ? null : value]);

  if (!editor) return null;

  function insertPlaceholder(field: string) {
    editor?.chain().focus().insertContent(`{{${field}}} `).run();
  }

  return (
    <div className="rounded-md border border-line bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Թավ">
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Շեղ">
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="Վերնագիր"
        >
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Ցուցակ">
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Համարակալված ցուցակ"
        >
          <ListOrdered size={14} />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-line" />

        <span className="text-[11px] text-muted">Դաշտեր՝</span>
        {KNOWN_PLACEHOLDER_FIELDS.map((field) => (
          <button
            key={field}
            type="button"
            onClick={() => insertPlaceholder(field)}
            title={KNOWN_PLACEHOLDER_LABELS[field]}
            className="rounded border border-line bg-paper px-1.5 py-0.5 text-[10.5px] font-medium text-ink hover:bg-line"
          >
            {KNOWN_PLACEHOLDER_LABELS[field]}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`rounded p-1.5 ${active ? "bg-ink text-white" : "text-ink hover:bg-paper"}`}
    >
      {children}
    </button>
  );
}

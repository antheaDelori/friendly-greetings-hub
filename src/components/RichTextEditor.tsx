import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export function RichTextEditor({ value, onChange }: Props) {
  const wordInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[12rem] px-4 py-3 font-serif text-bone bg-void/40 border-x border-b border-cyan/30 focus:outline-none focus:border-cyan prose prose-invert prose-sm max-w-none transition-colors",
      },
    },
  });

  // Sincronizza quando il valore cambia dall'esterno (es. dopo import Word)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "");
    }
  }, [value]);

  const handleWordImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    editor.commands.setContent(result.value);
    onChange(result.value);
    e.target.value = "";
  };

  if (!editor) return null;

  const btnBase =
    "px-2 py-1 font-mono text-[10px] border border-transparent hover:border-cyan/40 transition-colors";
  const btnActive = "border-cyan/60 bg-cyan/10 text-cyan";
  const btnInactive = "text-bone/50 hover:text-bone";

  return (
    <div className="mt-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border border-cyan/30 border-b-0 bg-void/60 px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${btnBase} ${editor.isActive("bold") ? btnActive : btnInactive} font-bold`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${btnBase} ${editor.isActive("italic") ? btnActive : btnInactive} italic`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${btnBase} ${editor.isActive("underline") ? btnActive : btnInactive} underline`}
        >
          U
        </button>

        <span className="w-px h-4 bg-cyan/20 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${btnBase} ${editor.isActive("heading", { level: 2 }) ? btnActive : btnInactive}`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${btnBase} ${editor.isActive("heading", { level: 3 }) ? btnActive : btnInactive}`}
        >
          H3
        </button>

        <span className="w-px h-4 bg-cyan/20 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${btnBase} ${editor.isActive("bulletList") ? btnActive : btnInactive}`}
        >
          ≡
        </button>

        <span className="w-px h-4 bg-cyan/20 mx-1" />

        {/* Import Word */}
        <input
          ref={wordInputRef}
          type="file"
          accept=".docx"
          onChange={handleWordImport}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => wordInputRef.current?.click()}
          className="ml-auto font-mono text-[9px] tracking-widest uppercase border border-amber/40 text-amber/70 hover:border-amber hover:text-amber px-2 py-1 transition-colors"
        >
          ▸ Importa .docx
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

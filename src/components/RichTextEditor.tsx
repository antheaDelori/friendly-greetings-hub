import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  value: string;
  onChange: (html: string) => void;
  userId?: string;
  bookId?: string;
};

export function RichTextEditor({ value, onChange, userId, bookId }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
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

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "");
    }
  }, [value]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setUploadingImage(true);
    setImageError(null);
    try {
      let src: string | null = null;

      if (userId && bookId) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${bookId}/images/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("libri").upload(path, file, { upsert: true });
        if (!upErr) {
          const { data } = supabase.storage.from("libri").getPublicUrl(path);
          src = data.publicUrl;
        }
      }

      if (!src) {
        src = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      editor.chain().focus().setImage({ src }).run();
      onChange(editor.getHTML());
    } catch {
      setImageError("Errore caricamento immagine.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  if (!editor) return null;

  const btnBase =
    "px-2 py-1 font-mono text-[10px] border border-transparent hover:border-cyan/40 transition-colors";
  const btnActive = "border-cyan/60 bg-cyan/10 text-cyan";
  const btnInactive = "text-bone/50 hover:text-bone";

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-1 border border-cyan/30 border-b-0 bg-void/60 px-2 py-1.5">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${btnBase} ${editor.isActive("bold") ? btnActive : btnInactive} font-bold`}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${btnBase} ${editor.isActive("italic") ? btnActive : btnInactive} italic`}>I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${btnBase} ${editor.isActive("underline") ? btnActive : btnInactive} underline`}>U</button>

        <span className="w-px h-4 bg-cyan/20 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${btnBase} ${editor.isActive("heading", { level: 2 }) ? btnActive : btnInactive}`}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${btnBase} ${editor.isActive("heading", { level: 3 }) ? btnActive : btnInactive}`}>H3</button>

        <span className="w-px h-4 bg-cyan/20 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`${btnBase} ${editor.isActive({ textAlign: "left" }) ? btnActive : btnInactive}`}>⬤ sx</button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`${btnBase} ${editor.isActive({ textAlign: "center" }) ? btnActive : btnInactive}`}>⬤ cx</button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`${btnBase} ${editor.isActive({ textAlign: "right" }) ? btnActive : btnInactive}`}>⬤ dx</button>

        <span className="w-px h-4 bg-cyan/20 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${btnBase} ${editor.isActive("bulletList") ? btnActive : btnInactive}`}>≡</button>

        {userId && bookId && (
          <>
            <span className="w-px h-4 bg-cyan/20 mx-1" />
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <button
              type="button"
              disabled={uploadingImage}
              onClick={() => imageInputRef.current?.click()}
              className={`${btnBase} ${btnInactive} disabled:opacity-40`}
              title="Inserisci immagine"
            >
              {uploadingImage ? "▸ …" : "⊞ img"}
            </button>
          </>
        )}
      </div>

      {imageError && (
        <p className="font-mono text-[9px] text-magenta px-2 py-1 bg-magenta/5 border-x border-cyan/20">
          ⚠ {imageError}
        </p>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}

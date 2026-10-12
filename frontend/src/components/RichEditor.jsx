import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Underline as UnderlineIcon, Heading2, Heading3, List, ListOrdered, Quote, Minus, Undo2, Redo2, RemoveFormatting } from "lucide-react";
import { toSafeHtml } from "@/lib/html";

export default function RichEditor({ value, onChange, testid = "rich-editor" }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } })],
    content: toSafeHtml(value),
    onUpdate: ({ editor: ed }) => onChange(ed.isEmpty ? "" : ed.getHTML()),
    editorProps: { attributes: { class: "rich-content", "data-testid": `${testid}-content` } },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = toSafeHtml(value);
    if (!value && !editor.isEmpty) editor.commands.clearContent();
    else if (value && incoming !== current && !editor.isFocused) editor.commands.setContent(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  const Btn = ({ onClick, active, title, children, id }) => (
    <button type="button" title={title} data-testid={`${testid}-${id}`} className={`rt-btn ${active ? "active" : ""}`} onMouseDown={(e) => { e.preventDefault(); onClick(); }}>
      {children}
    </button>
  );

  return (
    <div className="rich-editor" data-testid={testid}>
      <div className="rt-toolbar">
        <Btn id="bold" title="Gras" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></Btn>
        <Btn id="italic" title="Italique" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></Btn>
        <Btn id="underline" title="Souligné" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></Btn>
        <span className="rt-sep" />
        <Btn id="h2" title="Titre" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></Btn>
        <Btn id="h3" title="Sous-titre" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></Btn>
        <span className="rt-sep" />
        <Btn id="bullet" title="Liste à puces" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></Btn>
        <Btn id="ordered" title="Liste numérotée" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></Btn>
        <Btn id="quote" title="Citation / point clé" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></Btn>
        <Btn id="hr" title="Séparateur" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} /></Btn>
        <span className="rt-sep" />
        <Btn id="clear" title="Effacer la mise en forme" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}><RemoveFormatting size={15} /></Btn>
        <Btn id="undo" title="Annuler" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={15} /></Btn>
        <Btn id="redo" title="Rétablir" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={15} /></Btn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

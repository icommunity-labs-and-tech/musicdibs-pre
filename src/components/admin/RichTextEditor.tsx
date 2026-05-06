import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Bold, Italic, Strikethrough, List, ListOrdered, Quote, Code,
  Heading1, Heading2, Heading3, Link as LinkIcon, Image as ImageIcon,
  Undo, Redo, Minus, Pilcrow,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const ToolbarButton = ({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <Button
    type="button" variant="ghost" size="sm"
    onClick={onClick} disabled={disabled} title={title}
    className={`h-8 w-8 p-0 ${active ? 'bg-primary/20 text-primary' : 'text-white/70 hover:text-white'}`}
  >
    {children}
  </Button>
);

function Toolbar({ editor }: { editor: Editor }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLink = () => {
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('URL del enlace', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
  };

  const handleImageUpload = async (file: File) => {
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `inline/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('blog-images').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('blog-images').getPublicUrl(path);
      editor.chain().focus().setImage({ src: data.publicUrl, alt: file.name }).run();
    } catch (err: any) {
      toast({ title: 'Error al subir imagen', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 bg-white/5 p-1.5 rounded-t-md">
      <ToolbarButton title="Deshacer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Rehacer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo className="w-4 h-4" /></ToolbarButton>
      <div className="w-px h-5 bg-white/10 mx-1" />
      <ToolbarButton title="Párrafo" onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')}><Pilcrow className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Encabezado 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}><Heading1 className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Encabezado 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Encabezado 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 className="w-4 h-4" /></ToolbarButton>
      <div className="w-px h-5 bg-white/10 mx-1" />
      <ToolbarButton title="Negrita" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Cursiva" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Tachado" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Código" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}><Code className="w-4 h-4" /></ToolbarButton>
      <div className="w-px h-5 bg-white/10 mx-1" />
      <ToolbarButton title="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Lista ordenada" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Cita" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Separador" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="w-4 h-4" /></ToolbarButton>
      <div className="w-px h-5 bg-white/10 mx-1" />
      <ToolbarButton title="Insertar enlace" onClick={addLink} active={editor.isActive('link')}><LinkIcon className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Subir imagen" onClick={() => fileInputRef.current?.click()}><ImageIcon className="w-4 h-4" /></ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full h-auto my-4' } }),
      Placeholder.configure({ placeholder: placeholder || 'Empieza a escribir tu artículo…' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[400px] px-4 py-3 focus:outline-none prose-headings:text-white prose-p:text-white/90 prose-a:text-primary prose-strong:text-white prose-blockquote:text-white/70 prose-code:text-primary prose-li:text-white/90',
      },
    },
  });

  // Sync external value changes (e.g., AI generator) into the editor
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="border border-white/10 rounded-md bg-white/5 overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

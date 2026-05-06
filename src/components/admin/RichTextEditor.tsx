import { useEditor, EditorContent, type Editor, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExt from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import { useEffect, useRef, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Bold, Italic, Strikethrough, Underline as UnderlineIcon, List, ListOrdered, Quote, Code,
  Heading1, Heading2, Heading3, Link as LinkIcon, Image as ImageIcon,
  Undo, Redo, Minus, Pilcrow, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  RemoveFormatting,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// Custom FontSize extension (numeric pt/px) on TextStyle
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize?.replace(/['"]/g, '') || null,
          renderHTML: (attrs: any) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

const ToolbarButton = forwardRef<HTMLButtonElement, {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}>(({ onClick, active, disabled, title, children }, ref) => (
  <Button
    ref={ref} type="button" variant="ghost" size="sm"
    onClick={onClick} disabled={disabled} title={title}
    className={`h-8 w-8 p-0 ${active ? 'bg-primary/20 text-primary' : 'text-white/70 hover:text-white'}`}
  >
    {children}
  </Button>
));
ToolbarButton.displayName = 'ToolbarButton';

const FONT_FAMILIES = [
  { label: 'Por defecto', value: '' },
  { label: 'Sans-serif', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, Cambria, "Times New Roman", serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];
const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px'];

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
        contentType: file.type, upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('blog-images').getPublicUrl(path);
      editor.chain().focus().setImage({ src: data.publicUrl, alt: file.name }).run();
    } catch (err: any) {
      toast({ title: 'Error al subir imagen', description: err.message, variant: 'destructive' });
    }
  };

  const currentFamily = editor.getAttributes('textStyle').fontFamily || '';
  const currentSize = editor.getAttributes('textStyle').fontSize || '';
  const currentColor = editor.getAttributes('textStyle').color || '#ffffff';

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 bg-white/5 p-1.5 rounded-t-md sticky top-0 z-10">
      <ToolbarButton title="Deshacer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Rehacer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo className="w-4 h-4" /></ToolbarButton>
      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Font family */}
      <select
        value={currentFamily}
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setFontFamily(v).run();
          else editor.chain().focus().unsetFontFamily().run();
        }}
        title="Tipo de letra"
        className="h-8 rounded bg-white/10 border border-white/10 text-white/80 text-xs px-1.5 max-w-[120px]"
      >
        {FONT_FAMILIES.map((f) => <option key={f.label} value={f.value} className="bg-neutral-900">{f.label}</option>)}
      </select>

      {/* Font size */}
      <select
        value={currentSize}
        onChange={(e) => {
          const v = e.target.value;
          if (v) (editor.chain().focus() as any).setFontSize(v).run();
          else (editor.chain().focus() as any).unsetFontSize().run();
        }}
        title="Tamaño"
        className="h-8 rounded bg-white/10 border border-white/10 text-white/80 text-xs px-1.5"
      >
        <option value="" className="bg-neutral-900">Tamaño</option>
        {FONT_SIZES.map((s) => <option key={s} value={s} className="bg-neutral-900">{s}</option>)}
      </select>

      {/* Color */}
      <input
        type="color"
        value={currentColor}
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        title="Color de texto"
        className="h-8 w-8 rounded cursor-pointer bg-transparent border border-white/10"
      />

      <div className="w-px h-5 bg-white/10 mx-1" />
      <ToolbarButton title="Párrafo" onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')}><Pilcrow className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="H1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}><Heading1 className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="H3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 className="w-4 h-4" /></ToolbarButton>

      <div className="w-px h-5 bg-white/10 mx-1" />
      <ToolbarButton title="Negrita" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Cursiva" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Subrayado" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Tachado" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Código" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}><Code className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Quitar formato" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="w-4 h-4" /></ToolbarButton>

      <div className="w-px h-5 bg-white/10 mx-1" />
      <ToolbarButton title="Alinear izquierda" onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}><AlignLeft className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Centrar" onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}><AlignCenter className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Alinear derecha" onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}><AlignRight className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Justificar" onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })}><AlignJustify className="w-4 h-4" /></ToolbarButton>

      <div className="w-px h-5 bg-white/10 mx-1" />
      <ToolbarButton title="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Lista ordenada" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Cita" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Separador" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="w-4 h-4" /></ToolbarButton>

      <div className="w-px h-5 bg-white/10 mx-1" />
      <ToolbarButton title="Insertar enlace" onClick={addLink} active={editor.isActive('link')}><LinkIcon className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Subir imagen" onClick={() => fileInputRef.current?.click()}><ImageIcon className="w-4 h-4" /></ToolbarButton>
      <input
        ref={fileInputRef} type="file" accept="image/*" className="hidden"
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
      StarterKit.configure({ link: false }),
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      ImageExt.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full h-auto my-4' } }),
      Placeholder.configure({ placeholder: placeholder || 'Empieza a escribir tu artículo…' }),
      Underline,
      TextStyle,
      FontFamily.configure({ types: ['textStyle'] }),
      Color.configure({ types: ['textStyle'] }),
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none min-h-[400px] px-4 py-3 focus:outline-none ' +
          'prose-headings:text-white prose-h1:text-3xl prose-h1:font-bold prose-h1:mt-6 prose-h1:mb-3 ' +
          'prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-5 prose-h2:mb-2 ' +
          'prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2 ' +
          'prose-p:text-white/90 prose-a:text-primary prose-strong:text-white ' +
          'prose-blockquote:text-white/70 prose-code:text-primary prose-li:text-white/90',
      },
    },
  });

  // Sync external value changes (e.g., AI generator) into editor
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

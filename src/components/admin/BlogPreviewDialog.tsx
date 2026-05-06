import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Tag } from "lucide-react";
import DOMPurify from "dompurify";

type PreviewPost = {
  title: string;
  excerpt?: string | null;
  content?: string | null;
  image_url?: string | null;
  category?: string | null;
  tags?: string[] | string | null;
  author?: string | null;
  published_at?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: PreviewPost | null;
};

const BlogPreviewDialog = ({ open, onOpenChange, post }: Props) => {
  if (!post) return null;

  const tags = Array.isArray(post.tags)
    ? post.tags
    : typeof post.tags === "string"
      ? post.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle className="text-sm text-slate-500 font-normal">
            Vista previa del artículo
          </DialogTitle>
        </DialogHeader>

        <article className="pt-2 text-slate-800">
          <div className="flex items-center gap-3 mb-4 text-sm text-slate-500 flex-wrap">
            {post.category && (
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">
                {post.category}
              </span>
            )}
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
            )}
            {post.author && <span>· {post.author}</span>}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            {post.title || "Sin título"}
          </h1>

          {post.image_url && (
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full rounded-xl mb-8 max-h-[400px] object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}

          {post.excerpt && (
            <p className="text-lg text-slate-600 italic mb-6 border-l-2 border-purple-300 pl-4">
              {post.excerpt}
            </p>
          )}

          {post.content ? (
            <div
              className="article-content article-content-lg prose prose-slate max-w-none [&_*]:text-slate-800 [&_a]:text-blue-600"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
            />
          ) : (
            <p className="text-slate-500">Sin contenido aún.</p>
          )}

          {tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-slate-400" />
                {tags.map((tag) => (
                  <span key={tag} className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
      </DialogContent>
    </Dialog>
  );
};

export default BlogPreviewDialog;

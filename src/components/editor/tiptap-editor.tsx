'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export function TiptapEditor({
  content,
  onChange,
  editable = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '원고 내용을 입력하세요...',
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none dark:prose-invert',
          'min-h-[500px] px-6 py-4 outline-none',
          'focus:outline-none',
          '[&_p]:my-2 [&_p]:leading-7',
          '[&_.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_.is-editor-empty:first-child::before]:float-left',
          '[&_.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.is-editor-empty:first-child::before]:h-0',
          "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
        ),
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.getHTML();
    if (content !== currentHTML) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  if (!editor) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background">
      <EditorContent editor={editor} />
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Box } from "@/components/ui/Box";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { TableKit } from "@tiptap/extension-table/kit";

type TiptapBlogEditorProps = {
  initialContent?: JSONContent | null;
  placeholder?: string;
  onChange: (payload: { json: JSONContent | null; html: string }) => void;
};

export default function TiptapBlogEditor({
  initialContent,
  placeholder = "Write your blog content...",
  onChange,
}: TiptapBlogEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Image,
      TableKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialContent ?? "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-[320px] w-full rounded-md border border-input bg-background px-3 py-3 text-sm ring-offset-background focus-visible:outline-none prose prose-slate max-w-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange({
        json: currentEditor.getJSON(),
        html: currentEditor.getHTML(),
      });
    },
  });

  const setLink = useCallback(() => {
    if (!editor) {
      return;
    }
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Paste URL", previousUrl ?? "https://");

    if (url === null) {
      return;
    }

    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().setLink({ href: url.trim() }).run();
  }, [editor]);

  const insertImage = useCallback(() => {
    if (!editor) {
      return;
    }
    const src = window.prompt("Image URL");
    if (!src || !src.trim()) {
      return;
    }
    const alt = window.prompt("Image Alt Text (optional)") ?? "";
    editor.chain().focus().setImage({ src: src.trim(), alt }).run();
  }, [editor]);

  if (!editor) {
    return <Box className="p-4 text-sm text-slate-500">Loading editor...</Box>;
  }

  return (
    <Box className="space-y-2">
      <Box className="flex flex-wrap items-center gap-2 rounded-md border bg-white p-2">
        <Button
          type="button"
          variant={editor.isActive("bold") ? "default" : "outline"}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </Button>
        <Button
          type="button"
          variant={editor.isActive("italic") ? "default" : "outline"}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </Button>
        <Button
          type="button"
          variant={editor.isActive("underline") ? "default" : "outline"}
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          Underline
        </Button>
        <Button
          type="button"
          variant={editor.isActive("heading", { level: 2 }) ? "default" : "outline"}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </Button>
        <Button
          type="button"
          variant={editor.isActive("heading", { level: 3 }) ? "default" : "outline"}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </Button>
        <Button
          type="button"
          variant={editor.isActive("bulletList") ? "default" : "outline"}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Bullets
        </Button>
        <Button
          type="button"
          variant={editor.isActive("orderedList") ? "default" : "outline"}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={setLink}>
          Link
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={insertImage}>
          Image
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="Insert table"
        >
          Table
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          Clear
        </Button>
      </Box>
      <EditorContent editor={editor} />
    </Box>
  );
}

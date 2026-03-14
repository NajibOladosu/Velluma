"use client"

import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import { cn } from "@/lib/utils"
import { Surface } from "../ui/surface"
import { Button } from "../ui/button"
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Link as LinkIcon,
    Quote
} from "lucide-react"

interface MinimalEditorProps {
    content?: string
    onChange?: (content: string) => void
    placeholder?: string
    className?: string
}

export function MinimalEditor({
    content = "",
    onChange,
    placeholder = "Start writing your proposal...",
    className,
}: MinimalEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder,
            }),
            Underline,
            Link.configure({
                openOnClick: false,
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: cn(
                    "prose prose-sm prose-zinc max-w-none focus:outline-none min-h-[400px]",
                    "text-zinc-900 selection:bg-zinc-900 selection:text-white"
                ),
            },
        },
    })

    if (!editor) return null

    return (
        <Surface className={cn("flex flex-col overflow-hidden bg-white", className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-50/50 p-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn("h-8 w-8", editor.isActive("bold") && "bg-zinc-200")}
                >
                    <Bold className="h-4 w-4" strokeWidth={2} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn("h-8 w-8", editor.isActive("italic") && "bg-zinc-200")}
                >
                    <Italic className="h-4 w-4" strokeWidth={2} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={cn("h-8 w-8", editor.isActive("underline") && "bg-zinc-200")}
                >
                    <UnderlineIcon className="h-4 w-4" strokeWidth={2} />
                </Button>
                <div className="mx-1 h-4 w-[1px] bg-zinc-300" />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn("h-8 w-8", editor.isActive("bulletList") && "bg-zinc-200")}
                >
                    <List className="h-4 w-4" strokeWidth={2} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn("h-8 w-8", editor.isActive("orderedList") && "bg-zinc-200")}
                >
                    <ListOrdered className="h-4 w-4" strokeWidth={2} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={cn("h-8 w-8", editor.isActive("blockquote") && "bg-zinc-200")}
                >
                    <Quote className="h-4 w-4" strokeWidth={2} />
                </Button>
            </div>

            {/* Editor Canvas */}
            <div className="p-8">
                <EditorContent editor={editor} />
            </div>
        </Surface>
    )
}


import React, { useState, useRef } from 'react';
import FormatBold from "@mui/icons-material/FormatBold";
import FormatListBulleted from "@mui/icons-material/FormatListBulleted";
import FormatItalic from "@mui/icons-material/FormatItalic";
import FormatUnderlined from "@mui/icons-material/FormatUnderlined";
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onAddQuestion?: () => void;
  placeholderText?: string;
  height?: string;
  insertQuestionMark?: boolean;
  questionNumber?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onAddQuestion,
  placeholderText = "Enter text here...",
  height = "300px",
  insertQuestionMark = false,
  questionNumber
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    updateValue();
  };

  const updateValue = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInsertQuestionMark = () => {
    if (!editorRef.current) return;

    // Get selection
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
      // If no selection, just insert at cursor
      document.execCommand('insertText', false, `\${Q}`);
    } else {
      // If text is selected, replace it with the question mark
      const selectedText = selection.toString();
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const questionMark = document.createTextNode(`\${Q}`);
      range.insertNode(questionMark);
    }
    
    // Create a new question when a question mark is inserted
    if (onAddQuestion) {
      onAddQuestion();
    }
    
    updateValue();
  };

  // Handle paste to strip formatting
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    updateValue();
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-gray-50 border-b p-2 flex gap-1">
        <Button
        disabled
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => handleCommand('bold')}
          className="p-1 h-8 w-8"
        >
          <FormatBold className="h-4 w-4" />
        </Button>
        <Button
        disabled
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => handleCommand('italic')}
          className="p-1 h-8 w-8"
        >
          <FormatItalic className="h-4 w-4" />
        </Button>
        <Button
        disabled
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => handleCommand('underline')}
          className="p-1 h-8 w-8"
        >
          <FormatUnderlined className="h-4 w-4" />
        </Button>
        <Button
        disabled
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => handleCommand('insertOrderedList')}
          className="p-1 h-8 w-8"
        >
          <FormatListBulleted className="h-4 w-4" />
        </Button>

        {insertQuestionMark && (
          <Button
          disabled
            type="button"
            size="sm"
            variant="outline"
            onClick={handleInsertQuestionMark}
            className="ml-auto"
          >
            Insert Q
          </Button>
        )}
      </div>

      <textarea
        ref={editorRef}
        className="p-3 outline-none w-full"
        style={{ minHeight: height, maxHeight: '600px', overflowY: 'auto' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholderText}
      />
    </div>
  );
};

export default RichTextEditor;

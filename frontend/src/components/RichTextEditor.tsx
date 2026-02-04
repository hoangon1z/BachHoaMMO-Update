'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Bold, Italic, Link, Unlink, Type } from 'lucide-react';
import { Button } from './ui/button';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Nhập nội dung...',
  minHeight = '150px'
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isEmpty, setIsEmpty] = useState(true);

  // nội dung content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
    setIsEmpty(!value || value === '<br>' || value.trim() === '');
  }, []);

  // cập nhật nội dung cho parent
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
      setIsEmpty(!content || content === '<br>' || content.trim() === '');
    }
  }, [onChange]);

  // Execute formatting command
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  // Toggle bold
  const toggleBold = () => {
    execCommand('bold');
  };

  // Toggle italic
  const toggleItalic = () => {
    execCommand('italic');
  };

  // Handle link creation
  const createLink = () => {
    if (!linkUrl.trim()) return;
    
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    execCommand('createLink', url);
    setShowLinkInput(false);
    setLinkUrl('');
  };

  // Remove link
  const removeLink = () => {
    execCommand('unlink');
  };

  // Handle key press for link input
  const handleLinkKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createLink();
    }
    if (e.key === 'Escape') {
      setShowLinkInput(false);
      setLinkUrl('');
      editorRef.current?.focus();
    }
  };

  // Check if format is active
  const isFormatActive = (format: string): boolean => {
    try {
      return document.queryCommandState(format);
    } catch {
      return false;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleBold}
          className={`h-8 w-8 p-0 ${isFormatActive('bold') ? 'bg-blue-100 text-blue-600' : ''}`}
          title="In đậm (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleItalic}
          className={`h-8 w-8 p-0 ${isFormatActive('italic') ? 'bg-blue-100 text-blue-600' : ''}`}
          title="In nghiêng (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <div className="relative">
          {showLinkInput ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={handleLinkKeyPress}
                className="h-7 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={createLink}
                className="h-7 px-2"
              >
                Thêm
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl('');
                }}
                className="h-7 px-2"
              >
                Hủy
              </Button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowLinkInput(true)}
                className="h-8 w-8 p-0"
                title="Thêm liên kết"
              >
                <Link className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeLink}
                className="h-8 w-8 p-0"
                title="Xóa liên kết"
              >
                <Unlink className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="px-3 py-2 outline-none prose prose-sm max-w-none"
          style={{ minHeight }}
        />
        
        {/* Placeholder */}
        {isEmpty && (
          <div 
            className="absolute top-2 left-3 text-gray-400 pointer-events-none"
            aria-hidden="true"
          >
            {placeholder}
          </div>
        )}
      </div>
      
      {/* Help text */}
      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
        Hỗ trợ: <strong>In đậm</strong>, <em>in nghiêng</em>, và <a href="#" className="text-blue-600 underline" onClick={(e) => e.preventDefault()}>liên kết</a>
      </div>
    </div>
  );
}

// Simple utility to convert HTML to plain text (for display in cards etc.)
export function htmlToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// Utility to sanitize HTML (remove dangerous tags/attributes)
export function sanitizeHtml(html: string): string {
  // Basic sanitization - in production, use a library like DOMPurify
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Only allow certain tags
  const allowedTags = ['b', 'strong', 'i', 'em', 'a', 'p', 'br', 'ul', 'ol', 'li'];
  const allowedAttributes = ['href', 'target', 'rel'];
  
  const sanitize = (element: Element) => {
    Array.from(element.children).forEach(child => {
      const tagName = child.tagName.toLowerCase();
      
      if (!allowedTags.includes(tagName)) {
        // Replace with text content
        child.replaceWith(document.createTextNode(child.textContent || ''));
      } else {
        // Remove disallowed attributes
        Array.from(child.attributes).forEach(attr => {
          if (!allowedAttributes.includes(attr.name)) {
            child.removeAttribute(attr.name);
          }
        });
        
        // For links, add safety attributes
        if (tagName === 'a') {
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener noreferrer');
        }
        
        // Recursively sanitize children
        sanitize(child);
      }
    });
  };
  
  sanitize(div);
  return div.innerHTML;
}

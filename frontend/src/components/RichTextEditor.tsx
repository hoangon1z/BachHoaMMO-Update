'use client';

import { useMemo, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Import Quill styles globally
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to prevent SSR issues
const ReactQuill = dynamic(
  () => import('react-quill'),
  {
    ssr: false,
    loading: () => (
      <div className="border border-gray-200 rounded-lg p-4 min-h-[150px] animate-pulse bg-gray-50">
        <div className="h-10 bg-gray-200 rounded mb-2"></div>
        <div className="h-24 bg-gray-100 rounded"></div>
      </div>
    ),
  }
);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  readOnly?: boolean;
}

// Custom toolbar configuration - Word-like experience
const TOOLBAR_OPTIONS = [
  // Font styles
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  [{ 'font': [] }],
  [{ 'size': ['small', false, 'large', 'huge'] }],

  // Basic formatting
  ['bold', 'italic', 'underline', 'strike'],

  // Colors
  [{ 'color': [] }, { 'background': [] }],

  // Lists and indentation
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],

  // Alignment
  [{ 'align': [] }],

  // Rich content
  ['blockquote', 'code-block'],
  ['link', 'image'],

  // Misc
  [{ 'script': 'sub' }, { 'script': 'super' }],
  [{ 'direction': 'rtl' }],

  // Clean formatting
  ['clean'],
];

// Quill formats we allow
const FORMATS = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet', 'indent',
  'align', 'direction',
  'blockquote', 'code-block',
  'link', 'image',
  'script',
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  minHeight = '200px',
  maxHeight = '500px',
  readOnly = false,
}: RichTextEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const modules = useMemo(() => ({
    toolbar: readOnly ? false : TOOLBAR_OPTIONS,
    clipboard: {
      matchVisual: false,
    },
  }), [readOnly]);

  const handleChange = (content: string) => {
    // Quill returns <p><br></p> for empty content, normalize it
    if (content === '<p><br></p>' || content === '<p></p>') {
      onChange('');
    } else {
      onChange(content);
    }
  };

  if (!isMounted) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 min-h-[150px] animate-pulse bg-gray-50">
        <div className="h-10 bg-gray-200 rounded mb-2"></div>
        <div className="h-24 bg-gray-100 rounded"></div>
      </div>
    );
  }

  return (
    <div className="rich-text-editor">
      <style jsx global>{`
        .rich-text-editor .ql-container {
          min-height: ${minHeight};
          max-height: ${maxHeight};
          overflow-y: auto;
          font-size: 14px;
          font-family: inherit;
        }
        
        .rich-text-editor .ql-editor {
          min-height: ${minHeight};
          line-height: 1.75;
        }
        
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
        
        .rich-text-editor .ql-toolbar {
          border-color: #e5e7eb;
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: #f9fafb;
          flex-wrap: wrap;
          padding: 8px;
        }
        
        .rich-text-editor .ql-container {
          border-color: #e5e7eb;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
        
        .rich-text-editor .ql-toolbar button:hover,
        .rich-text-editor .ql-toolbar button.ql-active {
          color: #2563eb;
        }
        
        .rich-text-editor .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: #2563eb;
        }
        
        .rich-text-editor .ql-toolbar button:hover .ql-fill,
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
          fill: #2563eb;
        }
        
        .rich-text-editor .ql-snow .ql-picker {
          color: #374151;
        }
        
        .rich-text-editor .ql-snow .ql-picker-label:hover,
        .rich-text-editor .ql-snow .ql-picker-label.ql-active {
          color: #2563eb;
        }
        
        /* Better tooltip styling */
        .rich-text-editor .ql-tooltip {
          z-index: 100;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        
        /* Image styling */
        .rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 8px 0;
        }
        
        /* Blockquote styling */
        .rich-text-editor .ql-editor blockquote {
          border-left: 4px solid #2563eb;
          padding-left: 16px;
          margin: 16px 0;
          color: #374151;
          font-style: italic;
        }
        
        /* Code block styling */
        .rich-text-editor .ql-editor pre.ql-syntax {
          background: #1e293b;
          color: #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
        }
        
        /* Lists styling */
        .rich-text-editor .ql-editor ul,
        .rich-text-editor .ql-editor ol {
          padding-left: 24px;
        }
        
        .rich-text-editor .ql-editor li {
          margin: 4px 0;
        }
        
        /* Headings */
        .rich-text-editor .ql-editor h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 16px 0 8px;
        }
        
        .rich-text-editor .ql-editor h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 14px 0 6px;
        }
        
        .rich-text-editor .ql-editor h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 12px 0 4px;
        }
        
        /* Mobile responsive toolbar */
        @media (max-width: 640px) {
          .rich-text-editor .ql-toolbar {
            padding: 4px;
          }
          
          .rich-text-editor .ql-toolbar .ql-formats {
            margin-right: 4px;
            margin-bottom: 4px;
          }
          
          .rich-text-editor .ql-toolbar button {
            width: 24px;
            height: 24px;
          }
        }
      `}</style>

      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={FORMATS}
        placeholder={placeholder}
        readOnly={readOnly}
      />

      {/* Help text */}
      {!readOnly && (
        <div className="px-3 py-2 border border-t-0 border-gray-200 rounded-b-lg bg-gray-50 text-xs text-gray-500 -mt-1">
          <span className="hidden sm:inline">
            💡 Mẹo: Sử dụng toolbar để định dạng văn bản. Bạn có thể chèn hình ảnh, tạo danh sách, thay đổi màu sắc và nhiều hơn nữa!
          </span>
          <span className="sm:hidden">
            💡 Sử dụng toolbar để định dạng văn bản
          </span>
        </div>
      )}
    </div>
  );
}

// Simple utility to convert HTML to plain text (for display in cards etc.)
// Note: This only works on client-side as it uses DOM
export function htmlToPlainText(html: string): string {
  if (typeof window === 'undefined') return stripHtml(html);
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// Strip HTML tags using regex - works on both server and client
// Use this for previews and summaries
export function stripHtml(html: string): string {
  if (!html) return '';
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');
  // Replace multiple spaces with single space
  text = text.replace(/\s+/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  return text.trim();
}

// Utility to sanitize HTML (remove dangerous tags/attributes)
// Updated to allow more tags from Quill editor
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined') return html;

  // Basic sanitization - in production, use a library like DOMPurify
  const div = document.createElement('div');
  div.innerHTML = html;

  // Only allow certain tags (including Quill-generated ones)
  const allowedTags = [
    'p', 'br', 'div', 'span',
    'b', 'strong', 'i', 'em', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img',
    'blockquote', 'pre', 'code',
    'sub', 'sup',
  ];
  const allowedAttributes = ['href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'style'];

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

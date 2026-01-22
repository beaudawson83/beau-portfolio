'use client';

import { documentToReactComponents, type Options } from '@contentful/rich-text-react-renderer';
import { BLOCKS, INLINES, MARKS, type Document } from '@contentful/rich-text-types';
import type { ReactNode } from 'react';

interface RichTextRendererProps {
  content: Document;
}

const renderOptions: Options = {
  renderMark: {
    [MARKS.BOLD]: (text: ReactNode) => (
      <strong className="font-semibold text-white">{text}</strong>
    ),
    [MARKS.ITALIC]: (text: ReactNode) => (
      <em className="italic">{text}</em>
    ),
    [MARKS.CODE]: (text: ReactNode) => (
      <code className="font-mono bg-[#1F1F1F] text-[#7C3AED] px-1.5 py-0.5 text-sm">
        {text}
      </code>
    ),
  },

  renderNode: {
    [BLOCKS.PARAGRAPH]: (node, children) => (
      <p className="text-[#94A3B8] leading-relaxed mb-4">{children}</p>
    ),

    [BLOCKS.HEADING_2]: (node, children) => (
      <h2 className="font-mono text-xl text-white mt-8 mb-4">
        <span className="text-[#7C3AED]">{'>'}</span> {children}
      </h2>
    ),

    [BLOCKS.HEADING_3]: (node, children) => (
      <h3 className="font-mono text-lg text-white mt-6 mb-3">
        <span className="text-[#7C3AED]">{'>'}</span> {children}
      </h3>
    ),

    [BLOCKS.HEADING_4]: (node, children) => (
      <h4 className="font-mono text-base text-white mt-4 mb-2">
        <span className="text-[#7C3AED]">{'>>'}</span> {children}
      </h4>
    ),

    [BLOCKS.UL_LIST]: (node, children) => (
      <ul className="list-none space-y-2 mb-4 pl-4">{children}</ul>
    ),

    [BLOCKS.OL_LIST]: (node, children) => (
      <ol className="list-none space-y-2 mb-4 pl-4 counter-reset-item">
        {children}
      </ol>
    ),

    [BLOCKS.LIST_ITEM]: (node, children) => (
      <li className="text-[#94A3B8] relative pl-4">
        <span className="absolute left-0 text-[#7C3AED] font-mono">-</span>
        {children}
      </li>
    ),

    [BLOCKS.QUOTE]: (node, children) => (
      <blockquote className="border-l-2 border-[#7C3AED] pl-4 my-6 italic text-[#94A3B8]">
        {children}
      </blockquote>
    ),

    [BLOCKS.HR]: () => (
      <hr className="border-[#1F1F1F] my-8" />
    ),

    [BLOCKS.EMBEDDED_ENTRY]: (node) => {
      // Handle embedded entries (like DataCallout)
      const contentType = node.data.target?.sys?.contentType?.sys?.id;

      if (contentType === 'dataCallout') {
        const fields = node.data.target.fields;
        return (
          <div
            className={`
              my-6 p-4 border font-mono text-sm
              ${
                fields.type === 'INFO'
                  ? 'border-[#7C3AED] bg-[#7C3AED]/5'
                  : fields.type === 'WARNING'
                  ? 'border-yellow-500 bg-yellow-500/5'
                  : fields.type === 'SUCCESS'
                  ? 'border-green-500 bg-green-500/5'
                  : fields.type === 'CODE'
                  ? 'border-[#94A3B8] bg-[#0a0a0a]'
                  : 'border-[#7C3AED] bg-[#1F1F1F]'
              }
            `}
          >
            {fields.title && (
              <div className="text-white mb-2 uppercase tracking-wider text-xs">
                [ {fields.title} ]
              </div>
            )}
            <div className="text-[#94A3B8] whitespace-pre-wrap">
              {fields.content}
            </div>
          </div>
        );
      }

      return null;
    },

    [INLINES.HYPERLINK]: (node, children) => (
      <a
        href={node.data.uri}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#7C3AED] hover:underline"
      >
        {children}
      </a>
    ),
  },
};

export default function RichTextRenderer({ content }: RichTextRendererProps) {
  return (
    <div className="rich-text-content">
      {documentToReactComponents(content, renderOptions)}
    </div>
  );
}

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ ...props }) => <p className="mb-3 leading-7 last:mb-0 break-words" {...props} />,
        a: ({ ...props }) => (
          <a
            {...props}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-emerald-400/70 underline-offset-2 break-all"
          />
        ),
        ul: ({ ...props }) => <ul className="mb-3 list-disc pl-5 last:mb-0" {...props} />,
        ol: ({ ...props }) => <ol className="mb-3 list-decimal pl-5 last:mb-0" {...props} />,
        li: ({ ...props }) => <li className="mb-1 last:mb-0 break-words" {...props} />,
        code: ({ className, children, ...props }) => {
          const isBlock = Boolean(className?.includes("language-"));

          if (!isBlock) {
            return (
              <code className="rounded bg-neutral-950/90 px-1 py-0.5 text-[0.9em] break-words" {...props}>
                {children}
              </code>
            );
          }

          return (
            <code
              className="block overflow-x-auto whitespace-pre rounded bg-neutral-950 p-3 text-xs leading-6"
              {...props}
            >
              {children}
            </code>
          );
        },
        pre: ({ ...props }) => <pre className="my-3 overflow-x-auto" {...props} />
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

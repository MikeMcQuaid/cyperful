import clsx from "clsx";
import { useEffect, useState } from "react";
import { removeLeadingSpace } from "~/lib/utils/string";

import SyntaxHighlighterWorker from "./syntax-highlighter-worker?worker";

const worker = new SyntaxHighlighterWorker();

let taskIdCounter = 0;
const highlight = async (code: string, lang: string) => {
  const taskId = taskIdCounter++;

  return new Promise<string>((resolve) => {
    const cb = (event: MessageEvent) => {
      if (event.data.taskId === taskId) {
        resolve(event.data.html);
        worker.removeEventListener("message", cb);
      }
    };
    worker.addEventListener("message", cb);
    worker.postMessage({ taskId, code, lang });
  });
};

const QUERY_KEYS = [
  "query",
  // any others?
] as const;
export const inspectRequestBody = (url: string, body: unknown) => {
  if (
    url.match(/[/._-](graphql|gql)\b/) &&
    body != null &&
    typeof body === "object"
  ) {
    for (const queryKey of QUERY_KEYS) {
      const queryValue = queryKey in body ? body[queryKey] : null;
      if (
        typeof queryValue === "string" &&
        queryValue.match(/\bquery\b|\bmutation\b|\bsubscription\b/i)
      ) {
        const strippedBody = { ...body } as Record<string, unknown>;
        strippedBody[queryKey] = "(see above)";
        return {
          graphqlQuery: removeLeadingSpace(queryValue).trim(),
          strippedBody,
        };
      }
    }
  }
  return {
    strippedBody: body,
  };
};

export const safeStringify = (data: unknown): string => {
  if (typeof data === "string" || typeof data === "number")
    return data.toString();

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return "<unserializable data>";
  }
};

export const SyntaxHighlight: React.FC<{
  content: unknown;
  type: "graphql" | "json" | null;
  className?: string;
}> = ({ content, type, className }) => {
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  useEffect(() => {
    if (type) {
      void highlight(safeStringify(content), type).then(setRenderedHtml);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={clsx("whitespace-pre-wrap overflow-auto", className)}>
      {renderedHtml != null ? (
        <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      ) : (
        safeStringify(content)
      )}
    </div>
  );
};

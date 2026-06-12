export function WorkspaceCommentBody({ body }: { body: string }) {
  return <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink/80">{body}</p>;
}

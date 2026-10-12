type HtmlFragmentProps = {
  html: string;
  className?: string;
  id?: string;
};

export function HtmlFragment({ html, className, id }: HtmlFragmentProps) {
  return (
    <div
      id={id}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      suppressHydrationWarning
    />
  );
}

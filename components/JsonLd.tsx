export function JsonLd({ data }: { data: object }) {
  const html = `${JSON.stringify(data, null, 2)}\n`;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
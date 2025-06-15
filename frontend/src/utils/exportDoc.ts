import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export function exportNotesAsDocx(title: string, content: string) {
  const paragraphs = content.split("\n").map(line =>
    new Paragraph({
      children: [new TextRun(line)],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 28,
              }),
            ],
          }),
          ...paragraphs,
        ],
      },
    ],
  });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${title}.docx`);
  });
}

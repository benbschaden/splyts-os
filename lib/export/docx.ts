import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
} from 'docx'

type DocxChild = Paragraph

/** Parse inline markdown (bold, italic, bold-italic) into TextRun array. */
function parseInlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = []
  // Match bold-italic, bold, italic in that priority order
  const pattern = /(\*\*\*|___)(.*?)\1|(\*\*|__)(.*?)\3|(\*|_)(.*?)\5/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }))
    }

    if (match[1]) {
      // bold-italic
      runs.push(new TextRun({ text: match[2], bold: true, italics: true }))
    } else if (match[3]) {
      // bold
      runs.push(new TextRun({ text: match[4], bold: true }))
    } else if (match[5]) {
      // italic
      runs.push(new TextRun({ text: match[6], italics: true }))
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }))
  }

  return runs.length > 0 ? runs : [new TextRun({ text })]
}

/** Strip leading markdown list markers and return clean text. */
function stripListMarker(line: string): string {
  return line.replace(/^(\s*[-*+]\s+|\s*\d+\.\s+)/, '')
}

function isUnorderedListItem(line: string): boolean {
  return /^\s*[-*+]\s+/.test(line)
}

function isOrderedListItem(line: string): boolean {
  return /^\s*\d+\.\s+/.test(line)
}

/** Convert a markdown string into an array of docx Paragraph objects. */
function markdownToParagraphs(markdown: string): DocxChild[] {
  const lines = markdown.split('\n')
  const children: DocxChild[] = []
  let bulletCount = 0

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (line.startsWith('### ')) {
      bulletCount = 0
      children.push(
        new Paragraph({
          text: line.slice(4),
          heading: HeadingLevel.HEADING_3,
        }),
      )
    } else if (line.startsWith('## ')) {
      bulletCount = 0
      children.push(
        new Paragraph({
          text: line.slice(3),
          heading: HeadingLevel.HEADING_2,
        }),
      )
    } else if (line.startsWith('# ')) {
      bulletCount = 0
      children.push(
        new Paragraph({
          text: line.slice(2),
          heading: HeadingLevel.HEADING_1,
        }),
      )
    } else if (line.startsWith('---') || line.startsWith('***') || line.startsWith('___')) {
      // Horizontal rule → empty paragraph
      bulletCount = 0
      children.push(new Paragraph({ text: '' }))
    } else if (isUnorderedListItem(line)) {
      bulletCount = 0
      children.push(
        new Paragraph({
          children: parseInlineRuns(stripListMarker(line)),
          bullet: { level: 0 },
        }),
      )
    } else if (isOrderedListItem(line)) {
      children.push(
        new Paragraph({
          children: parseInlineRuns(stripListMarker(line)),
          numbering: { reference: 'default-numbering', level: 0 },
        }),
      )
      bulletCount++
    } else if (line.trim() === '') {
      bulletCount = 0
      children.push(new Paragraph({ text: '' }))
    } else {
      bulletCount = 0
      children.push(
        new Paragraph({
          children: parseInlineRuns(line),
        }),
      )
    }
  }

  return children
}

/** Generate a .docx blob from a markdown string. */
async function markdownToDocxBlob(markdown: string, title: string): Promise<Blob> {
  const children = markdownToParagraphs(markdown)

  const doc = new Document({
    title,
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}

/** Download a markdown string as a .docx file in the browser. */
export async function downloadAsDocx(markdown: string, filename: string): Promise<void> {
  const blob = await markdownToDocxBlob(markdown, filename)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.docx') ? filename : `${filename}.docx`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** Return true if a chat message is requesting a .docx export. */
export function isExportDocIntent(message: string): boolean {
  const lower = message.toLowerCase()

  const docKeywords = ['google doc', 'google drive', '.docx', 'word doc', 'word document']
  if (docKeywords.some((k) => lower.includes(k))) return true

  const exportPhrases = [
    'as a doc',
    'as a document',
    'as doc',
    'in doc format',
    'in document format',
    'export as',
    'download as',
    'export this',
    'download this',
    'export it',
    'download it',
  ]
  if (exportPhrases.some((k) => lower.includes(k))) return true

  return false
}

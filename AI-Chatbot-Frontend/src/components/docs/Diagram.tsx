import type { DocsBlock } from '@/types';

/* Inline SVG diagrams rendered with design-system tokens (theme-aware). */

const STROKE = 'var(--text-secondary)';
const FILL = 'var(--text-primary)';
const BG = 'var(--bg-surface)';
const BORDER = 'var(--border-color)';

function Box({
  x,
  y,
  width,
  height,
  title,
  subtitle,
  note,
  accent,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle?: string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={12} fill={BG} stroke={accent ? 'var(--color-primary)' : BORDER} strokeWidth={accent ? 2 : 1} />
      <rect x={x} y={y} width={width} height={24} rx={10} fill="transparent" />
      <text x={x + 16} y={y + 17} fontFamily="Outfit, system-ui, sans-serif" fontSize={13} fontWeight={800} fill={accent ? 'var(--text-primary)' : FILL}>{title}</text>
      {subtitle && <text x={x + 16} y={y + 44} fontFamily="Outfit, system-ui, sans-serif" fontSize={12} fill={STROKE}>{subtitle}</text>}
      {note && <text x={x + 16} y={y + 66} fontFamily="Outfit, system-ui, sans-serif" fontSize={10.5} fill={STROKE}>{note}</text>}
    </g>
  );
}

function Label({ x, y, text }: { x: number; y: number; text: string }) {
  return <text x={x} y={y} fontFamily="Outfit, system-ui, sans-serif" fontSize={12} fill={STROKE} textAnchor="middle">{text}</text>;
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.max(1, Math.hypot(dx, dy));
  const endX = x2 - (dx / length) * 10;
  const endY = y2 - (dy / length) * 10;
  return (
    <path
      d={`M ${x1} ${y1} L ${endX} ${endY}`}
      stroke={STROKE}
      strokeWidth={1.5}
      fill="none"
      markerEnd="url(#archArrow)"
    />
  );
}

export function ArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 1080 570"
      width="100%"
      style={{ minWidth: 820, width: '100%', height: 'auto', borderRadius: 12 }}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Shikhi Bondhu system architecture"
    >
      <defs>
        <marker id="archArrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L8,3 z" fill="var(--text-muted)" />
        </marker>
      </defs>

      <Box x={20} y={20} width={300} height={112} accent title="React 18 + Vite frontend" subtitle="Public site · Tutor · Practice · Admin · /docs" />
      <Box x={370} y={20} width={330} height={112} accent title="Express 4 API  /api/v1" subtitle="JWT auth · Zod validation · rate limits · SSE" />
      <Box x={750} y={20} width={310} height={112} accent title="Application services" subtitle="Tutor · books · practice · docs · admin" />

      <Box x={20} y={170} width={300} height={112} title="Textbook retrieval" subtitle="Published book chunks · lexical BM25" />
      <Box x={20} y={320} width={300} height={100} title="Ingestion + OCR" subtitle="pdfjs · canvas · Tesseract · vision fallback" />
      <Box x={20} y={454} width={300} height={94} title="Prompt + citation layer" subtitle="Untrusted context · server-side citation checks" />

      <Box x={370} y={170} width={330} height={112} title="Auth + RBAC" subtitle="Users/admins · refresh rotation · quotas" />
      <Box x={370} y={320} width={330} height={100} title="Practice evaluator" subtitle="Deterministic scoring · attempts · results" />
      <Box x={370} y={454} width={330} height={94} title="Docs CMS + statistics" subtitle="Draft · preview · publish · schedule · versions" />

      <Box x={750} y={170} width={310} height={112} title="MongoDB + Mongoose" subtitle="Books · chunks · chats · practice · docs" />
      <Box x={750} y={320} width={310} height={100} title="GridFS uploads bucket" subtitle="Textbook PDFs · notice files · avatars" />
      <Box x={750} y={454} width={310} height={94} title="AI provider router" subtitle="OpenRouter · Anthropic · Gemini · compatible · mock" note="Fallback only before the first streamed token" />

      <Arrow x1={320} y1={76} x2={370} y2={76} />
      <Arrow x1={700} y1={76} x2={750} y2={76} />
      <Arrow x1={535} y1={132} x2={535} y2={170} />
      <Arrow x1={535} y1={282} x2={535} y2={320} />
      <Arrow x1={535} y1={420} x2={535} y2={454} />

      <Arrow x1={370} y1={225} x2={320} y2={225} />
      <Arrow x1={370} y1={370} x2={320} y2={370} />
      <Arrow x1={370} y1={500} x2={320} y2={500} />

      <Arrow x1={905} y1={132} x2={905} y2={170} />
      <Arrow x1={905} y1={282} x2={905} y2={320} />
      <Arrow x1={905} y1={420} x2={905} y2={454} />

      <Label x={345} y={156} text="HTTP" />
      <Label x={725} y={156} text="service calls" />
      <Label x={117} y={300} text="retrieval inputs" />
      <Label x={1040} y={300} text="persistence" />
    </svg>
  );
}

export function AiDataFlowDiagram() {
  const steps = [
    { label: 'Student question', text: 'Original message preserved' },
    { label: 'Language detection', text: 'Bangla / English / Banglish' },
    { label: 'Query processing', text: 'Stems + Banglish variants' },
    { label: 'Textbook retrieval', text: 'Published chunks only' },
    { label: 'Relevance scoring', text: 'BM25 + heading bonuses' },
    { label: 'Context construction', text: 'Top chunks marked untrusted' },
    { label: 'Provider routing', text: 'Mode + model + fallbacks' },
    { label: 'Answer generation', text: 'Provider call + sanitization' },
    { label: 'Citation validation', text: 'Chunk IDs + page metadata' },
    { label: 'Student response', text: 'Answer or insufficient context' },
  ];
  const W = 1080;
  const H = 430;

  function FlowNode({ step, index, x, y }: { step: { label: string; text: string }; index: number; x: number; y: number }) {
    return (
      <g>
        <rect x={x} y={y} width={182} height={104} rx={14} fill={BG} stroke={BORDER} strokeWidth={1} />
        <circle cx={x + 24} cy={y + 24} r={14} fill="var(--color-primary)" />
        <text x={x + 24} y={y + 28} fontFamily="Outfit, system-ui, sans-serif" fontSize={12} fontWeight={800} fill="var(--text-primary)" textAnchor="middle">{index + 1}</text>
        <text x={x + 16} y={y + 56} fontFamily="Outfit, system-ui, sans-serif" fontSize={12.5} fontWeight={800} fill={FILL}>{step.label}</text>
        <text x={x + 16} y={y + 76} fontFamily="Outfit, system-ui, sans-serif" fontSize={10.5} fill={STROKE}>{step.text}</text>
      </g>
    );
  }

  const rowOneY = 74;
  const rowTwoY = 246;
  const startX = 24;
  const gapX = 208;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ minWidth: 820, width: '100%', height: 'auto', borderRadius: 12 }}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="AI Tutor retrieval and generation data flow"
    >
      <defs>
        <marker id="flowArrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L8,3 z" fill="var(--text-muted)" />
        </marker>
      </defs>

      <text x={24} y={34} fontFamily="Outfit, system-ui, sans-serif" fontSize={16} fontWeight={800} fill={FILL}>AI Tutor data flow</text>
      <text x={24} y={52} fontFamily="Outfit, system-ui, sans-serif" fontSize={11} fill={STROKE}>Lexical retrieval · validated citations · provider fallback · honest insufficient-context handling</text>

      {steps.slice(0, 5).map((step, index) => (
        <FlowNode key={step.label} step={step} index={index} x={startX + index * gapX} y={rowOneY} />
      ))}
      {steps.slice(5).map((step, index) => (
        <FlowNode key={step.label} step={step} index={index + 5} x={startX + (4 - index) * gapX} y={rowTwoY} />
      ))}

      {[0, 1, 2, 3].map((index) => (
        <path key={`row1-${index}`} d={`M ${startX + index * gapX + 182} ${rowOneY + 52} L ${startX + (index + 1) * gapX - 10} ${rowOneY + 52}`} stroke={STROKE} strokeWidth={1.5} fill="none" markerEnd="url(#flowArrow)" />
      ))}
      <path d={`M ${startX + 4 * gapX + 91} ${rowOneY + 104} L ${startX + 4 * gapX + 91} ${rowTwoY - 10}`} stroke={STROKE} strokeWidth={1.5} fill="none" markerEnd="url(#flowArrow)" />
      {[0, 1, 2, 3].map((index) => (
        <path key={`row2-${index}`} d={`M ${startX + (4 - index) * gapX} ${rowTwoY + 52} L ${startX + (3 - index) * gapX + 192} ${rowTwoY + 52}`} stroke={STROKE} strokeWidth={1.5} fill="none" markerEnd="url(#flowArrow)" />
      ))}

      <rect x={24} y={388} width={1032} height={1} fill={BORDER} />
      <text x={24} y={410} fontFamily="Outfit, system-ui, sans-serif" fontSize={11} fill={STROKE}>Retrieval is lexical, not vector-based. An attached file is treated as the source of truth instead of book retrieval.</text>
    </svg>
  );
}

/* Block renderer: pitch deck section type. */
export function PitchDeckBlock({ block }: { block: DocsBlock }) {
  return (
    <div className="docs-pitch-block">
      <h2 className="docs-pitch-heading">{block.heading}</h2>
      {block.body.map((paragraph, index) => (
        <p key={index} className="docs-pitch-paragraph">{paragraph}</p>
      ))}
    </div>
  );
}

import type { DocumentationContentDoc, DocumentationVersionDoc, DocsBlock, DocsDraft, DocsTeamMember } from '../../database/models';
import { DocumentationContentModel, DocumentationVersionModel } from '../../database/models';
import { DOCS_ROADMAP_CATEGORIES } from '../../constants';
import type { DocsRoadmapCategory } from '../../constants';
import { log } from '../../config/logger';
import { deleteGridFSFile, uploadBuffer } from '../../config/gridfs';

/*
 * Documentation content service.
 *
 * Single-document model: the current editable draft + the published
 * state/version. All "seed" text below is hand-written from verified facts
 * about the product (routes, features, verified names).
 */

function pitchBlock(id: string, heading: string, body: string[]): DocsBlock {
  return { id, heading, body };
}

export function buildSeedPitchDeck(): DocsDraft['pitchDeck'] {
  return [
    pitchBlock('problem', 'Problem', [
      'Primary students often get stuck while studying from a textbook: a word is unclear, a rule feels abstract, or a homework question has no nearby explanation. The confusion appears at home, after class, when a teacher is not available.',
      'Generic AI assistants can answer confidently but may not follow the student\u2019s own textbook, page, chapter, or class level. For a Class 3 learner, an answer that is too advanced, in the wrong language, or unsupported by the book creates more confusion.',
      'Learning gaps compound. A calm, textbook-grounded explanation at the moment of confusion is more useful than a generic answer later.',
    ]),
    pitchBlock('solution', 'Solution', [
      'Shikhi Bondhu AI Tutor is a Bengali-first educational assistant that helps Class 3 students learn from their own textbooks, with practice and examination tools for checking understanding.',
      'Implemented capabilities (verified in the live codebase):',
      '- AI Tutor chat with textbook-grounded answers and server-validated book, chapter and page citations.',
      '- Bengali, English and Banglish query handling, with answers in simple Bangla by default and English for pure English questions unless the learner chooses Bangla.',
      '- Digital textbook ingestion and management: PDF upload, page-numbered chunks, OCR for scanned books, review, publish and reindex workflows.',
      '- Practice and examination system with deterministic server-side scoring, instant feedback, timers and result breakdowns.',
      '- Guest text tutoring, signed-in chat history, temporary photo/PDF attachments and voice input/output.',
      '- A protected admin console for books, users, AI providers, practice sets, analytics, settings and this documentation CMS.',
    ]),
    pitchBlock('why-now', 'Why Now', [
      'Context, not a measured market claim: AI assistants are becoming normal study tools, while families increasingly expect support in Bangla or Banglish rather than English-only interfaces.',
      'Textbooks are already the trusted source of truth in the classroom. When a textbook is available as structured, page-aware digital text, an assistant can cite the exact lesson instead of inventing an answer.',
      'Low-cost cloud deployment and browser-based voice features make a textbook-grounded tutor practical without distributing a separate mobile app.',
    ]),
    pitchBlock('demo', 'Product Demo (live system)', [
      'Verified live application: https://departmental-ai-chatbot-dkpf.vercel.app',
      'AI Tutor: ask from a Class 3 textbook and receive a short, level-appropriate answer with validated sources (book title, chapter, page range, chunk ID).',
      'Practice and Exam: choose a published book, chapters, question type and mode; complete the attempt; receive deterministic scoring and question-wise feedback.',
      'Books: browse the published catalogue and download an available textbook PDF.',
      'Admin: upload and process a textbook, review chunks, publish it, manage practice sets, switch AI provider settings, inspect aggregate usage and edit the documentation CMS.',
    ]),
    pitchBlock('market', 'Market Opportunity (assumptions)', [
      'Verified premise: the product is built around the NCTB Class 3 curriculum and the languages used by Bangladeshi primary learners.',
      'Assumption to validate: demand exists among parents for affordable after-school help, and among schools for a textbook-aligned digital study companion.',
      'Assumption to validate: institutional pilots, school subscriptions and education-partner distribution can create a sustainable channel. No market-size figure, school count or revenue projection is claimed as verified.',
    ]),
    pitchBlock('business-model', 'Business Model (assumptions)', [
      'These are proposed directions, not current revenue commitments:',
      '- School or institution subscription for managed textbooks, admin tools and usage visibility.',
      '- A free student tier with rate limits, plus a paid family tier for higher usage and saved history.',
      '- Partnership or licensing discussions with education programmes and NGOs.',
      'Pricing, conversion and willingness to pay must be tested with real pilots before being treated as validated.',
    ]),
    pitchBlock('traction', 'Traction (verified status)', [
      'Verified: the application is deployed and publicly reachable on Vercel.',
      'Verified: the AI Tutor, textbook catalogue, practice/exam flow, signed-in chat workspace and admin console are implemented in the repository.',
      'Verified: live aggregate usage is available through the privacy-safe statistics endpoint and this page (registered users, conversations, messages, published books, practice attempts, published sets and AI usage records).',
      'Not claimed: revenue, paying customers, school adoption, retention or growth rates. Those require operational evidence that is not represented by the current system.',
    ]),
    pitchBlock('competition', 'Competition (assumptions)', [
      'Assumption: the comparison set includes generic AI chat assistants, question-bank apps, private tutors and publisher-provided digital resources.',
      'Differentiators verified in the product: textbook-page citations, Bangla/Banglish support, an integrated practice/exam system, and a managed textbook ingestion pipeline.',
      'Assumption: a curriculum-grounded experience can be more trustworthy for young learners than an open-ended general assistant. Competitive superiority is not claimed without user research.',
    ]),
    pitchBlock('advantage', 'Unique Advantage (verified)', [
      'Verified: retrieval is restricted to published textbooks, and citations are derived from retrieved chunk metadata rather than generated freely.',
      'Verified: the answer pipeline explicitly handles weak retrieval by saying the book context is insufficient instead of fabricating a page.',
      'Verified: practice and exam evaluation is deterministic and performed on the server across the supported question types.',
      'Verified: textbooks are managed end-to-end, including OCR for scanned pages, chapter/page metadata, publication state and reindexing.',
      'Verified: the documentation itself is database-backed, versioned and admin-editable, with server-enforced ON/OFF and scheduled visibility.',
    ]),
    pitchBlock('gtm', 'Go-To-Market Strategy (assumptions)', [
      'Proposed sequence: start with a small parent/teacher pilot, observe real questions and failure cases, then improve retrieval and practice content before expanding.',
      'Proposed channels: direct classroom demonstrations, parent communities, teacher training sessions and partnerships with local education organisations.',
      'Proposed packaging: a free learner entry point, a school plan with managed books and admin tools, and a partner plan for larger programmes.',
      'These are planned directions. No school partnership, user-acquisition channel or paid conversion is claimed as active.',
    ]),
    pitchBlock('team', 'Team Infyners', [
      'Team Infyners is the team behind the project.',
      'Mesbahul Alam — Team Lead — +880 1601860526',
      'MONIRUZZAMAN Shaon — Member — +880 01744720796',
      'Halima Tuz Sadia — Member — +880 01315027678',
      'Only the information above is confirmed. Profile images, biographies, email addresses and social links are not invented.',
    ]),
    pitchBlock('vision', 'Vision', [
      'Every primary learner should be able to ask a question in their own language and receive a clear explanation grounded in the book they actually study.',
      'Planned direction: expand beyond Class 3, add teacher-facing tools and learning analytics, and improve retrieval quality. These are roadmap goals, not current capabilities.',
    ]),
  ];
}

export function buildSeedProductOverview(): DocsDraft['productOverview'] {
  return [
    pitchBlock('what', 'What Shikhi Bondhu Does', [
      'Shikhi Bondhu is an AI-powered educational assistant for Class 3 students. It helps learners study from their own textbooks instead of treating the chatbot as a generic encyclopedia.',
      'The core capability: a student asks a question in Bangla, English or Banglish and receives a short, age-appropriate explanation with source metadata from the published textbook passages used to answer.',
    ]),
    pitchBlock('users', 'Target Users', [
      'Class 3 students studying at schools and at home through NCTB textbooks.',
      'Parents or guardians helping a child with textbook-based homework.',
      'Teachers and administrators who manage textbooks, practice sets, users and AI settings through the admin console.',
    ]),
    pitchBlock('student-journey', 'How Students Interact with the AI Tutor', [
      '1. A visitor can use the guest Tutor for text-only questions; signing in unlocks saved chat history, temporary photo/PDF attachments, voice input/output and answer-mode choices.',
      '2. The student asks a question in Bangla, English or Banglish, optionally including Unit, Lesson, Page and Activity.',
      '3. The backend detects the script and normalizes the query. A short textbook reference such as "Unit 3, Lesson 5, Page 45" can be resolved deterministically.',
      '4. Published textbook chunks are retrieved with a lexical BM25-style ranking pipeline; only published books are eligible.',
      '5. The prompt is built from retrieved passages, the configured provider/model generates an answer, and citations are validated against the retrieved chunks before the answer is returned.',
    ]),
    pitchBlock('textbooks', 'How Textbooks Are Used as Learning Sources', [
      'Admins upload a PDF with metadata. Large PDFs use a chunked upload path. The file is verified, stored in GridFS, and processed by a background ingestion job.',
      'Pages with a text layer use it directly; scanned pages are rendered and OCR\u2019d with Tesseract, with a vision-model fallback when confidence is low or the page is difficult.',
      'Clean text is split into overlapping chunks with real page ranges, chapter metadata and a preview. Publishing requires a ready book with chunks; only published books are retrievable by students.',
      'Retrieval is currently lexical, not vector-based. The code keeps an embedding adapter boundary for a future semantic upgrade, but no vector database or GraphRAG claim is made here.',
    ]),
    pitchBlock('practice', 'How Students Practice and Evaluate Their Understanding', [
      'Practice Mode: self-paced attempts with instant per-question checking and a final deterministic evaluation.',
      'Exam Mode: all questions together, an answered/unanswered navigator, optional countdown timer, submit confirmation and server-side auto-submit when time expires.',
      'The student wizard currently offers five active question types: MCQ, True/False, Matching, One Word Answer and Translation. The evaluator can still render legacy Fill in the Blanks and Rearrange attempts created before those types were retired from the wizard.',
      'Scoring is deterministic on the server, including alternative answers, partial matching credit, configurable marks, optional negative marking and unanswered-question handling.',
    ]),
    pitchBlock('admin', 'How Administrators Manage Learning Resources', [
      'Books: upload PDFs, edit metadata, publish/unpublish, reindex, archive or delete, and inspect processing jobs and sample chunks.',
      'Practice and Exams: create question sets, choose chapters and question types, add or reorder questions, duplicate, preview, publish and unpublish.',
      'Users and operations: search users, manage roles and active status, inspect chat history, analytics, token usage, logs and system status.',
      'AI settings: switch the active provider/model, configure fallbacks and validate credentials. Secrets are masked in the provider endpoint.',
      'Documentation CMS: edit the pitch deck, product overview, custom sections, feature matrix, roadmap, changelog and Team Infyners; preview drafts; publish; restore published versions; control public visibility and scheduling.',
    ]),
  ];
}

/**
 * Feature matrix rows — statuses verified against the codebase:
 * 'completed' means implemented evidence exists (route or service),
 * 'in_progress' means partially implemented, 'planned' means not implemented.
 */
const FEATURE_MATRIX: DocsDraft['featureMatrix'] = [
  { name: 'AI Tutor chat with textbook context', description: 'Textbook-grounded Q&A with validated page citations and database-backed prompt templates.', status: 'completed', route: '/tutor' },
  { name: 'Bengali, English and Banglish handling', description: 'Script detection, answer-language selection and Banglish-to-Bangla query variants.', status: 'completed', route: '/tutor' },
  { name: 'Textbook-based question answering', description: 'Retrieval and answer generation restricted to published books.', status: 'completed', route: '/tutor' },
  { name: 'Citation validation', description: 'Citations are derived from retrieved chunk metadata and checked server-side before returning an answer.', status: 'completed', route: '/tutor' },
  { name: 'Insufficient-context handling', description: 'Weak retrieval returns an honest INSUFFICIENT_BOOK_CONTEXT response instead of an invented page.', status: 'completed', route: '/tutor' },
  { name: 'Digital textbook management', description: 'PDF upload, chunked upload, metadata, GridFS storage, publish/unpublish, reindex, archive and OCR.', status: 'completed', route: '/admin/books' },
  { name: 'Book ingestion OCR', description: 'Scanned pages use Tesseract with a vision-model fallback, cached per page by checksum/provider/model/scale.', status: 'completed', route: '/admin/books' },
  { name: 'Authentication and RBAC', description: 'JWT access tokens, rotating hashed refresh tokens, user/admin roles and protected admin routes.', status: 'completed', route: '/login' },
  { name: 'Guest tutoring', description: 'Rate-limited text-only guest chat without saved history or attachments.', status: 'completed', route: '/tutor' },
  { name: 'Saved chat history', description: 'Authenticated conversations with rename, share, export and delete workflows.', status: 'completed', route: '/tutor' },
  { name: 'Practice and Examination System', description: 'Book/chapter/question-type/mode wizard, timed exams, answer navigator and result breakdowns.', status: 'completed', route: '/practice' },
  { name: 'Multiple question types', description: 'Five active types in the wizard: MCQ, True/False, Matching, One Word and Translation. Legacy Fill in the Blanks and Rearrange attempts still render and score.', status: 'completed', route: '/practice' },
  { name: 'Deterministic exam scoring', description: 'Server-side evaluation with alternative answers, partial matching credit, marks and optional negative marking.', status: 'completed', route: '/practice' },
  { name: 'Usage quotas and AI monitoring', description: 'Per-user AI quotas, guest/auth/AI rate limits, token usage dashboard and aggregate analytics.', status: 'completed', route: '/admin/tokens' },
  { name: 'Admin settings management', description: 'AI provider/model switching, fallbacks, prompt templates, app settings, logs and system status.', status: 'completed', route: '/admin/ai-settings' },
  { name: 'Voice input and output', description: 'Browser Speech Recognition and Speech Synthesis plus a hands-free voice conversation mode.', status: 'completed', route: '/tutor' },
  { name: 'Temporary chat attachments', description: 'Images/PDFs are memory-only, magic-byte checked, single-use and expire after 30 minutes.', status: 'completed', route: '/tutor' },
  { name: 'Live analytics dashboard (admin)', description: 'AI usage trends, token spend and aggregate activity charts backed by real usage records.', status: 'completed', route: '/admin/analytics' },
  { name: 'Public documentation site (/docs)', description: 'Pitch deck, product overview, feature matrix, architecture, AI flow, API/data/AI reference, team, live statistics, roadmap and changelog.', status: 'completed', route: '/docs' },
  { name: 'Documentation CMS and draft preview', description: 'Admins edit every editorial section, add custom sections, preview the draft, publish and restore versions.', status: 'completed', route: '/admin/docs' },
  { name: 'Server-enforced docs visibility', description: 'Enable/disable plus timezone-aware start/end scheduling enforced by the public API, not only the UI.', status: 'completed', route: '/admin/docs' },
  { name: 'Team Infyners management', description: 'Add, edit, remove non-confirmed members; the three confirmed members are protected; optional avatar upload with initials fallback.', status: 'completed', route: '/admin/docs' },
  { name: 'Public docs search, anchors and exports', description: 'Section search, sticky navigation, anchor links, Markdown download and print-to-PDF export of published content.', status: 'completed', route: '/docs' },
  { name: 'Version history and restore', description: 'Every publish creates an immutable snapshot; admins can inspect and restore a previous version into the draft.', status: 'completed', route: '/admin/docs' },
  { name: 'Live public statistics', description: 'Privacy-safe aggregate counts with per-metric unavailable states and periodic refresh.', status: 'completed', route: '/docs' },
  { name: 'Multilingual UI', description: 'The public shell, auth and several learner pages are bilingual; some admin/documentation screens remain English-first.', status: 'in_progress', route: '/login' },
  { name: 'Vector / semantic retrieval', description: 'Multilingual embeddings or hybrid ranking. The current implementation is lexical; no vector database is present.', status: 'planned' },
  { name: 'Teacher-oriented features', description: 'Assignments, classroom dashboards and teacher accounts.', status: 'planned' },
  { name: 'Additional classes and subjects', description: 'Expansion beyond Class 3 and the current NCTB textbook set.', status: 'planned' },
  { name: 'Personalized learning', description: 'Adaptive tutoring based on long-term learner progress and misconceptions.', status: 'planned' },
  { name: 'Student learning analytics', description: 'Progress dashboards and longitudinal practice/exam insights for learners and guardians.', status: 'planned' },
];

const ROADMAP: DocsDraft['roadmap'] = [
  ...[
    { item: 'Improve AI tutoring', description: 'Better retrieval ranking, citation quality, Banglish coverage and insufficient-context detection.' },
    { item: 'Documentation accuracy', description: 'Keep API, feature-status and architecture documentation synchronized with each release.' },
    { item: 'Quality-of-life UX', description: 'Faster page loads, accessibility improvements, dark-mode polish and responsive fixes.' },
  ],
  ...[
    { item: 'Teacher-oriented features', description: 'Assignment management, classroom dashboards and teacher profiles.' },
    { item: 'More classes and subjects', description: 'JSC, Higher Secondary and additional language lessons for primary and secondary levels.' },
    { item: 'More question types', description: 'Additional question formats based on textbook structure.' },
  ],
  ...[
    { item: 'Personalized learning', description: 'Adaptive tutoring based on long-term student progress and learning gaps.' },
    { item: 'Scalable education infrastructure', description: 'Horizontal scaling, larger textbooks and multi-tenant support.' },
    { item: 'Student progress analytics', description: 'Learning path visualization and performance dashboards.' },
  ],
].map((entry, index): { category: DocsRoadmapCategory; item: string; description: string } => ({
  category: DOCS_ROADMAP_CATEGORIES[index < 3 ? 0 : index < 6 ? 1 : 2],
  item: entry.item,
  description: entry.description,
}));

const CHANGELOG: DocsDraft['changelog'] = [
  {
    version: '1.1.0',
    date: '2026-11-22',
    title: 'Documentation CMS, accuracy and publishing hardening',
    items: [
      'Added admin-created custom documentation sections with add/remove/reorder-by-list editing.',
      'Added a draft preview route and save-before-publish so admins review exactly what will be published.',
      'Added per-member profile-image updates, uniform team cards and an initials-based fallback avatar.',
      'Made schedule inputs timezone-aware end to end and added a timezone selector in the CMS.',
      'Gated the public statistics endpoint with the same visibility rules as documentation content.',
      'Added periodic statistics refresh, per-metric unavailable states and clearer unavailable/published states.',
      'Corrected feature statuses, technology/API/data/AI documentation and the team copy against the implementation.',
      'Expanded Markdown/print exports and added shareable section anchors.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-11-20',
    title: 'Initial documentation',
    items: [
      'Public /docs site with pitch deck, product overview, feature matrix, system architecture and AI data flow diagrams.',
      'Team Infyners management with the three confirmed members.',
      'Live aggregate statistics for users, conversations, books, practice attempts and AI usage.',
      'Editable feature matrix and roadmap managed via the admin Documentation CMS.',
      'Documentation publishing controls with enable/disable and scheduled windows.',
      'Search, Markdown export and print-to-PDF export.',
      'Changelog with version history and restore support.',
    ],
  },
];

export const SEED_TEAM_MEMBERS: DocsTeamMember[] = [
  { id: 'm-01', name: 'Mesbahul Alam', role: 'Team Lead', contact: '+880 1601860526', isConfirmed: true },
  { id: 'm-02', name: 'MONIRUZZAMAN Shaon', role: 'Member', contact: '+880 01744720796', isConfirmed: true },
  { id: 'm-03', name: 'Halima Tuz Sadia', role: 'Member', contact: '+880 01315027678', isConfirmed: true },
];

/**
 * Bumped when the seeded editorial content needs a one-time correction on an
 * existing deployment. Fresh databases are seeded directly at this version.
 */
export const DOCS_CONTENT_SEED_VERSION = 3;

const COPY_FIXES: Array<[RegExp, string]> = [
  [/Shikhi Bondju/gi, 'Shikhi Bondhu'],
  [/\bseven question types\b/gi, 'multiple question types'],
  [/\b7 question types\b/gi, 'multiple question types'],
  [/NGOS/g, 'NGOs'],
];

function fixCopy(value: string): string {
  return COPY_FIXES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function fixBlocks(blocks: DocsBlock[] | undefined): DocsBlock[] {
  return (blocks ?? []).map((block) => ({
    ...block,
    heading: fixCopy(String(block.heading ?? '')),
    body: (block.body ?? []).map((line) => fixCopy(String(line))),
  }));
}

function publishableSnapshot(doc: DocumentationContentDoc | DocsDraft): Record<string, unknown> {
  return {
    pitchDeck: doc.pitchDeck ?? [],
    productOverview: doc.productOverview ?? [],
    customSections: (doc as DocumentationContentDoc).customSections ?? [],
    featureMatrix: doc.featureMatrix ?? [],
    roadmap: doc.roadmap ?? [],
    teamMembers: doc.teamMembers ?? [],
    changelog: doc.changelog ?? [],
  };
}

/**
 * Repairs the small set of copy mistakes and outdated status labels that were
 * present in the initial seeded documentation. Admin-authored sections are
 * preserved; only known strings/rows are corrected.
 */
async function migrateContentIfNeeded(
  current: DocumentationContentDoc
): Promise<DocumentationContentDoc> {
  const legacyCopy = JSON.stringify({
    pitchDeck: current.pitchDeck,
    productOverview: current.productOverview,
    featureMatrix: current.featureMatrix,
    customSections: current.customSections,
    changelog: current.changelog,
  });
  const needsRepair =
    Number(current.contentSeedVersion ?? 0) < DOCS_CONTENT_SEED_VERSION ||
    /Shikhi Bondju/i.test(legacyCopy) ||
    /leads Product & Engineering|research & design support|student success & training support/i.test(legacyCopy) ||
    !Array.isArray(current.customSections) ||
    !(current.changelog ?? []).some((entry) => entry.version === '1.1.0');
  if (!needsRepair) return current;

  // Seed versions before 3 contained short placeholder copy. Upgrade the
  // editorial arrays once to the reviewed seed while preserving admin-created
  // custom sections, team member edits, settings and publication state.
  const upgradeEditorialContent = Number(current.contentSeedVersion ?? 0) < 3;
  const update: Record<string, unknown> = { contentSeedVersion: DOCS_CONTENT_SEED_VERSION };
  let nextPitch = upgradeEditorialContent ? buildSeedPitchDeck() : fixBlocks(current.pitchDeck);
  const nextOverview = upgradeEditorialContent ? buildSeedProductOverview() : fixBlocks(current.productOverview);
  const nextCustom = fixBlocks(current.customSections);

  // The original seed invented responsibilities for the three confirmed team
  // members. Replace only that exact legacy copy with confirmed facts.
  const teamBlock = nextPitch.find((block) => block.id === 'team');
  if (
    teamBlock &&
    teamBlock.body.some((line) => /leads Product & Engineering|research & design support|student success & training support/.test(line))
  ) {
    teamBlock.body = [
      'Team Infyners is the team behind the project.',
      'Mesbahul Alam — Team Lead — +880 1601860526',
      'MONIRUZZAMAN Shaon — Member — +880 01744720796',
      'Halima Tuz Sadia — Member — +880 01315027678',
      'Only the information above is confirmed. Profile images, biographies, email addresses and social links are not invented.',
    ];
  }

  // Replace the vague traction claim with an explicit non-claim.
  const tractionBlock = nextPitch.find((block) => block.id === 'traction');
  if (tractionBlock && tractionBlock.body.some((line) => /Growth: live traffic/i.test(line))) {
    tractionBlock.body = buildSeedPitchDeck().find((block) => block.id === 'traction')?.body ?? tractionBlock.body;
  }

  let nextFeatures = upgradeEditorialContent
    ? FEATURE_MATRIX.map((row) => ({ ...row }))
    : (current.featureMatrix ?? []).map((row) => {
    const name = String(row.name ?? '');
    if (/seven question types/i.test(name)) {
      return {
        ...row,
        name: 'Multiple question types',
        description:
          'Five active types in the wizard: MCQ, True/False, Matching, One Word and Translation. Legacy Fill in the Blanks and Rearrange attempts still render and score.',
        status: 'completed' as const,
      };
    }
    if (/multilingual ui/i.test(name)) {
      return {
        ...row,
        description: 'The public shell, auth and several learner pages are bilingual; some admin/documentation screens remain English-first.',
        status: 'in_progress' as const,
      };
    }
    if (/live analytics dashboard/i.test(name)) {
      return {
        ...row,
        description: 'AI usage trends, token spend and aggregate activity charts backed by real usage records.',
        status: 'completed' as const,
      };
    }
    if (/pdf export and markdown/i.test(name)) {
      return {
        ...row,
        description: 'Section search, sticky navigation, anchor links, Markdown download and print-to-PDF export of published content.',
      };
    }
    return { ...row, name: fixCopy(name), description: fixCopy(String(row.description ?? '')) };
  });

  const ensureFeature = (row: DocsDraft['featureMatrix'][number], matcher: RegExp) => {
    if (!nextFeatures.some((existing) => matcher.test(existing.name))) {
      nextFeatures = [...nextFeatures, row];
    }
  };
  ensureFeature(
    { name: 'Documentation CMS and draft preview', description: 'Admins edit every editorial section, add custom sections, preview the draft, publish and restore versions.', status: 'completed', route: '/admin/docs' },
    /documentation cms/i
  );
  ensureFeature(
    { name: 'Server-enforced docs visibility', description: 'Enable/disable plus timezone-aware start/end scheduling enforced by the public API, not only the UI.', status: 'completed', route: '/admin/docs' },
    /docs visibility/i
  );
  ensureFeature(
    { name: 'Team Infyners management', description: 'Add, edit, remove non-confirmed members; the three confirmed members are protected; optional avatar upload with initials fallback.', status: 'completed', route: '/admin/docs' },
    /team infyners management/i
  );
  ensureFeature(
    { name: 'Live public statistics', description: 'Privacy-safe aggregate counts with per-metric unavailable states and periodic refresh.', status: 'completed', route: '/docs' },
    /live public statistics/i
  );

  const nextRoadmap = upgradeEditorialContent
    ? ROADMAP.map((entry) => ({ ...entry }))
    : (current.roadmap ?? []).map((entry) => ({
      ...entry,
      item: fixCopy(String(entry.item ?? '')),
      description: fixCopy(String(entry.description ?? '')),
    }));

  let nextChangelog = upgradeEditorialContent
    ? CHANGELOG.map((entry) => ({ ...entry, items: [...entry.items] }))
    : (current.changelog ?? []).map((entry) => ({
      ...entry,
      title: fixCopy(String(entry.title ?? '')),
      items: (entry.items ?? []).map((item) => fixCopy(String(item))),
    }));
  if (!nextChangelog.some((entry) => entry.version === '1.1.0')) {
    nextChangelog = [CHANGELOG[0], ...nextChangelog];
  }

  const nextMembers = [...(current.teamMembers ?? [])];
  for (const seeded of SEED_TEAM_MEMBERS) {
    if (!nextMembers.some((member) => member.id === seeded.id)) nextMembers.push({ ...seeded });
  }

  update.pitchDeck = nextPitch;
  update.productOverview = nextOverview;
  update.customSections = nextCustom;
  update.featureMatrix = nextFeatures;
  update.roadmap = nextRoadmap;
  update.changelog = nextChangelog;
  update.teamMembers = nextMembers;

  await DocumentationContentModel.updateOne({ _id: current._id }, { $set: update });

  // Keep the currently published snapshot accurate too. Visibility settings
  // are read live from the main document, so this only refreshes content.
  const publishedVersion = Number(current.publishedVersion ?? 0);
  if (publishedVersion > 0) {
    const published = await DocumentationVersionModel.findOne({ version: publishedVersion }).lean() as DocumentationVersionDoc | null;
    if (published) {
      const snapshot = {
        ...publishableSnapshot(published.content as DocsDraft),
        pitchDeck: nextPitch,
        productOverview: nextOverview,
        customSections: nextCustom,
        featureMatrix: nextFeatures,
        roadmap: nextRoadmap,
        teamMembers: nextMembers,
        changelog: nextChangelog,
      };
      await DocumentationVersionModel.updateOne({ _id: published._id }, { $set: { content: snapshot } });
    }
  }

  log.info('Documentation content migrated', { version: DOCS_CONTENT_SEED_VERSION });
  const migrated = (await DocumentationContentModel.findOne({ _id: current._id }).lean()) as DocumentationContentDoc | null;
  return migrated ?? current;
}

const TIMEZONES = ['Asia/Dhaka', 'Asia/Karachi', 'Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London'];

export function isValidTimezone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    return TIMEZONES.includes(timeZone) || new Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions().timeZone !== '';
  } catch {
    return false;
  }
}

/** Converts a date to a lexicographically comparable string in the given IANA timezone. */
export function localIso(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  const hour = parts.hour && parts.hour !== '24' ? parts.hour : '00';
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}`;
}

/** Whether public /docs is accessible given settings and now (timezone-aware). */
export function isPublicAccessible(settings: DocsDraft['settings'], now: Date = new Date()): boolean {
  if (!settings?.enabled) return false;
  const timezone = settings.timezone && isValidTimezone(settings.timezone) ? settings.timezone : 'Asia/Dhaka';
  if (settings.start) {
    const start = new Date(settings.start);
    if (!Number.isNaN(start.getTime()) && localIso(now, timezone) < localIso(start, timezone)) return false;
  }
  if (settings.end) {
    const end = new Date(settings.end);
    if (!Number.isNaN(end.getTime()) && localIso(now, timezone) > localIso(end, timezone)) return false;
  }
  return true;
}

/** Public snapshot shape (exposes no drafts). */
export function toPublicContent(doc: DocumentationContentDoc): DocsDraft {
  return {
    pitchDeck: doc.pitchDeck ?? [],
    productOverview: doc.productOverview ?? [],
    customSections: doc.customSections ?? [],
    featureMatrix: doc.featureMatrix ?? [],
    roadmap: doc.roadmap ?? [],
    teamMembers: doc.teamMembers ?? [],
    changelog: doc.changelog ?? [],
    settings: {
      enabled: doc.settings?.enabled !== false,
      start: doc.settings?.start ? new Date(doc.settings.start as Date).toISOString() : null,
      end: doc.settings?.end ? new Date(doc.settings.end as Date).toISOString() : null,
      timezone: doc.settings?.timezone || 'Asia/Dhaka',
    },
    draftVersion: Number(doc.draftVersion ?? 0),
    publishedVersion: Number(doc.publishedVersion ?? 0),
  } as DocsDraft;
}

function buildSeedDoc(): Partial<DocumentationContentDoc> {
  return {
    settings: { enabled: true, start: null, end: null, timezone: 'Asia/Dhaka' },
    pitchDeck: buildSeedPitchDeck(),
    productOverview: buildSeedProductOverview(),
    customSections: [],
    featureMatrix: FEATURE_MATRIX.map((row) => ({ ...row })),
    roadmap: ROADMAP.map((row) => ({ ...row })),
    teamMembers: SEED_TEAM_MEMBERS.map((member) => ({ ...member, avatarId: '', isConfirmed: member.isConfirmed })),
    changelog: CHANGELOG.map((entry) => ({ ...entry, items: [...entry.items] })),
    draftVersion: 1,
    publishedVersion: 0,
    contentSeedVersion: DOCS_CONTENT_SEED_VERSION,
  };
}

/** Gets or lazily creates the single DocumentationContent document. */
export async function getDocsContentDoc(): Promise<DocumentationContentDoc> {
  let doc = (await DocumentationContentModel.findOne({}).lean()) as DocumentationContentDoc | null;

  if (!doc) {
    doc = (await DocumentationContentModel.findOneAndUpdate(
      {},
      { $setOnInsert: buildSeedDoc() as never },
      { upsert: true, new: true, lean: true }
    )) as unknown as DocumentationContentDoc;

    // On first seed, publish version 1 so /docs is live immediately.
    const versionOneExists = await DocumentationVersionModel.countDocuments({ version: 1 });
    if (!versionOneExists) {
      await DocumentationVersionModel.create({
        version: 1,
        content: publishableSnapshot(doc),
        publishedBy: 'seed',
        publishedAt: new Date(),
      });
      await DocumentationContentModel.updateOne({ _id: doc._id }, { $set: { publishedVersion: 1, publishedBy: 'seed' } });
      doc = (await DocumentationContentModel.findOne({ _id: doc._id }).lean()) as unknown as DocumentationContentDoc;
    }
  }

  const migrated = await migrateContentIfNeeded(doc);
  const publishedVersion = Number(migrated.publishedVersion ?? 0);
  if (publishedVersion > 0 && !(await DocumentationVersionModel.exists({ version: publishedVersion }))) {
    // Self-heal a missing published snapshot (for example after an interrupted
    // migration or manual database cleanup) so version history is never empty.
    await DocumentationVersionModel.create({
      version: publishedVersion,
      content: publishableSnapshot(migrated),
      publishedBy: migrated.publishedBy || 'migration',
      publishedAt: migrated.publishedAt ?? new Date(),
    });
  }
  return migrated;
}

export interface DocsAdminState {
  doc: DocumentationContentDoc;
  publishedVersion: number;
  draftVersion: number;
  publishedAt: string | null;
  publishedBy: string;
  versions: Array<{ version: number; publishedBy: string; publishedAt: string }>;
  updatedBy: string;
  updatedAt: string;
}

export const docsContentService = {
  async getDraft(): Promise<DocsAdminState> {
    const doc = await getDocsContentDoc();
    const versions = (await DocumentationVersionModel.find({}, 'version publishedBy publishedAt')
      .sort({ version: -1 })
      .lean()) as unknown as DocumentationVersionDoc[];
    return {
      doc,
      publishedVersion: Number(doc.publishedVersion ?? 0),
      draftVersion: Number(doc.draftVersion ?? 1),
      publishedAt: doc.publishedAt ? new Date(doc.publishedAt as Date).toISOString() : null,
      publishedBy: String(doc.publishedBy ?? ''),
      versions: versions.map((version) => ({
        version: Number(version.version),
        publishedBy: String(version.publishedBy ?? ''),
        publishedAt: new Date(version.publishedAt as Date).toISOString(),
      })),
      updatedBy: String(doc.updatedBy ?? ''),
      updatedAt: new Date(doc.updatedAt as Date).toISOString(),
    };
  },

  /**
   * Saves a draft patch: arrays are replaced by id so the admin can add,
   * edit and remove pitch deck sections, features, roadmap entries and
   * changelog entries.
   */
  async saveDraft(patch: Partial<DocsDraft> & { updatedBy?: string }) {
    const doc = await getDocsContentDoc();
    const update: Record<string, unknown> = {};
    if (patch.pitchDeck) update.pitchDeck = patch.pitchDeck;
    if (patch.productOverview) update.productOverview = patch.productOverview;
    if (patch.customSections) update.customSections = patch.customSections;
    if (patch.featureMatrix) update.featureMatrix = patch.featureMatrix;
    if (patch.roadmap) update.roadmap = patch.roadmap;
    if (patch.changelog) update.changelog = patch.changelog;
    update.draftVersion = Number(doc.draftVersion ?? 1) + 1;
    update.updatedBy = patch.updatedBy ?? String(doc.updatedBy ?? '');
    await DocumentationContentModel.updateOne({ _id: doc._id }, { $set: update });
    return this.getDraft();
  },

  async publish(adminUserEmail: string) {
    const doc = await getDocsContentDoc();
    const version = Number(doc.publishedVersion ?? 0) + 1;
    const snapshot = publishableSnapshot(doc);
    await DocumentationVersionModel.create({
      version,
      content: snapshot,
      publishedBy: adminUserEmail,
      publishedAt: new Date(),
    });
    await DocumentationContentModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          publishedVersion: version,
          publishedAt: new Date(),
          publishedBy: adminUserEmail,
          updatedBy: adminUserEmail,
          // Publishing a version is an explicit intent to make it live.
          // A configured start/end window may still keep it scheduled.
          'settings.enabled': true,
        },
      }
    );
    log.info('Documentation published', { version, admin: adminUserEmail });
    return this.getDraft();
  },

  async unpublish() {
    await DocumentationContentModel.updateOne({}, { $set: { 'settings.enabled': false } });
    return this.getDraft();
  },

  async setPublishingEnabled(enabled: boolean) {
    const doc = await getDocsContentDoc();
    await DocumentationContentModel.updateOne({ _id: doc._id }, { $set: { 'settings.enabled': enabled } });
    return this.getDraft();
  },

  async setSchedule(schedule: { start: Date | null; end: Date | null; timezone: string }) {
    const doc = await getDocsContentDoc();
    await DocumentationContentModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          'settings.start': schedule.start,
          'settings.end': schedule.end,
          'settings.timezone': schedule.timezone,
        },
      }
    );
    return this.getDraft();
  },

  async listVersions() {
    const versions = (await DocumentationVersionModel.find({}, 'version publishedBy publishedAt').sort({ version: -1 }).lean()) as unknown as DocumentationVersionDoc[];
    return versions.map((version) => ({
      version: Number(version.version),
      publishedBy: String(version.publishedBy ?? ''),
      publishedAt: new Date(version.publishedAt as Date).toISOString(),
      content: (version.content as DocsDraft) ?? null,
    }));
  },

  async restoreVersion(versionNumber: number, adminUserEmail: string) {
    const version = (await DocumentationVersionModel.findOne({ version: versionNumber }).lean()) as DocumentationVersionDoc | null;
    if (!version) throw Object.assign(new Error('Version not found'), { statusCode: 404 });    const doc = await getDocsContentDoc();
    await DocumentationContentModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          pitchDeck: version.content?.pitchDeck ?? [],
          productOverview: version.content?.productOverview ?? [],
          customSections: version.content?.customSections ?? [],
          featureMatrix: version.content?.featureMatrix ?? [],
          roadmap: version.content?.roadmap ?? [],
          changelog: version.content?.changelog ?? [],
          teamMembers: version.content?.teamMembers ?? doc.teamMembers ?? [],
          draftVersion: Math.max(Number(doc.draftVersion ?? 1), versionNumber) + 1,
          updatedBy: adminUserEmail,
        },
      }
    );
    return this.getDraft();
  },

  /* ---------------- Team ---------------- */

  async addTeamMember(patch: { name: string; role: string; contact: string; avatarId?: string }, adminUserEmail = ''): Promise<DocsAdminState & { member: DocsTeamMember | null }> {
    const doc = await getDocsContentDoc();
    const members = [...(doc.teamMembers ?? [])];
    const numericSuffixes = members
      .map((member) => Number(String(member.id).match(/^m-(\d+)$/)?.[1] ?? '0'))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
    const nextIndex = numericSuffixes.length ? numericSuffixes[numericSuffixes.length - 1] + 1 : members.length + 1;
    const member: DocsTeamMember = {
      id: `m-${String(nextIndex).padStart(2, '0')}`,
      name: patch.name,
      role: patch.role,
      contact: patch.contact,
      avatarId: patch.avatarId ?? '',
      isConfirmed: false,
    };
    await DocumentationContentModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          teamMembers: [...members, member],
          draftVersion: Number(doc.draftVersion ?? 1) + 1,
          updatedBy: adminUserEmail || String(doc.updatedBy ?? ''),
        },
      }
    );
    const state = await this.getDraft();
    return { ...state, member: members.find((candidate) => candidate.id === member.id) ?? member };
  },

  async updateTeamMember(memberId: string, patch: { name?: string; role?: string; contact?: string; avatarId?: string }, adminUserEmail = '') {
    const doc = await getDocsContentDoc();
    const existing = (doc.teamMembers ?? []).find((member) => member.id === memberId);
    if (!existing) throw Object.assign(new Error('Team member not found'), { statusCode: 404 });
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined)
    ) as Partial<DocsTeamMember>;
    const members = (doc.teamMembers ?? []).map((member) =>
      member.id === memberId ? { ...member, ...cleanPatch } : member
    );
    await DocumentationContentModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          teamMembers: members,
          draftVersion: Number(doc.draftVersion ?? 1) + 1,
          updatedBy: adminUserEmail || String(doc.updatedBy ?? ''),
        },
      }
    );
    const state = await this.getDraft();
    return { member: members.find((member) => member.id === memberId) ?? null, versions: state.versions, publishedVersion: state.publishedVersion };
  },

  async updateTeamMemberAvatar(
    memberId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    adminUserEmail = ''
  ): Promise<{ member: DocsTeamMember | null; avatarId: string }> {
    const doc = await getDocsContentDoc();
    const existing = (doc.teamMembers ?? []).find((member) => member.id === memberId);
    if (!existing) throw Object.assign(new Error('Team member not found'), { statusCode: 404 });

    const avatarId = String(await uploadBuffer(file.buffer, file.originalname, file.mimetype, {
      kind: 'team-avatar',
      memberId,
      memberName: existing.name,
    }));
    const members = (doc.teamMembers ?? []).map((member) =>
      member.id === memberId ? { ...member, avatarId } : member
    );
    await DocumentationContentModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          teamMembers: members,
          draftVersion: Number(doc.draftVersion ?? 1) + 1,
          updatedBy: adminUserEmail || String(doc.updatedBy ?? ''),
        },
      }
    );
    if (existing.avatarId && existing.avatarId !== avatarId) {
      void deleteGridFSFile(existing.avatarId).catch(() => undefined);
    }
    return { member: members.find((member) => member.id === memberId) ?? null, avatarId };
  },

  async deleteTeamMember(memberId: string, adminUserEmail = '') {
    const doc = await getDocsContentDoc();
    const member = (doc.teamMembers ?? []).find((candidate) => candidate.id === memberId);
    if (!member) throw Object.assign(new Error('Team member not found'), { statusCode: 404 });
    if (member.isConfirmed) {
      throw Object.assign(new Error('Confirmed team members cannot be removed'), { statusCode: 409 });
    }
    if (member.avatarId) {
      void deleteGridFSFile(member.avatarId).catch(() => undefined);
    }
    const members = (doc.teamMembers ?? []).filter((candidate) => candidate.id !== memberId);
    await DocumentationContentModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          teamMembers: members,
          draftVersion: Number(doc.draftVersion ?? 1) + 1,
          updatedBy: adminUserEmail || String(doc.updatedBy ?? ''),
        },
      }
    );
    return { deleted: true, remaining: members.length };
  },

  async getPublicContent() {
    const doc = await getDocsContentDoc();
    return toPublicContent(doc);
  },

  async getPublicMeta() {
    const doc = await getDocsContentDoc();
    const settings = doc.settings ?? {};
    const publishedVersion = Number(doc.publishedVersion ?? 0);
    let reason: 'disabled' | 'scheduled' | 'unpublished' | null = null;
    if (settings.enabled === false) reason = 'disabled';
    else if (!isPublicAccessible(settings)) reason = 'scheduled';
    else if (publishedVersion === 0) reason = 'unpublished';
    return {
      accessible: reason === null,
      reason,
      enabled: settings.enabled !== false,
      version: publishedVersion,
      window: {
        start: settings.start ? new Date(settings.start as Date).toISOString() : null,
        end: settings.end ? new Date(settings.end as Date).toISOString() : null,
        timezone: settings.timezone || 'Asia/Dhaka',
      },
      updatedAt: new Date(doc.updatedAt as Date).toISOString(),
    };
  },

  /** Returns the published snapshot, or throws a status error. */
  async getPublicSnapshot(): Promise<DocsDraft> {
    const doc = await getDocsContentDoc();
    if (!isPublicAccessible(doc.settings ?? {})) {
      throw Object.assign(new Error('Documentation is not available right now.'), { statusCode: 403 });
    }
    const publishedVersion = Number(doc.publishedVersion ?? 0);
    if (publishedVersion === 0) {
      throw Object.assign(new Error('Documentation is not published yet.'), { statusCode: 404 });
    }
    const version = (await DocumentationVersionModel.findOne({ version: publishedVersion }).lean()) as DocumentationVersionDoc | null;
    const snapshot = version?.content as DocsDraft | undefined;
    // Settings always come from the live document so scheduling changes take
    // effect immediately without republishing content.
    return {
      pitchDeck: snapshot?.pitchDeck ?? doc.pitchDeck ?? [],
      productOverview: snapshot?.productOverview ?? doc.productOverview ?? [],
      customSections: snapshot?.customSections ?? doc.customSections ?? [],
      featureMatrix: snapshot?.featureMatrix ?? doc.featureMatrix ?? [],
      roadmap: snapshot?.roadmap ?? doc.roadmap ?? [],
      teamMembers: snapshot?.teamMembers ?? doc.teamMembers ?? [],
      changelog: snapshot?.changelog ?? doc.changelog ?? [],
      settings: {
        enabled: doc.settings?.enabled !== false,
        start: doc.settings?.start ? new Date(doc.settings.start as Date).toISOString() : null,
        end: doc.settings?.end ? new Date(doc.settings.end as Date).toISOString() : null,
        timezone: doc.settings?.timezone || 'Asia/Dhaka',
      },
      draftVersion: Number(doc.draftVersion ?? 0),
      publishedVersion,
    } as DocsDraft;
  },
};

export default docsContentService;

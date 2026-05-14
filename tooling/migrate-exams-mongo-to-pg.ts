/**
 * Legacy entrypoint: mock exam metadata and sections now live in Postgres as
 * `public.exams` and `public.exam_parts` (not `app_documents`).
 *
 * To sync other Mongo collections into `app_documents`, use:
 *   npm run migrate:mongo:app-documents
 */

import "./bootstrap-website-env";

async function main() {
  console.log(
    "[migrate-exams-mongo-to-pg] Skipped: exams and exam-parts are relational tables (public.exams, public.exam_parts)."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

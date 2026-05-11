import "dotenv/config";
import postgres from "postgres";

const examHex = process.argv[2] || "6814029fc1f62c63990a0219";
const partId = Number(process.argv[3] || 1);

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const like = `%${examHex}%`;
  const rows = await sql`
    SELECT mongo_id,
           body->>'partId' AS part_text,
           body->'partId' AS part_json,
           body->'examId' AS exam_id_json,
           body->>'examId' AS exam_id_text,
           length(body::text) AS body_len
    FROM app_documents
    WHERE collection = 'exam-parts'
      AND body::text ILIKE ${like}
    ORDER BY mongo_id
    LIMIT 15
  `;
  console.log("rows matching exam hex in body:", rows.length);
  for (const r of rows) console.log(JSON.stringify(r));

  const byPart = await sql`
    SELECT mongo_id, body->>'partId' AS part_text, body->'examId' AS exam_id_json
    FROM app_documents
    WHERE collection = 'exam-parts'
      AND body->>'partId' = ${String(partId)}
    LIMIT 5
  `;
  console.log("\nrows with partId text =", partId, ":", byPart.length);
  for (const r of byPart) console.log(JSON.stringify(r));
} finally {
  await sql.end();
}

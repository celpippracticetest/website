import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");

function ensureImport(s, imp) {
  if (s.includes(imp.split('"')[1] ?? imp)) return s;
  const lines = s.split("\n");
  let lastImport = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import ")) lastImport = i;
  }
  lines.splice(lastImport + 1, 0, imp);
  return lines.join("\n");
}

function patchFile(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return false;
  let s = fs.readFileSync(file, "utf8");
  const before = s;

  s = s.replace(/import mongoClient from "@\/lib\/mongodb";/g, 'import documentsClient from "@/lib/appDocumentsClient";');
  s = s.replace(/\bmongoClient\b/g, "documentsClient");
  s = s.replace(/import \{ ObjectId \} from "mongodb";/g, 'import { ObjectId } from "bson";');

  s = s.replace(
    /import \{ currentUser \} from "@clerk\/nextjs\/server";/g,
    'import { getHybridCurrentUser } from "@/lib/auth/web-session-server";',
  );
  s = s.replace(
    /import \{ auth, clerkClient, currentUser \} from "@clerk\/nextjs\/server";/g,
    'import { getHybridCurrentUser } from "@/lib/auth/web-session-server";\nimport { appUserAdmin } from "@/lib/auth/server-auth";\nimport { getRequestAuthUser } from "@/lib/auth/request-auth";',
  );
  s = s.replace(/import \{ auth \} from "@clerk\/nextjs\/server";/g, 'import { getRequestAuthUser } from "@/lib/auth/request-auth";');
  s = s.replace(
    /import \{ auth, clerkClient \} from "@clerk\/nextjs\/server";/g,
    'import { getRequestAuthUser } from "@/lib/auth/request-auth";\nimport { appUserAdmin } from "@/lib/auth/server-auth";',
  );
  s = s.replace(
    /const user = await currentUser\(\);/g,
    "const hybridUser = await getHybridCurrentUser();\n  const user = hybridUser?.user ?? null;",
  );
  s = s.replace(/const \{ userId \} = await auth\(\);/g, "const { userId } = await getRequestAuthUser();");
  s = s.replace(/await auth\(\)/g, "await getRequestAuthUser()");
  s = s.replace(/\bclerkClient\b/g, "(await appUserAdmin())");

  // Remove any @clerk import line(s)
  s = s.replace(/^import \{[^}]+\} from "@clerk\/[^"]+";?\s*\n/gm, "");
  s = s.replace(/^import \{[^}]+\} from '@clerk\/[^']+';?\s*\n/gm, "");

  if (/@clerk|SignInButton|SignUpButton|SignedIn|SignedOut|UserButton|useClerk|useUser|useAuth|useReverification/.test(s)) {
    s = ensureImport(s, 'import Link from "next/link";');
    s = ensureImport(s, 'import { useHybridWebUser } from "@/hooks/useHybridWebUser";');
    if (/signOut/.test(s)) {
      s = ensureImport(s, 'import { signOutWebSession } from "@/lib/auth/client-sign-out";');
    }
  }

  s = s.replace(/\buseUser\(\)/g, "useHybridWebUser()");
  s = s.replace(/\buseAuth\(\)/g, "useHybridWebUser()");
  s = s.replace(/const \{ signOut \} = useClerk\(\);/g, "");
  s = s.replace(/\bsignOut\(\)/g, "signOutWebSession()");

  s = s.replace(/<SignInButton(\s+[^>]*)?>/g, '<Link href="/sign-in">');
  s = s.replace(/<\/SignInButton>/g, "</Link>");
  s = s.replace(/<SignUpButton(\s+[^>]*)?>/g, '<Link href="/sign-in?mode=sign-up">');
  s = s.replace(/<\/SignUpButton>/g, "</Link>");
  s = s.replace(/<SignedOut(\s+[^>]*)?>/g, "{!isSignedIn && (");
  s = s.replace(/<\/SignedOut>/g, ")}");
  s = s.replace(/<SignedIn(\s+[^>]*)?>/g, "{isSignedIn && (");
  s = s.replace(/<\/SignedIn>/g, ")}");
  s = s.replace(/<UserButton[^/]*\/>/g, "");
  s = s.replace(/<UserButton[\s\S]*?<\/UserButton>/g, "");

  s = s.replace(
    /const \{ user \} = useHybridWebUser\(\);/g,
    "const { user, isSignedIn } = useHybridWebUser();",
  );
  s = s.replace(
    /const \{ user, isLoaded \} = useHybridWebUser\(\);/g,
    "const { user, isLoaded, isSignedIn } = useHybridWebUser();",
  );

  s = s.replace(/import \{ ClerkProvider \} from "@clerk\/nextjs";/g, 'import { SupabaseAuthHashRecoveryRedirect } from "@/components/auth/SupabaseAuthHashRecoveryRedirect";');
  s = s.replace(/<ClerkProvider>\s*/g, "");
  s = s.replace(/\s*<\/ClerkProvider>/g, "");

  if (s !== before) {
    fs.writeFileSync(file, s);
    return true;
  }
  return false;
}

const patterns = ["@clerk", "SignInButton", "SignUpButton", "SignedIn", "SignedOut", "UserButton", "@/lib/mongodb", "ClerkProvider"];
const files = new Set();
for (const p of patterns) {
  try {
    execSync(`git grep -l "${p}" -- src`, { cwd: root, encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean)
      .forEach((f) => files.add(f));
  } catch {
    /* no matches */
  }
}

let patched = 0;
for (const rel of files) {
  if (rel.includes("clerkToSupabaseUserPayload")) continue;
  if (patchFile(rel)) {
    patched++;
    console.log("patched", rel);
  }
}

console.log(`Done. Patched ${patched} files.`);

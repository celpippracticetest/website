import { cookies, headers } from "next/headers";
import {
  UI_AB_COOKIE,
  parseUiAbVariant,
  UI_AB_HEADER,
  type UiAbVariant,
} from "@/lib/uiAbTest";

/** Server Components: prefer middleware header, then cookie. */
export async function getUiAbVariant(): Promise<UiAbVariant> {
  const headerStore = await headers();
  const fromHeader = headerStore.get(UI_AB_HEADER);
  if (fromHeader) {
    return parseUiAbVariant(fromHeader);
  }

  const cookieStore = await cookies();
  return parseUiAbVariant(cookieStore.get(UI_AB_COOKIE)?.value);
}

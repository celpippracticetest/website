"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import Add from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import Edit from "@mui/icons-material/Edit";
import OpenInNew from "@mui/icons-material/OpenInNew";
import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import type { TProfessionPageContent } from "@/models/profession-page.model";

export default function CmsProfessionPagesListPage() {
  const router = useRouter();
  const [items, setItems] = useState<TProfessionPageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/profession-pages");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = async (slug: string) => {
    if (!confirm(`Delete profession page "${slug}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/profession-pages/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Deleted", description: slug });
      await load();
    } catch {
      toast({
        title: "Error",
        description: "Could not delete this page.",
        variant: "destructive",
      });
    }
  };

  return (
    <Box className="min-h-screen bg-slate-50 p-4 md:p-6">
      <Box className="mx-auto max-w-6xl">
        <Box className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Profession pages</h1>
            <p className="mt-1 text-sm text-slate-600">
              CELPIP marketing pages (URL prefix <code className="rounded bg-slate-200 px-1">celpip-for-</code>
              ). Live URLs use the slug directly, e.g. <code className="rounded bg-slate-200 px-1">/celpip-for-nurses</code>.
            </p>
          </div>
          <Button onClick={() => router.push("/cms/dashboard/profession-pages/create")}>
            <Add className="mr-2 h-4 w-4" />
            New page
          </Button>
        </Box>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">Could not load profession pages.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No profession pages yet. Create one to get started.</p>
        ) : (
          <Box className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.slug}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">{row.slug}</TableCell>
                    <TableCell>
                      {row.published ? (
                        <Badge>Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${row.slug}`} target="_blank" rel="noreferrer">
                          <OpenInNew className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/cms/dashboard/profession-pages/${encodeURIComponent(row.slug)}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(row.slug)}>
                        <Delete className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>
    </Box>
  );
}

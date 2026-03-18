"use client";

import { Box } from "@/components/ui/Box";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TWikiArticleSchemaDto } from "@/models/wiki.model";
import { Pencil, Trash2 } from "lucide-react";

type WikiArticlesTableProps = {
  articles: TWikiArticleSchemaDto[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

function formatDate(dateValue?: Date | string | null) {
  if (!dateValue) return "-";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

export default function WikiArticlesTable({
  articles,
  isLoading,
  isError,
  onEdit,
  onDelete,
}: WikiArticlesTableProps) {
  if (isLoading) {
    return (
      <Box className="p-8 text-center text-sm text-slate-500">
        Loading wiki articles...
      </Box>
    );
  }

  if (isError) {
    return (
      <Box className="p-8 text-center text-sm text-red-500">
        Error loading wiki articles.
      </Box>
    );
  }

  if (articles.length === 0) {
    return (
      <Box className="p-8 text-center text-sm text-slate-500">
        No wiki articles found. Create one to get started.
      </Box>
    );
  }

  return (
    <Box className="overflow-hidden rounded-lg bg-white shadow">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles.map((article) => (
            <TableRow key={article.id}>
              <TableCell>
                <p className="font-medium text-slate-900">{article.title}</p>
                {article.description && (
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {article.description}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-xs text-slate-600">
                /wiki/{article.slug}
              </TableCell>
              <TableCell>{article.category}</TableCell>
              <TableCell>{article.sortOrder}</TableCell>
              <TableCell>{formatDate(article.updatedAt)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(article.id)}
                  title="Edit wiki article"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete this wiki article? This action cannot be undone."
                      )
                    ) {
                      onDelete(article.id);
                    }
                  }}
                  title="Delete wiki article"
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

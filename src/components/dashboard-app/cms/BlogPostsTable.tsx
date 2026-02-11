"use client";

import { Box } from "@/components/ui/Box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TBlogSchemaDto } from "@/models/blog.model";
import { Pencil, Trash2 } from "lucide-react";

type BlogPostsTableProps = {
  posts: TBlogSchemaDto[];
  isLoading: boolean;
  isError: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

function formatDate(dateValue?: Date | string | null) {
  if (!dateValue) {
    return "-";
  }
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleDateString();
}

export default function BlogPostsTable({
  posts,
  isLoading,
  isError,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onEdit,
  onDelete,
}: BlogPostsTableProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (isLoading) {
    return <Box className="p-8 text-center text-sm text-slate-500">Loading blog posts...</Box>;
  }

  if (isError) {
    return <Box className="p-8 text-center text-sm text-red-500">Error loading blog posts.</Box>;
  }

  if (posts.length === 0) {
    return <Box className="p-8 text-center text-sm text-slate-500">No blog posts found.</Box>;
  }

  return (
    <Box className="overflow-hidden rounded-lg bg-white shadow">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Published</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.id}>
              <TableCell>
                <p className="font-medium text-slate-900">{post.title}</p>
                <p className="text-xs text-slate-500">{post.authorName}</p>
              </TableCell>
              <TableCell className="text-xs text-slate-600">/blog/{post.slug}</TableCell>
              <TableCell>
                <Badge variant={post.status === "published" ? "default" : "secondary"}>
                  {post.status}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(post.publishedAt)}</TableCell>
              <TableCell>{formatDate(post.updatedAt)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(post.id)}
                  title="Edit blog post"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (window.confirm("Delete this blog post? This action cannot be undone.")) {
                      onDelete(post.id);
                    }
                  }}
                  title="Delete blog post"
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <Box className="border-t p-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                let pageNumber = index + 1;
                if (totalPages > 5 && page > 3 && page < totalPages - 1) {
                  pageNumber = page - 2 + index;
                } else if (totalPages > 5 && page >= totalPages - 1) {
                  pageNumber = totalPages - 4 + index;
                }
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      onClick={() => onPageChange(pageNumber)}
                      isActive={page === pageNumber}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className={
                    page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </Box>
      )}
    </Box>
  );
}

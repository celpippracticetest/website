"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import Add from "@mui/icons-material/Add";
import ArrowBack from "@mui/icons-material/ArrowBack";
import UploadFile from "@mui/icons-material/UploadFile";
import { Box } from "@/components/ui/Box";

type KeywordRow = {
  id: string;
  phrase: string;
  notes: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const emptyForm = {
  phrase: "",
  notes: "",
  sortOrder: 0,
  isActive: true,
};

export default function BlogTargetKeywordsPage() {
  const [items, setItems] = useState<KeywordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importSplitCommas, setImportSplitCommas] = useState(false);
  const [importIsActive, setImportIsActive] = useState(true);
  const [importSaving, setImportSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/blog/target-keywords", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load keywords.");
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load keywords.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: KeywordRow) => {
    setEditingId(row.id);
    setForm({
      phrase: row.phrase,
      notes: row.notes ?? "",
      sortOrder: row.sortOrder ?? 0,
      isActive: row.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    const phrase = form.phrase.trim();
    if (!phrase) {
      setError("Phrase is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const res = await fetch(`/api/blog/target-keywords/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phrase,
            notes: form.notes.trim(),
            sortOrder: Number(form.sortOrder) || 0,
            isActive: form.isActive,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(typeof data.message === "string" ? data.message : "Update failed.");
        }
      } else {
        const res = await fetch("/api/blog/target-keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phrase,
            notes: form.notes.trim(),
            sortOrder: Number(form.sortOrder) || 0,
            isActive: form.isActive,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(typeof data.message === "string" ? data.message : "Create failed.");
        }
      }
      closeDialog();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this keyword? It will no longer be enforced in AI-generated posts.")) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/blog/target-keywords/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Delete failed.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const closeImportDialog = () => {
    setImportOpen(false);
    setImportText("");
    setImportSplitCommas(false);
    setImportIsActive(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setImportText(text);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleBulkImport = async () => {
    if (!importText.trim()) {
      setError("Paste keywords or choose a text file.");
      return;
    }
    setImportSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/blog/target-keywords/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: importText,
          splitOnCommas: importSplitCommas,
          isActive: importIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.message === "string" ? data.message : "Import failed.");
      }
      const { created, skippedDuplicate, skippedInvalid, skippedEmpty } = data as {
        created: number;
        skippedDuplicate: number;
        skippedInvalid: number;
        skippedEmpty: number;
      };
      setSuccessMessage(
        `Imported ${created} keyword(s). Skipped: ${skippedDuplicate} duplicate(s), ${skippedInvalid} over 200 characters, ${skippedEmpty} empty line(s).`,
      );
      closeImportDialog();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImportSaving(false);
    }
  };

  const toggleActive = async (row: KeywordRow) => {
    setError(null);
    try {
      const res = await fetch(`/api/blog/target-keywords/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Update failed.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  };

  return (
    <Box className="min-h-screen bg-slate-50 p-4 md:p-6">
      <Box className="mx-auto max-w-5xl space-y-4">
        <Box className="flex flex-wrap items-center gap-2">
          <Button
            component={Link}
            href="/cms/dashboard/blog"
            startIcon={<ArrowBack />}
            sx={{ textTransform: "none" }}
          >
            Blog posts
          </Button>
        </Box>

        <Box className="rounded-lg bg-white p-5 shadow">
          <Box className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <Box>
              <Typography variant="h4" component="h1" className="font-bold text-slate-900">
                Blog SEO target keywords
              </Typography>
              <Typography variant="body2" className="mt-1 text-slate-600 max-w-xl">
                Active keywords are automatically sent to the AI when you generate a post. Each active phrase should
                appear at least once in the article body and be included in the generated keywords field.
              </Typography>
            </Box>
            <Box className="flex flex-wrap gap-2 self-start">
              <Button
                variant="outlined"
                startIcon={<UploadFile />}
                onClick={() => {
                  setImportOpen(true);
                  setError(null);
                }}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Import bulk
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={openCreate}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Add keyword
              </Button>
            </Box>
          </Box>
        </Box>

        {successMessage ? (
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        ) : null}

        {error ? (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <Box className="rounded-lg bg-white p-2 shadow overflow-x-auto">
          {loading ? (
            <Typography className="p-4 text-slate-500">Loading…</Typography>
          ) : items.length === 0 ? (
            <Typography className="p-4 text-slate-500">No keywords yet. Add phrases your blog strategy should reinforce.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Active</TableCell>
                  <TableCell>Order</TableCell>
                  <TableCell>Phrase</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={row.isActive}
                        onChange={() => toggleActive(row)}
                        inputProps={{ "aria-label": `Active ${row.phrase}` }}
                      />
                    </TableCell>
                    <TableCell>{row.sortOrder}</TableCell>
                    <TableCell className="font-medium text-slate-900">{row.phrase}</TableCell>
                    <TableCell className="max-w-xs text-slate-600 whitespace-pre-wrap">{row.notes || "—"}</TableCell>
                    <TableCell align="right">
                      <IconButton aria-label="Edit" onClick={() => openEdit(row)} size="small">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton aria-label="Delete" onClick={() => handleDelete(row.id)} size="small" color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>

        <Dialog open={importOpen} onClose={closeImportDialog} fullWidth maxWidth="sm">
          <DialogTitle>Import keywords</DialogTitle>
          <DialogContent className="flex flex-col gap-3 pt-1">
            <Typography variant="body2" className="text-slate-600">
              One keyword per line (max 200 characters each). Duplicates already in the database or repeated in the list
              are skipped. Up to 500 lines per import.
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,text/plain"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => fileInputRef.current?.click()}
              sx={{ textTransform: "none", alignSelf: "flex-start" }}
            >
              Load from file (.txt / .csv)
            </Button>
            <TextField
              label="Keywords"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              fullWidth
              multiline
              minRows={10}
              placeholder={"CELPIP General Test\nCLB 9 speaking\nParagon Testing"}
              margin="dense"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={importSplitCommas}
                  onChange={(e) => setImportSplitCommas(e.target.checked)}
                />
              }
              label="Also split each line on commas (for CSV-style rows)"
            />
            <FormControlLabel
              control={
                <Checkbox checked={importIsActive} onChange={(e) => setImportIsActive(e.target.checked)} />
              }
              label="Mark imported keywords as active"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeImportDialog} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleBulkImport}
              disabled={importSaving || !importText.trim()}
              sx={{ textTransform: "none" }}
            >
              {importSaving ? "Importing…" : "Import"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
          <DialogTitle>{editingId ? "Edit keyword" : "New keyword"}</DialogTitle>
          <DialogContent className="flex flex-col gap-3 pt-2">
            <TextField
              label="Phrase"
              value={form.phrase}
              onChange={(e) => setForm((f) => ({ ...f, phrase: e.target.value }))}
              fullWidth
              required
              margin="dense"
              helperText="Exact wording the AI should work into the post (e.g. CELPIP General)."
            />
            <TextField
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              margin="dense"
              multiline
              minRows={2}
            />
            <TextField
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
              fullWidth
              margin="dense"
              helperText="Lower numbers appear first in the list sent to the model."
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
              }
              label="Active (enforced when generating posts)"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialog} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}

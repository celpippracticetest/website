"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { InternalLinkDto } from "@/models/internal-link.model";
import { Edit, Trash2, Plus, RefreshCw, Upload } from "lucide-react";

export default function InternalLinksPage() {
  const [links, setLinks] = useState<InternalLinkDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<InternalLinkDto | null>(null);
  const [formData, setFormData] = useState({ keyword: "", url: "", exactMatch: false });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/internal-links");
      const data = await res.json();
      setLinks(data);
    } catch (error) {
      console.error("Failed to fetch links:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMigration = async () => {
    if (!confirm("This will import hardcoded links from the source code. Continue?")) return;
    try {
      const res = await fetch("/api/admin/internal-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "migrate" }),
      });
      const data = await res.json();
      alert(data.message);
      fetchLinks();
    } catch (error) {
      alert("Migration failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingLink ? "PUT" : "POST";
      const body = editingLink ? { ...formData, id: editingLink.id } : formData;

      const res = await fetch("/api/admin/internal-links", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");

      setIsModalOpen(false);
      fetchLinks();
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Failed to save link");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;
    try {
      await fetch(`/api/admin/internal-links?id=${id}`, { method: "DELETE" });
      fetchLinks();
    } catch (error) {
      console.error(error);
    }
  };

  const openEditModal = (link: InternalLinkDto) => {
    setEditingLink(link);
    setFormData({ keyword: link.keyword, url: link.url, exactMatch: link.exactMatch });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingLink(null);
    setFormData({ keyword: "", url: "", exactMatch: false });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">SEO Internal Links</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleMigration} title="Import from file">
            <Upload className="w-4 h-4 mr-2" /> Import Defaults
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Link
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>Target URL</TableHead>
              <TableHead>Exact Match</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : links.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                  No internal links found. Import defaults or add one.
                </TableCell>
              </TableRow>
            ) : (
              links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">{link.keyword}</TableCell>
                  <TableCell className="text-blue-600 truncate max-w-[300px]">{link.url}</TableCell>
                  <TableCell>{link.exactMatch ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(link)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(link.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Internal Link" : "Add Internal Link"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword / Phrase</Label>
              <Input
                id="keyword"
                value={formData.keyword}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Target URL</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exactMatch"
                checked={formData.exactMatch}
                onCheckedChange={(checked) => setFormData({ ...formData, exactMatch: checked as boolean })}
              />
              <Label htmlFor="exactMatch">Exact Match Only</Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

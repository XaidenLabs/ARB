/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
    MegaphoneIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    FunnelIcon,
    CheckBadgeIcon,
    ClockIcon,
    XMarkIcon,
    ArrowTopRightOnSquareIcon
} from "@heroicons/react/24/outline";

export default function SpotlightsPage() {
    const [activeTab, setActiveTab] = useState<'pipeline' | 'discovery'>('pipeline');
    const [leads, setLeads] = useState<any[]>([]); // Will fetch from API
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [newAffiliation, setNewAffiliation] = useState("");
    const [newSummary, setNewSummary] = useState("");
    const [newStatus, setNewStatus] = useState("new");
    const [saving, setSaving] = useState(false);

    // Discovery State
    const [topic, setTopic] = useState("");
    const [region, setRegion] = useState("Africa");
    const [role, setRole] = useState("Researcher");

    // Fetch Leads
    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/leads");
            const data = await res.json();
            if (data.leads) setLeads(data.leads);
        } catch (e) {
            console.error("Failed to fetch leads", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'pipeline') {
            fetchLeads();
        }
    }, [activeTab]);

    const handleEdit = (lead: any) => {
        setEditingId(lead.id);
        setNewName(lead.full_name);
        setNewAffiliation(lead.affiliation || "");
        setNewSummary(lead.project_summary || "");
        setNewStatus(lead.contact_status || "new");
        setShowAddModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this candidate?")) return;
        try {
            const res = await fetch(`/api/admin/leads?id=${id}`, { method: "DELETE" });
            if (res.ok) fetchLeads();
        } catch (e) {
            console.error("Failed to delete", e);
        }
    };

    const resetForm = () => {
        setShowAddModal(false);
        setEditingId(null);
        setNewName("");
        setNewAffiliation("");
        setNewSummary("");
        setNewStatus("new");
    };

    const handleSaveLead = async () => {
        if (!newName) return;
        setSaving(true);
        try {
            const method = editingId ? "PUT" : "POST";
            const body = {
                id: editingId, // Ignored by POST
                full_name: newName,
                affiliation: newAffiliation,
                project_summary: newSummary,
                contact_status: newStatus
            };

            const res = await fetch("/api/admin/leads", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                resetForm();
                fetchLeads(); // Refresh list
            }
        } catch (e) {
            console.error("Failed to save lead", e);
        } finally {
            setSaving(false);
        }
    };

    const generateSearchUrl = (platform: 'google' | 'linkedin' | 'twitter') => {
        const query = `"${topic}" "${role}" "${region}"`;
        if (platform === 'linkedin') return `https://www.google.com/search?q=site:linkedin.com/in/ ${encodeURIComponent(query)}`;
        if (platform === 'twitter') return `https://twitter.com/search?q=${encodeURIComponent(query + " -filter:retweets")}&f=user`;
        return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Researcher Spotlights</h1>
                    <p className="mt-1 text-sm text-gray-400">
                        Manage outreach campaigns and discover new talent.
                    </p>
                </div>
                <div className="flex bg-[#1A1D27] p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => setActiveTab('pipeline')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'pipeline' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Pipeline (CRM)
                    </button>
                    <button
                        onClick={() => setActiveTab('discovery')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'discovery' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Discovery Tool
                    </button>
                </div>
            </div>

            {/* DISCOVERY TAB */}
            {activeTab === 'discovery' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="rounded-2xl bg-[#1A1D27] border border-white/5 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <MagnifyingGlassIcon className="h-6 w-6 text-purple-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Candidate Scanner</h2>
                        </div>
                        <p className="text-gray-400 text-sm mb-6">
                            Use this tool to generate advanced search queries to find researchers across the web.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Research Topic / Keywords</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g. Microbiology, AI Ethics, Renewable Energy"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Target Region</label>
                                    <input
                                        type="text"
                                        value={region}
                                        onChange={(e) => setRegion(e.target.value)}
                                        placeholder="e.g. Nigeria, East Africa"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Role / Title</label>
                                    <input
                                        type="text"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        placeholder="e.g. PhD, Professor, Founder"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-[#1A1D27] border border-white/5 p-8">
                        <h3 className="text-lg font-bold text-white mb-4">Quick Search Links</h3>
                        <div className="space-y-3">
                            <a
                                href={generateSearchUrl('linkedin')}
                                target="_blank"
                                className="flex items-center justify-between p-4 rounded-xl bg-blue-600/10 border border-blue-600/20 hover:bg-blue-600/20 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-blue-400 font-bold">LinkedIn X-Ray</span>
                                    <span className="text-gray-500 text-xs group-hover:text-blue-300 transition-colors">Find profiles matching your criteria</span>
                                </div>
                                <ArrowTopRightOnSquareIcon className="h-5 w-5 text-blue-400" />
                            </a>

                            <a
                                href={generateSearchUrl('google')}
                                target="_blank"
                                className="flex items-center justify-between p-4 rounded-xl bg-green-600/10 border border-green-600/20 hover:bg-green-600/20 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 font-bold">Google Scholar / Web</span>
                                    <span className="text-gray-500 text-xs group-hover:text-green-300 transition-colors">Broad search for publications & bios</span>
                                </div>
                                <ArrowTopRightOnSquareIcon className="h-5 w-5 text-green-400" />
                            </a>

                            <a
                                href={generateSearchUrl('twitter')}
                                target="_blank"
                                className="flex items-center justify-between p-4 rounded-xl bg-sky-600/10 border border-sky-600/20 hover:bg-sky-600/20 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sky-400 font-bold">Twitter / X People</span>
                                    <span className="text-gray-500 text-xs group-hover:text-sky-300 transition-colors">Find active researchers discussing topics</span>
                                </div>
                                <ArrowTopRightOnSquareIcon className="h-5 w-5 text-sky-400" />
                            </a>
                        </div>

                        <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <p className="text-xs text-yellow-200">
                                <strong>Pro Tip:</strong> When you find a good candidate, manually copy their details and add them to the &quot;Pipeline&quot; tab to track your outreach status.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* PIPELINE TAB */}
            {activeTab === 'pipeline' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => { resetForm(); setShowAddModal(true); }}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <PlusIcon className="h-5 w-5" />
                            Add New Candidate
                        </button>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-[#1A1D27] overflow-hidden">
                        <table className="min-w-full divide-y divide-white/5">
                            <thead className="bg-black/20">
                                <tr>
                                    <th className="py-4 pl-6 text-left text-xs font-medium text-gray-400 uppercase">Researcher</th>
                                    <th className="py-4 px-3 text-left text-xs font-medium text-gray-400 uppercase">Affiliation</th>
                                    <th className="py-4 px-3 text-left text-xs font-medium text-gray-400 uppercase">Summary</th>
                                    <th className="py-4 px-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                                    <th className="py-4 px-3 text-right text-xs font-medium text-gray-400 uppercase pr-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500 bg-white/5 animate-pulse">Loading Pipeline...</td></tr>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            No candidates yet. Use the &quot;Add New&quot; button or explore the Discovery tab.
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map((lead) => (
                                        <tr key={lead.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="py-4 pl-6 pr-3">
                                                <div className="font-medium text-white">{lead.full_name}</div>
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-400">{lead.affiliation || "-"}</td>
                                            <td className="px-3 py-4 text-sm text-gray-500 truncate max-w-xs">{lead.project_summary || "No summary"}</td>
                                            <td className="px-3 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${lead.contact_status === 'contacted' ? 'bg-yellow-500/10 text-yellow-500' :
                                                        lead.contact_status === 'replied' ? 'bg-green-500/10 text-green-500' :
                                                            'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {(lead.contact_status || 'new').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 text-right pr-6">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEdit(lead)} className="text-gray-500 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10">Edit</button>
                                                    <button onClick={() => handleDelete(lead.id)} className="text-gray-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-500/10">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1A1D27] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-xl">
                        <h3 className="text-xl font-bold text-white mb-4">{editingId ? 'Edit Candidate' : 'Add Candidate'}</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Full Name (Required)"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                            <input
                                type="text"
                                placeholder="Affiliation"
                                value={newAffiliation}
                                onChange={(e) => setNewAffiliation(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white"
                            >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="replied">Replied</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <textarea
                                placeholder="Project Summary (Paste from chat)"
                                value={newSummary}
                                onChange={(e) => setNewSummary(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white h-32"
                            ></textarea>
                            <div className="flex justify-end gap-3 mt-4">
                                <button onClick={resetForm} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                                <button
                                    onClick={handleSaveLead}
                                    disabled={!newName || saving}
                                    className="px-4 py-2 bg-purple-600 rounded-lg text-white font-medium disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

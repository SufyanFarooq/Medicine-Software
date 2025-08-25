import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { hasPermission } from '../../lib/permissions';
import { logSupplierActivity } from '../../lib/activity-logger';
import { apiRequest, getUser } from '../../lib/auth';

export default function SuppliersPage() {
	const [suppliers, setSuppliers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState({ name: '', phone: '', company: '', email: '', address: '', notes: '' });
	const [error, setError] = useState('');
	const [editingId, setEditingId] = useState(null);
	const [currentUser, setCurrentUser] = useState({ role: 'super_admin' });

	const canManage = hasPermission(currentUser.role, 'canManageSuppliers');

	const loadSuppliers = async () => {
		setLoading(true);
		try {
			const res = await apiRequest('/api/suppliers');
			const data = await res.json();
			setSuppliers(Array.isArray(data) ? data : []);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const user = getUser();
		if (user) setCurrentUser(user);
		loadSuppliers();
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		if (!form.name || !form.phone) {
			setError('Name and phone are required');
			return;
		}
		setLoading(true);
		try {
			const res = await apiRequest('/api/suppliers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form)
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to add supplier');
			}
			const created = await res.json();
			await logSupplierActivity.added(created.name, created._id);
			setForm({ name: '', phone: '', company: '', email: '', address: '', notes: '' });
			loadSuppliers();
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const startEdit = (s) => {
		setEditingId(s._id);
		setForm({
			name: s.name || '',
			phone: s.phone || '',
			company: s.company || '',
			email: s.email || '',
			address: s.address || '',
			notes: s.notes || ''
		});
	};

	const cancelEdit = () => {
		setEditingId(null);
		setForm({ name: '', phone: '', company: '', email: '', address: '', notes: '' });
		setError('');
	};

	const saveEdit = async () => {
		if (!editingId) return;
		setLoading(true);
		setError('');
		try {
			const res = await apiRequest(`/api/suppliers/${editingId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form)
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to update supplier');
			}
			await logSupplierActivity.updated(form.name, editingId);
			cancelEdit();
			loadSuppliers();
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const deleteSupplier = async (id, name) => {
		if (!confirm('Delete this supplier?')) return;
		setLoading(true);
		try {
			const res = await apiRequest(`/api/suppliers/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to delete');
			}
			await logSupplierActivity.deleted(name, id);
			loadSuppliers();
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Layout>
			<div className="container mx-auto p-4">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-bold">🚚 Suppliers</h1>
					<Link href="/products" className="text-blue-600 hover:underline">← Back to Products</Link>
				</div>

				{canManage && (
					<div className="card mb-6">
						<h2 className="text-lg font-semibold mb-3">Add Supplier</h2>
						<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<input className="input-field" placeholder="Name *" value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} />
							<input className="input-field" placeholder="Phone *" value={form.phone} onChange={(e)=>setForm({ ...form, phone: e.target.value })} />
							<input className="input-field" placeholder="Company" value={form.company} onChange={(e)=>setForm({ ...form, company: e.target.value })} />
							<input className="input-field" placeholder="Email" value={form.email} onChange={(e)=>setForm({ ...form, email: e.target.value })} />
							<input className="input-field md:col-span-2" placeholder="Address" value={form.address} onChange={(e)=>setForm({ ...form, address: e.target.value })} />
							<textarea className="input-field md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e)=>setForm({ ...form, notes: e.target.value })} />
							<div className="md:col-span-2 flex justify-end">
								<button disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Supplier'}</button>
							</div>
						</form>
						{error && <p className="text-red-600 text-sm mt-2">{error}</p>}
					</div>
				)}

				<div className="card">
					<h2 className="text-lg font-semibold mb-3">All Suppliers</h2>
					{loading ? (
						<p>Loading...</p>
					) : suppliers.length === 0 ? (
						<p className="text-gray-500">No suppliers yet.</p>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
										<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
										<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
										<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
										<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
										<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{suppliers.map(s => (
										<tr key={s._id}>
											<td className="px-4 py-2">{editingId === s._id ? (
												<input className="input-field" value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} />
											) : s.name}</td>
											<td className="px-4 py-2">{editingId === s._id ? (
												<input className="input-field" value={form.company} onChange={(e)=>setForm({ ...form, company: e.target.value })} />
											) : s.company}</td>
											<td className="px-4 py-2">{editingId === s._id ? (
												<input className="input-field" value={form.phone} onChange={(e)=>setForm({ ...form, phone: e.target.value })} />
											) : s.phone}</td>
											<td className="px-4 py-2">{editingId === s._id ? (
												<input className="input-field" value={form.email} onChange={(e)=>setForm({ ...form, email: e.target.value })} />
											) : s.email}</td>
											<td className="px-4 py-2">{editingId === s._id ? (
												<input className="input-field" value={form.address} onChange={(e)=>setForm({ ...form, address: e.target.value })} />
											) : s.address}</td>
											<td className="px-4 py-2">
												{editingId === s._id ? (
													<div className="flex gap-2">
														<button onClick={saveEdit} className="text-green-600">Save</button>
														<button onClick={cancelEdit} className="text-gray-600">Cancel</button>
													</div>
												) : (
													<div className="flex gap-2">
														<button onClick={() => startEdit(s)} className="text-blue-600">Edit</button>
														<button onClick={() => deleteSupplier(s._id, s.name)} className="text-red-600">Delete</button>
													</div>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</Layout>
	);
}

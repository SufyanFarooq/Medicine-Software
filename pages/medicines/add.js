import Layout from '../../components/Layout';
import MedicineForm from '../../components/MedicineForm';

export default function AddMedicine() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Medicine</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add a new medicine to your inventory
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <MedicineForm />
        </div>
      </div>
    </Layout>
  );
} 
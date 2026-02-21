import ProfileForm from '@/components/ProfileForm';

/**
 * Admin Profile Page
 * URL: /admin-profile
 * Requirements: 16.1-16.10
 */
export default function AdminProfilePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Profile</h1>
      <ProfileForm />
    </div>
  );
}

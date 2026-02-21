import ProfileForm from '@/components/ProfileForm';

/**
 * Pharmacy Profile Page
 * URL: /pharmacy-profile
 * Requirements: 16.1-16.10
 */
export default function PharmacyProfilePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Pharmacy Profile</h1>
      <ProfileForm />
    </div>
  );
}

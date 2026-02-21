import ProfileForm from '@/components/ProfileForm';

/**
 * Patient Profile Page
 * URL: /my-profile
 * Requirements: 16.1-16.10
 */
export default function PatientProfilePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>
      <ProfileForm />
    </div>
  );
}

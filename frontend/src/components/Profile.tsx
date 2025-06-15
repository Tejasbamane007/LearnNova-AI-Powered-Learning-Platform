  import { useAuth } from "../context/AuthContext"; // ✅

  const Profile = () => {
    const { user } = useAuth();

    return (
      <div className="min-h-screen flex justify-center items-center text-white">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Profile</h2>
          {user ? (
            <div>
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>
    );
  };

  export default Profile;
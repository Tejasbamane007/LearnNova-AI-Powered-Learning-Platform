import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { Bell, Lock, User, Moon, Sun, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SettingsPage = () => {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send a request to update the password
    console.log("Password update submitted:", passwordForm);
    // Reset form
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send a request to update the profile
    console.log("Profile update submitted:", profileForm);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="pt-24 px-4 max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-[60vh]">
            <p className="text-xl">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-24 px-4 max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center md:text-left">
          Settings
        </h1>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="account" className="text-base">
              Account
            </TabsTrigger>
            <TabsTrigger value="security" className="text-base">
              Security
            </TabsTrigger>
            <TabsTrigger value="preferences" className="text-base">
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <User size={20} /> Account Information
              </h2>

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                      className="bg-gray-800 border-gray-700 mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      className="bg-gray-800 border-gray-700 mt-1"
                    />
                  </div>
                </div>

                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Save Changes
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Lock size={20} /> Password
              </h2>

              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showPassword ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className="bg-gray-800 border-gray-700 mt-1 pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className="bg-gray-800 border-gray-700 mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className="bg-gray-800 border-gray-700 mt-1"
                    />
                  </div>
                </div>

                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Update Password
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="preferences">
            <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Bell size={20} /> Notifications
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-gray-400">
                      Receive updates about your courses and account
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
              </div>

              <h2 className="text-xl font-semibold my-6 flex items-center gap-2">
                {darkMode ? <Moon size={20} /> : <Sun size={20} />} Appearance
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Dark Mode</h3>
                    <p className="text-sm text-gray-400">
                      Toggle between dark and light mode
                    </p>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
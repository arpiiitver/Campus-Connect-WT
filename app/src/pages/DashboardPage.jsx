import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  TrendingUp,
  User,
  CheckCircle,
  ShoppingBag,
  RotateCcw,
  Save,
  Phone,
  Trash2,
} from "lucide-react";
import {
  apiGetMyListings,
  apiUpdateProfile,
  apiDeleteListing,
  apiUpdateListingStatus,
} from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

export default function DashboardPage({ user, onListingClick, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [myListings, setMyListings] = useState([]);
  // Profile editing state
  const [fullName, setFullName] = useState(user.full_name || "");
  const [contact, setContact] = useState(user.contact || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [stats, setStats] = useState({
    totalListings: 0,
    soldItems: 0,
    rentedItems: 0,
    availableItems: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user.id]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const listings = await apiGetMyListings();
      setMyListings(listings);

      setStats({
        totalListings: listings.length,
        availableItems: listings.filter((l) => l.status === "Available").length,
        soldItems: listings.filter((l) => l.status === "Sold").length,
        rentedItems: listings.filter((l) => l.status === "Rented").length,
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      const result = await apiUpdateProfile({ full_name: fullName, contact });
      if (onUpdateUser) onUpdateUser(result.user);
      toast.success("Profile saved successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteListing = async (e, listingId) => {
    e.stopPropagation();
    if (
      !confirm(
        "Are you sure you want to remove this listing? This cannot be undone.",
      )
    )
      return;
    try {
      await apiDeleteListing(listingId);
      toast.success("Listing removed successfully!");
      fetchDashboardData();
    } catch (error) {
      toast.error(error.message || "Failed to remove listing");
    }
  };

  const handleUpdateStatus = async (e, listingId, newStatus) => {
    e.stopPropagation();
    try {
      await apiUpdateListingStatus(listingId, newStatus);
      toast.success(`Listing marked as ${newStatus}!`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-black border-t-[hsl(var(--neo-yellow))] rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-2">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, <span className="font-bold">{user.username}</span>
                !
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-[hsl(var(--neo-yellow))] rounded-full border-4 border-black flex items-center justify-center">
                <span className="font-bold text-lg">
                  {user.username?.[0]?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="neo-card bg-[hsl(var(--neo-yellow))]"
            variants={itemVariants}
          >
            <Package className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">{stats.totalListings}</p>
            <p className="text-sm font-medium">Total Listings</p>
          </motion.div>

          <motion.div
            className="neo-card bg-white border-4 border-black"
            variants={itemVariants}
          >
            <TrendingUp className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">{stats.availableItems}</p>
            <p className="text-sm font-medium">Available</p>
          </motion.div>

          <motion.div
            className="neo-card bg-[hsl(var(--neo-green))] text-white"
            variants={itemVariants}
          >
            <CheckCircle className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">{stats.soldItems}</p>
            <p className="text-sm font-medium">Items Sold</p>
          </motion.div>

          <motion.div
            className="neo-card bg-[hsl(var(--neo-blue))] text-white"
            variants={itemVariants}
          >
            <RotateCcw className="w-8 h-8 mb-2" />
            <p className="text-3xl font-bold">{stats.rentedItems}</p>
            <p className="text-sm font-medium">Items Rented</p>
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {["overview", "selling", "profile"].map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`filter-pill capitalize whitespace-nowrap ${activeTab === tab ? "active" : ""}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {tab === "overview" && (
                <TrendingUp className="w-4 h-4 inline mr-1" />
              )}
              {tab === "selling" && (
                <ShoppingBag className="w-4 h-4 inline mr-1" />
              )}
              {tab === "profile" && <Save className="w-4 h-4 inline mr-1" />}
              {tab === "overview"
                ? "Overview"
                : tab === "selling"
                  ? "My Listings"
                  : "My Profile"}
            </motion.button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Profile Card */}
              <div className="neo-card">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Your Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[hsl(60,100%,97%)] border-2 border-black">
                    <p className="text-sm text-gray-500 mb-1">Username</p>
                    <p className="font-bold text-lg">{user.username}</p>
                  </div>
                  <div className="p-4 bg-[hsl(60,100%,97%)] border-2 border-black">
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <p className="font-bold text-sm truncate">
                      {user.college_email}
                    </p>
                  </div>
                  <div className="p-4 bg-[hsl(var(--neo-yellow))] border-2 border-black">
                    <p className="text-sm mb-1">Trust Score</p>
                    <p className="font-bold text-3xl">{user.trust_score} ⭐</p>
                  </div>
                </div>
              </div>

              {/* Quick stats recap */}
              <div className="neo-card">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Quick Summary
                </h3>
                {myListings.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-4">
                      You haven't listed anything yet.
                    </p>
                    <p className="text-sm text-gray-400">
                      Go to "Create Listing" to sell or rent your items!
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600">
                    You have <strong>{stats.totalListings}</strong> listing(s)
                    total — <strong>{stats.availableItems}</strong> available,{" "}
                    <strong>{stats.soldItems}</strong> sold,{" "}
                    <strong>{stats.rentedItems}</strong> rented.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "selling" && (
            <motion.div
              key="selling"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">My Listings</h3>
                <span className="neo-badge neo-badge-yellow">
                  {myListings.length} total
                </span>
              </div>
              {myListings.length === 0 ? (
                <div className="neo-card text-center py-12">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-4">No listings yet</p>
                  <p className="text-sm text-gray-400">
                    Create your first listing to get started!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {myListings.map((listing) => (
                    <motion.div
                      key={listing._id || listing.id}
                      onClick={() => onListingClick(listing._id || listing.id)}
                      className="neo-card flex flex-col md:flex-row gap-4 cursor-pointer hover:shadow-lg transition-shadow"
                      whileHover={{ scale: 1.01 }}
                    >
                      {/* Image */}
                      <div className="w-full md:w-32 h-32 bg-gray-200 border-4 border-black flex-shrink-0 overflow-hidden">
                        {listing.image_url ? (
                          <img
                            src={listing.image_url}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`neo-badge ${
                              listing.type === "Sell"
                                ? "neo-badge-yellow"
                                : "neo-badge-blue"
                            }`}
                          >
                            {listing.type}
                          </span>
                          <span className="neo-badge bg-white text-xs">
                            {listing.category}
                          </span>
                          <span
                            className={`neo-badge text-xs ${
                              listing.status === "Available"
                                ? "bg-[hsl(var(--neo-green))] text-white"
                                : listing.status === "Sold"
                                  ? "bg-gray-500 text-white"
                                  : "bg-[hsl(var(--neo-purple))] text-white"
                            }`}
                          >
                            {listing.status}
                          </span>
                        </div>

                        <h4 className="text-xl font-bold mb-1">
                          {listing.title}
                        </h4>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                          {listing.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">
                            ₹{listing.price}
                          </span>
                          <div className="flex items-center gap-2">
                            {(listing.status === "Sold" ||
                              listing.status === "Rented") && (
                              <>
                                <motion.button
                                  onClick={(e) =>
                                    handleUpdateStatus(
                                      e,
                                      listing._id || listing.id,
                                      "Available",
                                    )
                                  }
                                  className="neo-button bg-white text-[hsl(var(--neo-green))] text-xs py-1 px-3 border border-black flex items-center gap-1"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <RotateCcw className="w-3 h-3 flex-shrink-0" />
                                  Undo
                                </motion.button>
                                <motion.button
                                  onClick={(e) =>
                                    handleDeleteListing(
                                      e,
                                      listing._id || listing.id,
                                    )
                                  }
                                  className="neo-button bg-red-500 text-white text-xs py-1 px-3 flex items-center gap-1"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Trash2 className="w-3 h-3 flex-shrink-0" />
                                  Remove
                                </motion.button>
                              </>
                            )}
                            {listing.status === "Available" && (
                              <motion.button
                                onClick={(e) =>
                                  handleUpdateStatus(
                                    e,
                                    listing._id || listing.id,
                                    listing.type === "Sell" ? "Sold" : "Rented",
                                  )
                                }
                                className="neo-button bg-[hsl(var(--neo-green))] text-white text-xs py-1 px-3 flex items-center gap-1"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <CheckCircle className="w-3 h-3" />
                                Mark as{" "}
                                {listing.type === "Sell" ? "Sold" : "Rented"}
                              </motion.button>
                            )}
                            <span className="text-sm text-gray-500">
                              {listing.created_at || listing.createdAt
                                ? `Posted ${format(new Date(listing.created_at || listing.createdAt || ""), "MMM d, yyyy")}`
                                : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Account Info (read-only) */}
              <div className="neo-card">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" /> Account Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-[hsl(60,100%,97%)] border-2 border-black">
                    <p className="text-xs text-gray-500 mb-1">Username</p>
                    <p className="font-bold">{user.username}</p>
                  </div>
                  <div className="p-4 bg-[hsl(60,100%,97%)] border-2 border-black">
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="font-bold text-sm truncate">
                      {user.college_email}
                    </p>
                  </div>
                  <div className="p-4 bg-[hsl(var(--neo-yellow))] border-2 border-black">
                    <p className="text-xs mb-1">Trust Score</p>
                    <p className="font-bold text-2xl">{user.trust_score} ⭐</p>
                  </div>
                </div>
              </div>

              {/* Editable Details */}
              <div className="neo-card">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Save className="w-5 h-5" /> Edit Profile
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      <User className="w-4 h-4 inline mr-1" /> Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="neo-input w-full"
                      maxLength={100}
                    />

                    <p className="text-xs text-gray-400 mt-1">
                      This will be visible to buyers/sellers
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">
                      <Phone className="w-4 h-4 inline mr-1" /> Contact Number
                    </label>
                    <input
                      type="tel"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Your contact number"
                      className="neo-input w-full"
                      maxLength={20}
                    />

                    <p className="text-xs text-gray-400 mt-1">
                      Shared with the other party after agreement
                    </p>
                  </div>

                  <motion.button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="neo-button neo-button-primary w-full flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Save className="w-4 h-4" />
                    {isSavingProfile ? "Saving..." : "Save Profile"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

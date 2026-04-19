import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Users,
  Flag,
  Trash2,
  Ban,
  CheckCircle,
  AlertTriangle,
  Search,
  X,
  BarChart3,
  Activity,
  Star,
  ChevronDown,
} from "lucide-react";
import {
  apiAdminGetStats,
  apiAdminGetUsers,
  apiAdminGetAllListings,
  apiAdminGetReports,
  apiAdminToggleBan,
  apiAdminUpdateTrust,
  apiAdminDeleteListing,
  apiAdminForceStatus,
  apiAdminDismissReport,
  apiAdminActionReport,
} from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminPage(_props) {
  const [activeTab, setActiveTab] = useState("overview");
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListings: 0,
    activeListings: 0,
    pendingReports: 0,
    bannedUsers: 0,
    categoryStats: [],
    typeStats: [],
    statusStats: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [trustEditing, setTrustEditing] = useState(null);
  const [statusDropdown, setStatusDropdown] = useState(null);

  const fetchAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsData, usersData, listingsData, reportsData] =
        await Promise.all([
          apiAdminGetStats(),
          apiAdminGetUsers(),
          apiAdminGetAllListings(),
          apiAdminGetReports(),
        ]);

      setStats(statsData);
      setUsers(usersData);
      setListings(listingsData);
      setReports(reportsData);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error(error.message || "Failed to load admin data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Search handler — refetch from server with query
  const handleSearch = useCallback(
    async (query) => {
      try {
        if (activeTab === "users") {
          const data = await apiAdminGetUsers(query || undefined);
          setUsers(data);
        } else if (activeTab === "listings") {
          const data = await apiAdminGetAllListings(query || undefined);
          setListings(data);
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "users" || activeTab === "listings") {
        handleSearch(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, handleSearch]);

  // ── Actions ─────────────────────────────────────────
  const handleToggleBan = async (userId) => {
    try {
      const result = await apiAdminToggleBan(userId);
      toast.success(result.message);
      setUsers((prev) =>
        prev.map((u) =>
          (u._id || u.id) === userId ? { ...u, is_banned: !u.is_banned } : u,
        ),
      );
      // Refresh stats
      const newStats = await apiAdminGetStats();
      setStats(newStats);
    } catch (error) {
      toast.error(error.message || "Failed to update user");
    }
  };

  const handleUpdateTrust = async (userId, trust_score) => {
    try {
      await apiAdminUpdateTrust(userId, trust_score);
      toast.success("Trust score updated");
      setUsers((prev) =>
        prev.map((u) =>
          (u._id || u.id) === userId ? { ...u, trust_score } : u,
        ),
      );
      setTrustEditing(null);
    } catch (error) {
      toast.error(error.message || "Failed to update trust score");
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!confirm("Are you sure you want to permanently delete this listing?"))
      return;
    try {
      await apiAdminDeleteListing(listingId);
      toast.success("Listing deleted");
      setListings((prev) => prev.filter((l) => (l._id || l.id) !== listingId));
      const newStats = await apiAdminGetStats();
      setStats(newStats);
    } catch (error) {
      toast.error(error.message || "Failed to delete listing");
    }
  };

  const handleForceStatus = async (listingId, status) => {
    try {
      await apiAdminForceStatus(listingId, status);
      toast.success(`Listing marked as ${status}`);
      setListings((prev) =>
        prev.map((l) => ((l._id || l.id) === listingId ? { ...l, status } : l)),
      );
      setStatusDropdown(null);
      const newStats = await apiAdminGetStats();
      setStats(newStats);
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleDismissReport = async (reportId) => {
    try {
      await apiAdminDismissReport(reportId);
      toast.success("Report dismissed");
      setReports((prev) => prev.filter((r) => (r._id || r.id) !== reportId));
      const newStats = await apiAdminGetStats();
      setStats(newStats);
    } catch (error) {
      toast.error(error.message || "Failed to dismiss report");
    }
  };

  const handleActionReport = async (reportId) => {
    if (!confirm("This will delete the reported listing. Are you sure?"))
      return;
    try {
      await apiAdminActionReport(reportId);
      toast.success("Report actioned — listing removed");
      setReports((prev) => prev.filter((r) => (r._id || r.id) !== reportId));
      // Refresh listings and stats
      const [newListings, newStats] = await Promise.all([
        apiAdminGetAllListings(),
        apiAdminGetStats(),
      ]);
      setListings(newListings);
      setStats(newStats);
    } catch (error) {
      toast.error(error.message || "Failed to action report");
    }
  };

  // ── Category emoji helper ──
  const getCategoryEmoji = (cat) => {
    switch (cat) {
      case "Notes":
        return "📝";
      case "Electronics":
        return "💻";
      case "Gear":
        return "🎒";
      case "Books":
        return "📚";
      default:
        return "📦";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(0,0%,5%)] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[hsl(50,100%,50%)] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(0,0%,5%)] text-white">
      {/* Admin Header */}
      <div className="bg-[hsl(0,0%,10%)] border-b-4 border-[hsl(50,100%,50%)] p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[hsl(50,100%,50%)] flex items-center justify-center">
                <Shield className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                <p className="text-gray-400 text-sm">God Mode Activated</p>
              </div>
            </div>
            <div className="admin-caution px-4 py-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold">ADMIN ACCESS</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === "users" ? "users" : activeTab === "listings" ? "listings" : "listings, users"}...`}
              className="w-full bg-[hsl(0,0%,15%)] border-2 border-[hsl(0,0%,30%)] text-white pl-12 pr-4 py-3 focus:border-[hsl(50,100%,50%)] outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-4">
            <Users className="w-6 h-6 text-[hsl(50,100%,50%)] mb-2" />
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
            <p className="text-sm text-gray-400">Total Users</p>
          </div>
          <div className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-4">
            <BarChart3 className="w-6 h-6 text-[hsl(50,100%,50%)] mb-2" />
            <p className="text-2xl font-bold">{stats.totalListings}</p>
            <p className="text-sm text-gray-400">Total Listings</p>
          </div>
          <div className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-4">
            <Activity className="w-6 h-6 text-[hsl(50,100%,50%)] mb-2" />
            <p className="text-2xl font-bold">{stats.activeListings}</p>
            <p className="text-sm text-gray-400">Active</p>
          </div>
          <div className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-4">
            <Flag className="w-6 h-6 text-red-500 mb-2" />
            <p className="text-2xl font-bold">{stats.pendingReports}</p>
            <p className="text-sm text-gray-400">Reported</p>
          </div>
          <div className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-4">
            <Ban className="w-6 h-6 text-red-500 mb-2" />
            <p className="text-2xl font-bold">{stats.bannedUsers}</p>
            <p className="text-sm text-gray-400">Banned</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto border-b-2 border-[hsl(0,0%,30%)] pb-2">
          {["overview", "listings", "users", "reports"].map((tab) => (
            <motion.button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery("");
              }}
              className={`px-4 py-2 font-bold capitalize transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "bg-[hsl(50,100%,50%)] text-black"
                  : "bg-[hsl(0,0%,15%)] text-gray-400 hover:text-white"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {tab}
              {tab === "reports" && stats.pendingReports > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {stats.pendingReports}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* ── OVERVIEW TAB ─── */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Category Analytics */}
              <div className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-6">
                <h3 className="text-xl font-bold mb-4 text-[hsl(50,100%,50%)]">
                  Category Breakdown
                </h3>
                {stats.categoryStats.length === 0 ? (
                  <p className="text-gray-500">No listings yet.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.categoryStats.map((cat) => {
                      const percentage =
                        stats.totalListings > 0
                          ? (cat.count / stats.totalListings) * 100
                          : 0;
                      return (
                        <div key={cat._id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="flex items-center gap-2">
                              <span>{getCategoryEmoji(cat._id)}</span>
                              <span className="font-bold">{cat._id}</span>
                            </span>
                            <span className="text-gray-400">
                              {cat.count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-[hsl(0,0%,20%)] h-3">
                            <motion.div
                              className="h-full bg-[hsl(50,100%,50%)]"
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.8, delay: 0.1 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Type & Status Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-6">
                  <h3 className="text-lg font-bold mb-4 text-[hsl(50,100%,50%)]">
                    Sell vs Rent
                  </h3>
                  <div className="flex gap-4">
                    {stats.typeStats.map((t) => (
                      <div
                        key={t._id}
                        className={`flex-1 p-4 text-center border-2 ${
                          t._id === "Sell"
                            ? "border-[hsl(50,100%,50%)] bg-[hsl(50,100%,50%)]/10"
                            : "border-blue-500 bg-blue-500/10"
                        }`}
                      >
                        <p className="text-3xl font-bold">{t.count}</p>
                        <p className="text-sm text-gray-400">{t._id}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-6">
                  <h3 className="text-lg font-bold mb-4 text-[hsl(50,100%,50%)]">
                    Status Distribution
                  </h3>
                  <div className="flex gap-4">
                    {stats.statusStats.map((s) => (
                      <div
                        key={s._id}
                        className={`flex-1 p-4 text-center border-2 ${
                          s._id === "Available"
                            ? "border-green-500 bg-green-500/10"
                            : s._id === "Sold"
                              ? "border-gray-500 bg-gray-500/10"
                              : "border-purple-500 bg-purple-500/10"
                        }`}
                      >
                        <p className="text-3xl font-bold">{s.count}</p>
                        <p className="text-sm text-gray-400">{s._id}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-6">
                <h3 className="text-xl font-bold mb-4 text-[hsl(50,100%,50%)]">
                  Recent Listings
                </h3>
                <div className="space-y-3">
                  {listings.slice(0, 5).map((listing) => (
                    <div
                      key={listing._id || listing.id}
                      className="flex items-center justify-between p-3 bg-[hsl(0,0%,15%)] border border-[hsl(0,0%,30%)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[hsl(0,0%,20%)] flex items-center justify-center">
                          <span className="text-lg">
                            {getCategoryEmoji(listing.category)}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold">{listing.title}</p>
                          <p className="text-sm text-gray-400">
                            by {listing.seller?.username} • ₹{listing.price}
                            {listing.created_at || listing.createdAt
                              ? ` • ${format(new Date(listing.created_at || listing.createdAt || ""), "MMM d")}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 text-sm font-bold ${
                          listing.status === "Available"
                            ? "bg-green-600"
                            : listing.status === "Sold"
                              ? "bg-gray-600"
                              : "bg-purple-600"
                        }`}
                      >
                        {listing.status}
                      </span>
                    </div>
                  ))}
                  {listings.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No listings yet.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── LISTINGS TAB ─── */}
          {activeTab === "listings" && (
            <motion.div
              key="listings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-bold mb-4">
                All Listings ({listings.length})
              </h3>
              <div className="grid gap-4">
                {listings.map((listing) => {
                  const listingId = listing._id || listing.id;
                  return (
                    <motion.div
                      key={listingId}
                      className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-4"
                      whileHover={{ borderColor: "hsl(50,100%,50%)" }}
                    >
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-24 h-24 bg-[hsl(0,0%,15%)] border border-[hsl(0,0%,30%)] flex-shrink-0 overflow-hidden">
                          {listing.image_url ? (
                            <img
                              src={listing.image_url}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-2xl">
                                {getCategoryEmoji(listing.category)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className={`px-2 py-1 text-xs font-bold ${
                                listing.type === "Sell"
                                  ? "bg-[hsl(50,100%,50%)] text-black"
                                  : "bg-blue-600 text-white"
                              }`}
                            >
                              {listing.type}
                            </span>
                            <span className="px-2 py-1 text-xs bg-[hsl(0,0%,20%)]">
                              {listing.category}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-bold ${
                                listing.status === "Available"
                                  ? "bg-green-600"
                                  : listing.status === "Sold"
                                    ? "bg-gray-600"
                                    : "bg-purple-600"
                              }`}
                            >
                              {listing.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-lg mb-1">
                            {listing.title}
                          </h4>
                          <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                            {listing.description}
                          </p>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <span>by {listing.seller?.username}</span>
                              <span>•</span>
                              <span>₹{listing.price}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Status Dropdown */}
                              <div className="relative">
                                <motion.button
                                  onClick={() =>
                                    setStatusDropdown(
                                      statusDropdown === listingId
                                        ? null
                                        : listingId,
                                    )
                                  }
                                  className="px-3 py-1 bg-[hsl(0,0%,20%)] hover:bg-[hsl(0,0%,25%)] text-xs font-bold flex items-center gap-1 transition-colors"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  Status <ChevronDown className="w-3 h-3" />
                                </motion.button>
                                {statusDropdown === listingId && (
                                  <div className="absolute right-0 top-full mt-1 bg-[hsl(0,0%,15%)] border-2 border-[hsl(0,0%,30%)] z-10 min-w-[120px]">
                                    {["Available", "Sold", "Rented"].map(
                                      (s) => (
                                        <button
                                          key={s}
                                          onClick={() =>
                                            handleForceStatus(listingId, s)
                                          }
                                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-[hsl(0,0%,25%)] transition-colors ${
                                            listing.status === s
                                              ? "text-[hsl(50,100%,50%)] font-bold"
                                              : ""
                                          }`}
                                        >
                                          {s}
                                        </button>
                                      ),
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Delete Button */}
                              <motion.button
                                onClick={() => handleDeleteListing(listingId)}
                                className="p-2 bg-red-600 hover:bg-red-700 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Delete listing"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {listings.length === 0 && (
                  <div className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-8 text-center">
                    <p className="text-gray-400">No listings found.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── USERS TAB ─── */}
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-bold mb-4">
                All Users ({users.length})
              </h3>
              <div className="grid gap-4">
                {users.map((u) => {
                  const uid = u._id || u.id;
                  const isEditingTrust = trustEditing?.userId === uid;

                  return (
                    <motion.div
                      key={uid}
                      className={`bg-[hsl(0,0%,10%)] border-2 p-4 ${
                        u.is_banned
                          ? "border-red-600"
                          : "border-[hsl(0,0%,30%)]"
                      }`}
                      whileHover={{
                        borderColor: u.is_banned ? "red" : "hsl(50,100%,50%)",
                      }}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                              u.is_banned
                                ? "bg-red-600"
                                : "bg-[hsl(50,100%,50%)] text-black"
                            }`}
                          >
                            {u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold">{u.username}</p>
                              {u.is_admin && (
                                <span className="px-2 py-0.5 bg-[hsl(50,100%,50%)] text-black text-xs font-bold">
                                  ADMIN
                                </span>
                              )}
                              {u.is_banned && (
                                <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold">
                                  BANNED
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">
                              {u.college_email}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                              {/* Inline trust score editor */}
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-[hsl(50,100%,50%)]" />
                                {isEditingTrust ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={trustEditing.value}
                                      onChange={(e) =>
                                        setTrustEditing({
                                          userId: uid,
                                          value: Number(e.target.value),
                                        })
                                      }
                                      className="w-14 bg-[hsl(0,0%,20%)] text-white text-xs px-1 py-0.5 border border-[hsl(0,0%,40%)] outline-none"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          handleUpdateTrust(
                                            uid,
                                            trustEditing.value,
                                          );
                                        if (e.key === "Escape")
                                          setTrustEditing(null);
                                      }}
                                      autoFocus
                                    />

                                    <button
                                      onClick={() =>
                                        handleUpdateTrust(
                                          uid,
                                          trustEditing.value,
                                        )
                                      }
                                      className="text-green-400 hover:text-green-300 text-xs"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={() => setTrustEditing(null)}
                                      className="text-red-400 hover:text-red-300 text-xs"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() =>
                                      setTrustEditing({
                                        userId: uid,
                                        value: u.trust_score,
                                      })
                                    }
                                    className="hover:text-[hsl(50,100%,50%)] transition-colors cursor-pointer"
                                    title="Click to edit trust score"
                                  >
                                    Trust: {u.trust_score}
                                  </button>
                                )}
                              </div>
                              <span>•</span>
                              <span>
                                Joined{" "}
                                {u.created_at
                                  ? format(
                                      new Date(u.created_at),
                                      "MMM d, yyyy",
                                    )
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {!u.is_admin && (
                          <motion.button
                            onClick={() => handleToggleBan(uid)}
                            className={`p-2 transition-colors flex items-center gap-2 text-sm font-bold ${
                              u.is_banned
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-red-600 hover:bg-red-700"
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {u.is_banned ? (
                              <>
                                <CheckCircle className="w-4 h-4" /> Unban
                              </>
                            ) : (
                              <>
                                <Ban className="w-4 h-4" /> Ban
                              </>
                            )}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {users.length === 0 && (
                  <div className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-8 text-center">
                    <p className="text-gray-400">No users found.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── REPORTS TAB ─── */}
          {activeTab === "reports" && (
            <motion.div
              key="reports"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-bold mb-4">
                Pending Reports ({reports.length})
              </h3>
              {reports.length === 0 ? (
                <div className="bg-[hsl(0,0%,10%)] border-2 border-[hsl(0,0%,30%)] p-8 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <p className="text-gray-400">No reports to review! 🎉</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {reports.map((report) => (
                    <motion.div
                      key={report._id || report.id}
                      className="bg-[hsl(0,0%,10%)] border-2 border-red-600 p-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Flag className="w-5 h-5 text-red-500" />
                          <span className="font-bold text-red-400">
                            REPORTED
                          </span>
                        </div>
                        <span className="text-sm text-gray-400">
                          {report.created_at
                            ? format(new Date(report.created_at), "MMM d, yyyy")
                            : ""}
                        </span>
                      </div>

                      {report.listing ? (
                        <div className="bg-[hsl(0,0%,15%)] p-4 mb-4 border border-[hsl(0,0%,30%)]">
                          <p className="font-bold mb-2">
                            {report.listing.title}
                          </p>
                          <p className="text-sm text-gray-400 mb-2">
                            {report.listing.description}
                          </p>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Seller:</span>
                            <span>{report.listing.seller?.username}</span>
                            <span className="text-gray-500">•</span>
                            <span>₹{report.listing.price}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[hsl(0,0%,15%)] p-4 mb-4 border border-[hsl(0,0%,30%)]">
                          <p className="text-gray-500 italic">
                            Listing has been deleted
                          </p>
                        </div>
                      )}

                      <div className="bg-red-900/30 border border-red-600/50 p-3 mb-4">
                        <p className="text-sm text-red-300">
                          <span className="font-bold">Reason:</span>{" "}
                          {report.reason}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Reported by: {report.reporter?.username}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {report.listing && (
                          <motion.button
                            onClick={() =>
                              handleActionReport(report._id || report.id)
                            }
                            className="flex-1 p-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Trash2 className="w-4 h-4 inline mr-1" />
                            Delete Listing
                          </motion.button>
                        )}
                        <motion.button
                          onClick={() =>
                            handleDismissReport(report._id || report.id)
                          }
                          className="flex-1 p-2 bg-[hsl(0,0%,20%)] hover:bg-[hsl(0,0%,25%)] text-white font-bold text-sm transition-colors"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <X className="w-4 h-4 inline mr-1" />
                          Dismiss
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

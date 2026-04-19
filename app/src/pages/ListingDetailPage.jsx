import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MessageCircle,
  MapPin,
  Shield,
  Calendar,
  IndianRupee,
  User,
  Flag,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  apiGetListing,
  apiCreateOrGetRoom,
  apiDeleteListing,
  apiReportListing,
  apiUpdateListingStatus,
} from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ListingDetailPage({
  listingId,
  user,
  onBack,
  onChatClick,
}) {
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchListing();
  }, [listingId]);

  const fetchListing = async () => {
    try {
      setIsLoading(true);
      const data = await apiGetListing(listingId);
      setListing(data);
    } catch (error) {
      console.error("Error fetching listing:", error);
      toast.error("Failed to load listing");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = async () => {
    try {
      setIsStartingChat(true);
      const room = await apiCreateOrGetRoom(listingId);
      const roomId = room._id || room.id;
      if (onChatClick && roomId) {
        onChatClick(roomId);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error(error.message || "Failed to start chat");
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!listing) return;
    try {
      setIsDeleting(true);
      await apiDeleteListing(listing._id || listing.id);
      toast.success("Listing removed successfully!");
      setShowDeleteConfirm(false);
      onBack();
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast.error(error.message || "Failed to remove listing");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!listing) return;
    try {
      setIsUpdatingStatus(true);
      await apiUpdateListingStatus(listing._id || listing.id, newStatus);
      toast.success(`Listing marked as ${newStatus}!`);
      // Update local state
      setListing({ ...listing, status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    try {
      setIsReporting(true);
      const result = await apiReportListing(listingId, reportReason.trim());
      toast.success(
        result.message ||
          "Report submitted. Thank you for helping keep our community safe!",
      );
      setShowReportModal(false);
      setReportReason("");
    } catch (error) {
      toast.error(error.message || "Failed to submit report");
    } finally {
      setIsReporting(false);
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

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="neo-card text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Listing Not Found</h2>
          <p className="text-gray-600 mb-4">
            This listing may have been removed or is no longer available.
          </p>
          <motion.button
            onClick={onBack}
            className="neo-button neo-button-primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Go Back
          </motion.button>
        </div>
      </div>
    );
  }

  const listingSellerId =
    typeof listing.seller_id === "object"
      ? listing.seller_id?._id?.toString()
      : listing.seller_id?.toString();
  const userId = (user._id || user.id)?.toString();
  const isMyListing = listingSellerId === userId;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <motion.div
        className="sticky top-0 z-10 bg-white border-b-4 border-black p-4"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <motion.button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>
          <h1 className="text-xl font-bold">Listing Details</h1>
          <motion.button
            onClick={() => setShowReportModal(true)}
            className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Flag className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Image */}
        <motion.div
          className="relative bg-gray-200 border-4 border-black mb-6 overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="aspect-video">
            {listing.image_url ? (
              <img
                src={listing.image_url}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <span className="text-6xl">📦</span>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span
              className={`neo-badge ${
                listing.type === "Sell" ? "neo-badge-yellow" : "neo-badge-blue"
              }`}
            >
              {listing.type === "Sell" ? "For Sale" : "For Rent"}
            </span>
            <span className="neo-badge bg-white">{listing.category}</span>
          </div>

          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            <span
              className={`neo-badge ${
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
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Title & Price */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">{listing.title}</h2>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  Posted{" "}
                  {listing.created_at || listing.createdAt
                    ? format(
                        new Date(listing.created_at || listing.createdAt || ""),
                        "MMMM d, yyyy",
                      )
                    : "Recently"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">₹{listing.price}</p>
              {listing.type === "Rent" && (
                <p className="text-gray-600">per day</p>
              )}
            </div>
          </div>

          {/* Seller Info */}
          <div className="neo-card bg-gray-50 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[hsl(var(--neo-yellow))] rounded-full flex items-center justify-center border-4 border-black">
                <span className="text-2xl font-bold">
                  {listing.seller?.username?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">{listing.seller?.username}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[hsl(var(--neo-green))]" />
                  <span>Trust Score: {listing.seller?.trust_score}</span>
                </div>
              </div>
              {!isMyListing && listing.status === "Available" && (
                <motion.button
                  onClick={handleStartChat}
                  disabled={isStartingChat}
                  className="neo-button neo-button-primary disabled:opacity-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MessageCircle className="w-5 h-5 inline mr-2" />
                  {isStartingChat ? "Starting..." : "Chat"}
                </motion.button>
              )}
            </div>
          </div>

          {/* Action Panel for Seller */}
          {isMyListing && listing.status === "Available" && (
            <motion.div
              className="neo-card bg-[hsl(var(--neo-green))] border-black mb-6 flex flex-col md:flex-row items-center justify-between gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <h3 className="font-bold text-white text-lg">Manage Listing</h3>
                <p className="text-sm text-green-100">
                  Has this item been{" "}
                  {listing.type === "Sell" ? "sold" : "rented"}?
                </p>
              </div>
              <motion.button
                onClick={() =>
                  handleUpdateStatus(
                    listing.type === "Sell" ? "Sold" : "Rented",
                  )
                }
                disabled={isUpdatingStatus}
                className="neo-button bg-white text-green-700 disabled:opacity-50 flex-shrink-0 flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Check className="w-5 h-5" />
                {isUpdatingStatus
                  ? "Updating..."
                  : `Mark as ${listing.type === "Sell" ? "Sold" : "Rented"}`}
              </motion.button>
            </motion.div>
          )}

          {/* Remove Listing Button — only for seller when Sold or Rented */}
          {isMyListing &&
            (listing.status === "Sold" || listing.status === "Rented") && (
              <motion.div
                className="neo-card bg-red-50 border-red-300 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-red-700 mb-1">
                      This item has been {listing.status.toLowerCase()}
                    </p>
                    <p className="text-sm text-red-600">
                      You can remove this listing since the transaction is
                      complete, or mark it as available again.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => handleUpdateStatus("Available")}
                      disabled={isUpdatingStatus}
                      className="neo-button bg-white text-[hsl(var(--neo-green))] flex-shrink-0 flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      {isUpdatingStatus ? "Updating..." : "Undo"}
                    </motion.button>
                    <motion.button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="neo-button bg-red-500 text-white flex-shrink-0 flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-3">Description</h3>
            <div className="neo-card bg-white">
              <p className="whitespace-pre-wrap">{listing.description}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="neo-card bg-[hsl(var(--neo-yellow))]">
              <p className="text-sm text-gray-700 mb-1">Category</p>
              <p className="font-bold text-lg">{listing.category}</p>
            </div>
            <div className="neo-card bg-[hsl(var(--neo-blue))] text-white">
              <p className="text-sm opacity-80 mb-1">Type</p>
              <p className="font-bold text-lg">{listing.type}</p>
            </div>
            {listing.type === "Rent" && (
              <>
                <div className="neo-card bg-[hsl(var(--neo-green))] text-white">
                  <p className="text-sm opacity-80 mb-1">Max Days</p>
                  <p className="font-bold text-lg">{listing.max_days} days</p>
                </div>
                <div className="neo-card bg-[hsl(var(--neo-pink))] text-white">
                  <p className="text-sm opacity-80 mb-1">Security Deposit</p>
                  <p className="font-bold text-lg">
                    ₹{listing.security_deposit}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Safety Tips */}
          <div className="neo-card bg-[hsl(var(--neo-yellow))]">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5" />
              <h3 className="font-bold">Safety Tips</h3>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Meet in public campus locations like the Library, Canteen, or
                  North Gate
                </span>
              </li>
              <li className="flex items-start gap-2">
                <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Verify the item before completing the transaction</span>
              </li>
              <li className="flex items-start gap-2">
                <IndianRupee className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Use cash or trusted payment methods</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="neo-card bg-white max-w-md w-full"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="flex items-center gap-2 mb-4 text-red-500">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-xl font-bold">Remove Listing</h3>
            </div>

            <p className="text-gray-600 mb-2">
              Are you sure you want to remove <strong>{listing.title}</strong>{" "}
              from your listings?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone. The listing will be permanently
              deleted.
            </p>

            <div className="flex gap-3">
              <motion.button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 neo-button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isDeleting}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleDeleteListing}
                disabled={isDeleting}
                className="flex-1 neo-button bg-red-500 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? "Removing..." : "Yes, Remove"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="neo-card bg-white max-w-md w-full"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="flex items-center gap-2 mb-4 text-red-500">
              <Flag className="w-6 h-6" />
              <h3 className="text-xl font-bold">Report Listing</h3>
            </div>

            <p className="text-gray-600 mb-4">
              Please tell us why you're reporting this listing. This helps us
              keep the marketplace safe.
            </p>

            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="e.g., Prohibited item, inappropriate content, scam..."
              className="neo-input w-full min-h-[120px] mb-4 resize-none"
            />

            <div className="flex gap-3">
              <motion.button
                onClick={() => setShowReportModal(false)}
                className="flex-1 neo-button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleReport}
                disabled={!reportReason.trim() || isReporting}
                className="flex-1 neo-button bg-red-500 text-white disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isReporting ? "Submitting..." : "Submit Report"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

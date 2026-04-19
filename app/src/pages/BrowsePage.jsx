import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, ShoppingCart, Clock } from "lucide-react";
import { apiGetListings } from "@/lib/api";
import { toast } from "sonner";

export default function BrowsePage({ user, onListingClick }) {
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    filterListings();
  }, [listings, searchQuery, selectedType, selectedCategory]);

  const fetchListings = async () => {
    try {
      setIsLoading(true);
      const data = await apiGetListings();
      setListings(data);
    } catch (error) {
      console.error("Error fetching listings:", error);
      toast.error("Failed to load listings");
    } finally {
      setIsLoading(false);
    }
  };

  const filterListings = () => {
    let filtered = [...listings];

    if (searchQuery) {
      filtered = filtered.filter(
        (l) =>
          l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (selectedType !== "all") {
      filtered = filtered.filter((l) => l.type === selectedType);
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((l) => l.category === selectedCategory);
    }

    setFilteredListings(filtered);
  };

  const categories = [
    { value: "all", label: "All", color: "bg-black text-white" },
    { value: "Notes", label: "Notes", color: "bg-[hsl(var(--neo-yellow))]" },
    {
      value: "Electronics",
      label: "Electronics",
      color: "bg-[hsl(var(--neo-blue))] text-white",
    },
    {
      value: "Gear",
      label: "Gear",
      color: "bg-[hsl(var(--neo-pink))] text-white",
    },
    {
      value: "Books",
      label: "Books",
      color: "bg-[hsl(var(--neo-green))] text-white",
    },
    {
      value: "Other",
      label: "Other",
      color: "bg-[hsl(var(--neo-purple))] text-white",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <motion.div
        className="max-w-7xl mx-auto mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Browse Listings</h1>
            <p className="text-gray-600">
              Find what you need from fellow VIT students
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="neo-badge neo-badge-yellow">
              {filteredListings.length} items
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for notes, electronics, gear..."
            className="neo-input w-full pl-12 pr-4 py-4 text-lg"
          />
        </div>

        {/* Filters */}
        <div className="flex overflow-x-auto gap-3 mb-6 pb-1 scrollbar-hide">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedType("all")}
              className={`filter-pill ${selectedType === "all" ? "active" : ""}`}
            >
              <Filter className="w-4 h-4 inline mr-1" />
              All Types
            </button>
            <button
              onClick={() => setSelectedType("Sell")}
              className={`filter-pill ${selectedType === "Sell" ? "active" : ""}`}
            >
              <ShoppingCart className="w-4 h-4 inline mr-1" />
              Buy
            </button>
            <button
              onClick={() => setSelectedType("Rent")}
              className={`filter-pill ${selectedType === "Rent" ? "active" : ""}`}
            >
              <Clock className="w-4 h-4 inline mr-1" />
              Rent
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <motion.button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 font-bold text-sm border-3 border-black transition-all ${
                selectedCategory === cat.value
                  ? `${cat.color} shadow-[3px_3px_0_0_black]`
                  : "bg-white hover:shadow-[2px_2px_0_0_black]"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {cat.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Listings Grid */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-black border-t-[hsl(var(--neo-yellow))] rounded-full"
            />
          </div>
        ) : filteredListings.length === 0 ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="neo-card inline-block mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No listings found</h3>
            <p className="text-gray-600">
              {listings.length === 0
                ? 'Be the first to list something! Click "Create Listing" to get started.'
                : "Try adjusting your filters or search query"}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredListings.map((listing) => {
              const sellerId =
                typeof listing.seller_id === "object"
                  ? listing.seller_id?._id || listing.seller_id
                  : listing.seller_id;
              const isOwner = user.id === sellerId || user._id === sellerId;

              return (
                <motion.div
                  key={listing._id || listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="cursor-pointer overflow-hidden bg-white border-4 border-black"
                  style={{ boxShadow: "6px 6px 0 0 black" }}
                  whileHover={{ y: -4, boxShadow: "10px 10px 0 0 black" }}
                  onClick={() => onListingClick(listing._id || listing.id)}
                >
                  {/* Image */}
                  <div className="relative bg-gray-100 h-48 overflow-hidden border-b-4 border-black">
                    {listing.image_url ? (
                      <img
                        src={listing.image_url}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <ShoppingCart className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    {/* Type Badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`neo-badge ${
                          listing.type === "Sell"
                            ? "neo-badge-yellow"
                            : "neo-badge-blue"
                        }`}
                      >
                        {listing.type === "Sell" ? "For Sale" : "For Rent"}
                      </span>
                    </div>
                    {/* Category Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="neo-badge bg-white">
                        {listing.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1 line-clamp-1">
                      {listing.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {listing.description}
                    </p>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold">
                        ₹{listing.price}
                      </span>
                      {listing.type === "Rent" && listing.max_days && (
                        <span className="text-xs text-gray-500">
                          up to {listing.max_days} days
                        </span>
                      )}
                    </div>

                    {/* Seller Info */}
                    <div className="flex items-center justify-between pt-3 border-t-2 border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-[hsl(var(--neo-yellow))] rounded-full flex items-center justify-center border-2 border-black">
                          <span className="font-bold text-xs">
                            {(listing.seller?.username || "U")[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {listing.seller?.username || "Unknown"}
                        </span>
                      </div>
                      {isOwner && (
                        <span className="neo-badge bg-[hsl(var(--neo-yellow))] text-xs">
                          Yours
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

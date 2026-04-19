import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  ShoppingCart,
  Clock,
  Check,
  Camera,
  IndianRupee,
  Shield,
  Calendar,
} from "lucide-react";
import { apiCreateListing, fileToBase64 } from "@/lib/api";
import { toast } from "sonner";

const steps = [
  { id: 1, title: "Basic Info", icon: ShoppingCart },
  { id: 2, title: "Details", icon: Clock },
  { id: 3, title: "Pricing", icon: IndianRupee },
  { id: 4, title: "Review", icon: Check },
];

const categories = [
  { value: "Notes", label: "Notes", icon: "📝" },
  { value: "Electronics", label: "Electronics", icon: "💻" },
  { value: "Gear", label: "Gear", icon: "🎒" },
  { value: "Books", label: "Books", icon: "📚" },
  { value: "Other", label: "Other", icon: "📦" },
];

export default function CreateListingPage({ user, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Notes");
  const [type, setType] = useState("Sell");
  const [price, setPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [maxDays, setMaxDays] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!title.trim() || !description.trim()) {
        toast.error("Please fill in all fields");
        return;
      }
    }
    if (currentStep === 2 && !category) {
      toast.error("Please select a category");
      return;
    }
    if (currentStep === 3) {
      if (!price || parseFloat(price) <= 0) {
        toast.error("Please enter a valid price");
        return;
      }
      if (type === "Sell" && (!minPrice || parseFloat(minPrice) <= 0)) {
        toast.error("Please enter a minimum price");
        return;
      }
      if (type === "Rent" && (!securityDeposit || !maxDays)) {
        toast.error("Please fill in all rental details");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let imageUrl = null;

      // Convert image to base64 for storage
      if (image) {
        imageUrl = await fileToBase64(image);
      }

      await apiCreateListing({
        title: title.trim(),
        description: description.trim(),
        category,
        type,
        price: parseFloat(price),
        min_price: type === "Sell" ? parseFloat(minPrice) : null,
        security_deposit: type === "Rent" ? parseFloat(securityDeposit) : null,
        max_days: type === "Rent" ? parseInt(maxDays) : null,
        image_url: imageUrl,
      });

      onSuccess();
    } catch (error) {
      toast.error(error.message || "Failed to create listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Listing Type Toggle */}
            <div>
              <label className="block font-bold mb-3">Listing Type</label>
              <div className="flex gap-4">
                <motion.button
                  onClick={() => setType("Sell")}
                  className={`flex-1 p-4 border-4 border-black text-left transition-all ${
                    type === "Sell" ? "bg-[hsl(var(--neo-yellow))]" : "bg-white"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ShoppingCart className="w-8 h-8 mb-2" />
                  <p className="font-bold text-lg">Sell</p>
                  <p className="text-sm text-gray-600">
                    Sell an item permanently
                  </p>
                </motion.button>
                <motion.button
                  onClick={() => setType("Rent")}
                  className={`flex-1 p-4 border-4 border-black text-left transition-all ${
                    type === "Rent"
                      ? "bg-[hsl(var(--neo-blue))] text-white"
                      : "bg-white"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Clock className="w-8 h-8 mb-2" />
                  <p className="font-bold text-lg">Rent</p>
                  <p className="text-sm opacity-80">Lend item for a period</p>
                </motion.button>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are you selling/renting?"
                className="neo-input w-full"
                maxLength={100}
              />

              <p className="text-sm text-gray-500 mt-1">{title.length}/100</p>
            </div>

            <div>
              <label className="block font-bold mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your item in detail..."
                className="neo-input w-full min-h-[120px] resize-none"
                maxLength={500}
              />

              <p className="text-sm text-gray-500 mt-1">
                {description.length}/500
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block font-bold mb-3">Category</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <motion.button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`p-4 border-4 border-black text-center transition-all ${
                      category === cat.value
                        ? "bg-[hsl(var(--neo-yellow))]"
                        : "bg-white hover:bg-gray-50"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-3xl mb-2 block">{cat.icon}</span>
                    <p className="font-bold">{cat.label}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block font-bold mb-3">Photo (Optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-w-md h-64 object-cover border-4 border-black"
                  />

                  <motion.button
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white border-3 border-black flex items-center justify-center"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-md h-64 border-4 border-dashed border-black flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Camera className="w-12 h-12 mb-4 text-gray-400" />
                  <p className="font-bold text-gray-600">
                    Click to upload photo
                  </p>
                  <p className="text-sm text-gray-400">Max 5MB</p>
                </motion.button>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {type === "Sell" ? (
              <>
                <div>
                  <label className="block font-bold mb-2">
                    Public Price (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" />
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Enter your asking price"
                      className="neo-input w-full pl-12"
                      min="1"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    This is the price buyers will see
                  </p>
                </div>

                <div className="p-4 bg-[hsl(var(--neo-yellow))] border-4 border-black">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5" />
                    <span className="font-bold">Hidden Minimum Price</span>
                  </div>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" />
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Lowest price you'll accept"
                      className="neo-input w-full pl-12"
                      min="1"
                    />
                  </div>
                  <p className="text-sm mt-2">
                    Hidden from buyers. Used for negotiation.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block font-bold mb-2">
                    Rental Price per Day (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" />
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Daily rental price"
                      className="neo-input w-full pl-12"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-2">
                    Security Deposit (₹)
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" />
                    <input
                      type="number"
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(e.target.value)}
                      placeholder="Security deposit amount"
                      className="neo-input w-full pl-12"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-2">
                    Maximum Rental Days
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" />
                    <input
                      type="number"
                      value={maxDays}
                      onChange={(e) => setMaxDays(e.target.value)}
                      placeholder="Maximum days for rent"
                      className="neo-input w-full pl-12"
                      min="1"
                      max="365"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Review Your Listing</h3>

            <div className="neo-card bg-gray-50">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover border-b-4 border-black mb-4"
                />
              )}

              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`neo-badge ${type === "Sell" ? "neo-badge-yellow" : "neo-badge-blue"}`}
                >
                  {type === "Sell" ? "For Sale" : "For Rent"}
                </span>
                <span className="neo-badge bg-white">{category}</span>
              </div>

              <h4 className="text-2xl font-bold mb-2">{title}</h4>
              <p className="text-gray-600 mb-4">{description}</p>

              <div className="border-t-4 border-black pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">
                    {type === "Sell" ? "Price" : "Price per Day"}
                  </span>
                  <span className="text-2xl font-bold">₹{price}</span>
                </div>
                {type === "Sell" && (
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Minimum Acceptable (Hidden)</span>
                    <span>₹{minPrice}</span>
                  </div>
                )}
                {type === "Rent" && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span>Security Deposit</span>
                      <span>₹{securityDeposit}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Max Days</span>
                      <span>{maxDays} days</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-[hsl(var(--neo-green))] text-white border-4 border-black">
              <p className="font-bold flex items-center gap-2">
                <Check className="w-5 h-5" />
                Ready to publish!
              </p>
              <p className="text-sm mt-1 opacity-90">
                Your listing will be visible to all VIT students.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-2">Create Listing</h1>
          <p className="text-gray-600">List your item for sale or rent</p>
        </motion.div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <motion.div
                className={`step-indicator ${currentStep === step.id ? "active" : ""} ${currentStep > step.id ? "completed" : ""}`}
                initial={false}
                animate={{
                  scale: currentStep === step.id ? 1.1 : 1,
                  backgroundColor:
                    currentStep > step.id
                      ? "#22c55e"
                      : currentStep === step.id
                        ? "#fef08a"
                        : "#ffffff",
                }}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </motion.div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 md:w-24 h-1 mx-2 ${currentStep > step.id ? "bg-green-500" : "bg-gray-300"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Content */}
        <div className="neo-card bg-white min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <motion.button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="neo-button disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: currentStep === 1 ? 1 : 1.05 }}
            whileTap={{ scale: currentStep === 1 ? 1 : 0.95 }}
          >
            <ChevronLeft className="w-5 h-5 inline mr-1" />
            Back
          </motion.button>

          {currentStep < 4 ? (
            <motion.button
              onClick={handleNext}
              className="neo-button neo-button-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Next
              <ChevronRight className="w-5 h-5 inline ml-1" />
            </motion.button>
          ) : (
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="neo-button neo-button-green"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Publishing...
                </span>
              ) : (
                <>
                  <Check className="w-5 h-5 inline mr-1" />
                  Publish Listing
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

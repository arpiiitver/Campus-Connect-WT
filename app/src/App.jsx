import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiGetMe, clearToken } from "@/lib/api";

import LoginPage from "@/pages/LoginPage";
import BrowsePage from "@/pages/BrowsePage";
import CreateListingPage from "@/pages/CreateListingPage";
import DashboardPage from "@/pages/DashboardPage";
import ChatPage from "@/pages/ChatPage";
import AdminPage from "@/pages/AdminPage";
import ListingDetailPage from "@/pages/ListingDetailPage";

import MobileNav from "@/components/MobileNav";
import DesktopNav from "@/components/DesktopNav";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

function App() {
  const [currentView, setCurrentView] = useState("browse");
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app load, restore session from localStorage token
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("cc_token");
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await apiGetMe();
        setUser(data.user);
      } catch {
        // Token invalid/expired — clear it
        clearToken();
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const handleLogin = (profile) => {
    setUser(profile);
    setCurrentView("browse");
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setCurrentView("browse");
    toast.success("Logged out successfully");
  };

  const navigateToListing = (listingId) => {
    setSelectedListingId(listingId);
    setCurrentView("listing");
  };

  const navigateToChat = (chatId) => {
    setSelectedChatId(chatId);
    setCurrentView("chat");
  };

  const navigateToBrowse = () => {
    setSelectedListingId(null);
    setCurrentView("browse");
  };

  const renderContent = () => {
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

    if (!user) {
      return <LoginPage onLogin={handleLogin} />;
    }

    if (user.is_banned) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <div className="neo-card bg-red-500 text-white max-w-md text-center">
            <h1 className="text-3xl font-bold mb-4">Account Banned</h1>
            <p className="mb-6">
              Your account has been suspended. Please contact support.
            </p>
            <button onClick={handleLogout} className="neo-button">
              Logout
            </button>
          </div>
        </div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="pb-20 md:pb-0"
        >
          {currentView === "browse" && (
            <BrowsePage
              user={user}
              onListingClick={navigateToListing}
              onChatClick={navigateToChat}
            />
          )}
          {currentView === "listing" && selectedListingId && (
            <ListingDetailPage
              listingId={selectedListingId}
              user={user}
              onBack={navigateToBrowse}
              onChatClick={navigateToChat}
            />
          )}
          {currentView === "create" && (
            <CreateListingPage
              user={user}
              onSuccess={() => {
                toast.success("Listing created successfully!");
                setCurrentView("browse");
              }}
            />
          )}
          {currentView === "dashboard" && (
            <DashboardPage
              user={user}
              onListingClick={navigateToListing}
              onChatClick={navigateToChat}
            />
          )}
          {currentView === "chat" && (
            <ChatPage
              user={user}
              chatId={selectedChatId}
              onBack={() => setCurrentView("dashboard")}
            />
          )}
          {currentView === "admin" && user.is_admin && (
            <AdminPage user={user} />
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-[hsl(60,100%,97%)]">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "white",
            border: "3px solid black",
            boxShadow: "6px 6px 0 0 black",
            fontFamily: "Space Grotesk, sans-serif",
          },
        }}
      />

      {user && !user.is_banned && (
        <>
          <DesktopNav
            currentView={currentView}
            onNavigate={setCurrentView}
            user={user}
            onLogout={handleLogout}
          />

          <MobileNav
            currentView={currentView}
            onNavigate={setCurrentView}
            user={user}
            onLogout={handleLogout}
          />
        </>
      )}

      <main className={user ? "md:pt-20" : ""}>{renderContent()}</main>
    </div>
  );
}

export default App;

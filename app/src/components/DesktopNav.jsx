import { motion } from "framer-motion";
import {
  Home,
  PlusCircle,
  LayoutDashboard,
  MessageSquare,
  Shield,
  LogOut,
  ShoppingBag,
  User,
} from "lucide-react";

const navItems = [
  { id: "browse", label: "Browse", icon: Home },
  { id: "create", label: "Create Listing", icon: PlusCircle },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "chat", label: "Messages", icon: MessageSquare },
];

export default function DesktopNav({
  currentView,
  onNavigate,
  user,
  onLogout,
}) {
  const items = user.is_admin
    ? [...navItems, { id: "admin", label: "Admin", icon: Shield }]
    : navItems;

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 bg-white border-b-4 border-black z-50 hidden md:block"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-10 h-10 bg-[hsl(var(--neo-yellow))] border-3 border-black flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">VIT Market</span>
          </motion.div>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            {items.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;

              return (
                <motion.button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`relative px-4 py-2 font-bold flex items-center gap-2 transition-all ${
                    isActive
                      ? "bg-[hsl(var(--neo-yellow))]"
                      : "hover:bg-gray-100"
                  }`}
                  style={{
                    border: "3px solid black",
                    boxShadow: isActive ? "3px 3px 0 0 black" : "none",
                    transform: isActive ? "translate(-2px, -2px)" : "none",
                  }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "3px 3px 0 0 black",
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>

                  {item.id === "admin" && (
                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs">
                      GOD
                    </span>
                  )}
                </motion.button>
              );
            })}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[hsl(var(--neo-yellow))] rounded-full flex items-center justify-center border-3 border-black">
                <User className="w-5 h-5" />
              </div>
              <div className="hidden lg:block">
                <p className="font-bold text-sm">{user.username}</p>
                <p className="text-xs text-gray-500">
                  Trust: {user.trust_score}
                </p>
              </div>
            </div>

            <motion.button
              onClick={onLogout}
              className="p-2 hover:bg-red-50 text-red-500 border-3 border-transparent hover:border-red-200 rounded-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

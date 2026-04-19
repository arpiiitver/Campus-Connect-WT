import { motion } from "framer-motion";
import {
  Home,
  PlusCircle,
  LayoutDashboard,
  MessageSquare,
  Shield,
  LogOut,
} from "lucide-react";

const navItems = [
  { id: "browse", label: "Browse", icon: Home },
  { id: "create", label: "Sell", icon: PlusCircle },
  { id: "dashboard", label: "My Stuff", icon: LayoutDashboard },
  { id: "chat", label: "Chats", icon: MessageSquare },
];

export default function MobileNav({ currentView, onNavigate, user, onLogout }) {
  const items = user.is_admin
    ? [...navItems, { id: "admin", label: "Admin", icon: Shield }]
    : navItems;

  return (
    <nav className="mobile-nav md:hidden">
      <div className="flex justify-around items-center">
        {items.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`mobile-nav-item flex-1 ${isActive ? "active" : ""}`}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Icon
                  className={`w-6 h-6 mb-1 ${isActive ? "text-black" : "text-gray-500"}`}
                />
              </motion.div>
              <span
                className={`text-xs font-bold ${isActive ? "text-black" : "text-gray-500"}`}
              >
                {item.label}
              </span>

              {isActive && (
                <motion.div
                  className="absolute -top-1 w-8 h-1 bg-black rounded-full"
                  layoutId="mobileNavIndicator"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}

        {/* Logout Button */}
        <motion.button
          onClick={onLogout}
          className="mobile-nav-item flex-shrink-0 px-3"
          whileTap={{ scale: 0.9 }}
        >
          <LogOut className="w-6 h-6 mb-1 text-red-500" />
          <span className="text-xs font-bold text-red-500">Logout</span>
        </motion.button>
      </div>
    </nav>
  );
}

import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, Heart, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/profiles", label: "Discover", icon: Heart },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/writings", label: "From the Writings", icon: BookOpen },
  { to: "/profile-setup", label: "Profile", icon: User },
] as const;

const VISIBLE_PATHS = new Set<string>(tabs.map((t) => t.to));

export const BottomNav = () => {
  const location = useLocation();
  if (!VISIBLE_PATHS.has(location.pathname)) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom,0px)] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end
                className={({ isActive }) =>
                  cn(
                    "flex h-full flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium leading-tight transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className="h-5 w-5"
                      fill={Icon === Heart && isActive ? "currentColor" : "none"}
                    />
                    <span className="text-center">{tab.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;

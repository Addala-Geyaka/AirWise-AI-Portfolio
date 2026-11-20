import { NavLink } from "react-router-dom";
import {
  Activity,
  Home,
  Leaf,
  ListChecks,
  SlidersHorizontal,
  UsersRound,
  Wind,
} from "lucide-react";

const items = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/family", label: "Family profile", icon: UsersRound },
  { to: "/planner", label: "Daily planner", icon: ListChecks },
  { to: "/indoor", label: "Indoor air", icon: Wind },
  { to: "/alternatives", label: "Better choices", icon: Leaf },
  { to: "/simulator", label: "What if?", icon: SlidersHorizontal },
  { to: "/progress", label: "Your progress", icon: Activity },
];

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <NavLink to="/" className="brand">
        <img className="brand-mark" src="/airwise-mark.png" alt="" />
        <span className="brand-name">
          airwise<span>AI</span>
        </span>
      </NavLink>
      <div className="sidebar-label">YOUR SPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note-icon">
          <Leaf size={16} />
        </div>
        <p>
          Small changes to your routine can make your day feel easier to plan.
        </p>
        <span>Make a plan that works for you.</span>
      </div>
      <div className="sidebar-version">
        AIRWISE AI <span>v0.1</span>
      </div>
    </aside>
  );
}

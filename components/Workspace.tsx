"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { z } from "zod";
import { useDeviceValue } from "./features/storage";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  Compass,
  FlaskConical,
  House,
  LayoutDashboard,
  MapPin,
  Menu,
  MessagesSquare,
  Route,
  Settings2,
  SlidersHorizontal,
  Sprout,
  Users,
  Waves,
  X,
} from "lucide-react";
import {
  defaultProfile,
  profileSchema,
  type Profile,
  type Air,
} from "@/lib/domain";

const sections = [
  {
    label: "Workspace",
    links: [
      ["/", "Overview", Compass],
      ["/dashboard", "Air dashboard", LayoutDashboard],
      ["/assistant", "Vayu assistant", MessagesSquare],
      ["/planner", "Daily planner", CalendarDays],
    ],
  },
  {
    label: "Explore",
    links: [
      ["/indoor-air", "Indoor air", House],
      ["/transport", "Transport", Route],
      ["/impact", "Impact calculator", ChartNoAxesCombined],
      ["/what-if", "What-if lab", FlaskConical],
      ["/community", "Community", Users],
    ],
  },
] as const;
type State = {
  profile: Profile;
  setProfile: (p: Profile) => void;
  demo: boolean;
  setDemo: (v: boolean) => void;
  air: Air | null;
  loading: boolean;
  error: string;
  refresh: () => void;
  clearData: () => void;
};
const Context = createContext<State | null>(null);
export function useWorkspace() {
  const state = useContext(Context);
  if (!state) throw Error("Workspace unavailable");
  return state;
}
const subscribeReady = () => () => {};
const demoSchema = z.boolean();
export function Workspace({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, menu] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const closeMenu = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const trigger = menuTrigger.current;
    closeMenu.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") menu(false);
    };
    const wide = window.matchMedia("(min-width:801px)");
    const resize = () => {
      if (wide.matches) menu(false);
    };
    window.addEventListener("keydown", keyboard);
    wide.addEventListener("change", resize);
    return () => {
      window.removeEventListener("keydown", keyboard);
      wide.removeEventListener("change", resize);
      trigger?.focus();
    };
  }, [open]);
  const [profile, storeProfile] = useDeviceValue(
    "aeris:profile",
    profileSchema,
    defaultProfile,
  );
  const [demo, setDemo] = useDeviceValue("aeris:demo", demoSchema, false);
  const ready = useSyncExternalStore(
    subscribeReady,
    () => true,
    () => false,
  );
  const [revision, bump] = useState(0);
  const [air, setAir] = useState<Air | null>(null);
  const [loading, busy] = useState(true);
  const [error, fail] = useState("");

  const { latitude, longitude } = profile.location;
  useEffect(() => {
    if (!ready) return;
    const abort = new AbortController();
    async function load() {
      busy(true);
      fail("");
      setAir(null);
      try {
        const res = await fetch(
          "/api/air-quality?" +
            new URLSearchParams({
              latitude: String(latitude),
              longitude: String(longitude),
              mode: demo ? "demo" : "live",
            }),
          { signal: abort.signal },
        );
        if (!res.ok)
          throw Error("Air data is unavailable. Retry or explore Sample Data.");
        const next = await res.json();
        if (!abort.signal.aborted) setAir(next);
      } catch (e) {
        if (!abort.signal.aborted)
          fail(e instanceof Error ? e.message : "Could not load air data.");
      } finally {
        if (!abort.signal.aborted) busy(false);
      }
    }
    void load();
    const timer = window.setInterval(load, 600000);
    return () => {
      abort.abort();
      clearInterval(timer);
    };
  }, [latitude, longitude, demo, ready, revision]);
  function setProfile(p: Profile) {
    if (!storeProfile(p))
      throw Error("Your browser could not save your household profile.");
  }
  function clearData() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("aeris:"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    window.dispatchEvent(new Event("aeris:updated"));
    bump((v) => v + 1);
  }
  const title =
    sections.flatMap((s) => [...s.links]).find(([url]) => url === path)?.[1] ||
    (path === "/settings" ? "Settings" : "Household setup");
  return (
    <Context.Provider
      value={{
        profile,
        setProfile,
        demo,
        setDemo,
        air,
        loading,
        error,
        refresh: () => bump((v) => v + 1),
        clearData,
      }}
    >
      <a className="skip" href="#content">
        Skip to content
      </a>
      <div className="workspace">
        {open && (
          <button
            className="scrim"
            onClick={() => menu(false)}
            aria-label="Close menu"
          />
        )}
        <aside
          className={"sidebar " + (open ? "expanded" : "")}
          aria-label="Main navigation"
        >
          <Link className="brand" href="/" onClick={() => menu(false)}>
            <span className="brandmark">
              <Waves />
            </span>
            VayuGuard <small>AI</small>
          </Link>
          <button
            aria-label="Close navigation"
            ref={closeMenu}
            className="close-menu iconbtn"
            onClick={() => menu(false)}
          >
            <X />
          </button>
          <nav>
            {sections.map((section) => (
              <div className="nav-section" key={section.label}>
                <p>{section.label}</p>
                {section.links.map(([href, label, Icon]) => (
                  <Link
                    href={href}
                    key={href}
                    aria-current={path === href ? "page" : undefined}
                    className={"nav-item " + (path === href ? "active" : "")}
                    onClick={() => menu(false)}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidefoot">
            <Link
              className="nav-item"
              href="/settings"
              onClick={() => menu(false)}
            >
              <Settings2 size={18} />
              Settings
            </Link>
            <Link
              className="household"
              href="/onboarding"
              onClick={() => menu(false)}
            >
              <span>
                <Sprout size={21} />
              </span>
              <div>
                <b>My household</b>
                <small>{profile.persona} profile</small>
              </div>
              <SlidersHorizontal size={15} />
            </Link>
          </div>
        </aside>
        <div className="workbody" inert={open}>
          <header className="topbar">
            <button
              ref={menuTrigger}
              className="mobile-menu iconbtn"
              aria-label="Open navigation"
              aria-expanded={open}
              onClick={() => menu(true)}
            >
              <Menu />
            </button>
            <span className="bread">
              Workspace <i>/</i> <b>{title}</b>
            </span>
            <div className="tools">
              <Link href="/onboarding">
                <MapPin size={15} />
                {profile.location.name}
              </Link>
              <button
                aria-label={
                  demo ? "Switch to live data" : "Switch to sample data"
                }
                onClick={() => setDemo(!demo)}
              >
                <Activity size={15} />
                {demo ? "Sample Data" : "Live mode"}
              </button>
            </div>
          </header>
          <main id="content" key={path}>
            {ready || path === "/" ? (
              children
            ) : (
              <div role="status" className="skeleton">
                Loading workspaceâ€¦
              </div>
            )}
          </main>
        </div>
      </div>
    </Context.Provider>
  );
}

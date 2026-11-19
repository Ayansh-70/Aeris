import { ReactNode } from "react";
import { MapPin } from "lucide-react";
import type { Air, Profile } from "@/lib/domain";

export type FeatureProps = {
  page: string;
  profile: Profile;
  setProfile: (profile: Profile) => void;
  air: Air | null;
  demo: boolean;
  setDemo: (enabled: boolean) => void;
  clearData: () => void;
};

export function FeatureHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="ft-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}

export function Place({ profile }: { profile: Profile }) {
  return (
    <span className="ft-place">
      <MapPin size={15} />
      {profile.location.name}
    </span>
  );
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="ft-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="ft-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

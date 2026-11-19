"use client";

import "./features.css";
import Assistant from "./Assistant";
import Community from "./Community";
import { Indoor, Planner } from "./HouseholdTools";
import { Mobility } from "./Mobility";
import { ProfileForm, Settings } from "./ProfileForm";
import { type FeatureProps } from "./shared";

export default function FeatureScreen(props: FeatureProps) {
  switch (props.page) {
    case "onboarding":
      return (
        <ProfileForm profile={props.profile} setProfile={props.setProfile} />
      );
    case "settings":
      return <Settings {...props} />;
    case "assistant":
      return <Assistant {...props} />;
    case "planner":
      return <Planner {...props} />;
    case "indoor-air":
      return <Indoor {...props} />;
    case "transport":
    case "impact":
    case "what-if":
      return <Mobility {...props} />;
    case "community":
      return <Community {...props} />;
    default:
      throw new Error("Unknown feature page");
  }
}

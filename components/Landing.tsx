"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  House,
  MapPin,
  MessagesSquare,
  ScanLine,
  Wind,
  Waves,
} from "lucide-react";
import { Terrain } from "./Terrain";
import { AirFailure, Attribution, useReading } from "./AirStatus";
import { useWorkspace } from "./Workspace";
const features = [
  {
    href: "/planner",
    icon: CalendarDays,
    title: "Plan your day",
    text: "Find practical windows for your commute, exercise and family routines.",
    theme: "mint",
  },
  {
    href: "/indoor-air",
    icon: House,
    title: "Improve indoor air",
    text: "Choose affordable steps that fit your home and ventilation habits.",
    theme: "blue",
  },
  {
    href: "/impact",
    icon: ChartNoAxesCombined,
    title: "Measure your impact",
    text: "Compare travel choices and see the emissions behind each trip.",
    theme: "sand",
  },
];
export function Landing() {
  const { profile } = useWorkspace();
  const reading = useReading();
  return (
    <div className="page landing">
      <div className="page-heading">
        <div className="eyebrow">
          <span /> ENVIRONMENTAL INTELLIGENCE
        </div>
        <h1>
          Your clean-air briefing<span>.</span>
        </h1>
        <p>
          Local air intelligence for your household and your everyday decisions.
        </p>
      </div>
      <section className="hero">
        <Terrain />
        <div className="hero-fade" />
        <div className="hero-content">
          <div className="hero-kicker">
            <Waves size={17} /> VAYUGUARD AI
          </div>
          <h2>
            Breathe better.
            <br />
            <em>Live smarter.</em>
          </h2>
          <p>
            Turn local air conditions into a personal plan for a healthier,
            lower-emission day.
          </p>
          <div className="ctas">
            <Link className="primary" href="/onboarding">
              <ScanLine size={16} />
              Set up my household
            </Link>
            <Link className="ghost" href="/dashboard">
              Explore dashboard
            </Link>
          </div>
        </div>
        <div className="hero-reading">
          <span>
            <MapPin size={14} />
            {profile.location.name}
          </span>
          <b>
            {reading.value} <small>US AQI</small>
          </b>
          <span>
            {reading.label} · {reading.source}
          </span>
        </div>
      </section>
      <AirFailure />
      <div className="section-head">
        <div>
          <div className="eyebrow">
            <span /> HOUSEHOLD TOOLKIT
          </div>
          <h2>Make a cleaner choice</h2>
        </div>
      </div>
      <div className="feature-grid">
        {features.map(({ href, icon: Icon, title, text, theme }) => (
          <Link className={"feature-card " + theme} key={href} href={href}>
            <div className="feature-top">
              <span className="tile">
                <Icon size={23} />
              </span>
              <ArrowUpRight size={17} />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </Link>
        ))}
      </div>
      <section className="brief-band">
        <div className="tile">
          <MessagesSquare />
        </div>
        <div>
          <h3>Ask Vayu about your day</h3>
          <p>
            Get an explanation grounded in your city, household and current air
            conditions.
          </p>
        </div>
        <Link href="/assistant" className="secondary">
          Open assistant
        </Link>
      </section>
      <div className="section-head">
        <div>
          <div className="eyebrow">
            <span /> HOW IT WORKS
          </div>
          <h2>From a forecast to a daily plan</h2>
        </div>
      </div>
      <div className="how-grid">
        <p>
          <b>
            <MapPin size={17} />
            Choose your city
          </b>
          Start with a modeled local forecast and its timestamp.
        </p>
        <p>
          <b>
            <House size={17} />
            Describe your routine
          </b>
          Your household, budget and travel preferences shape the advice.
        </p>
        <p>
          <b>
            <Wind size={17} />
            Compare a change
          </b>
          See how a different commute changes estimated weekly emissions.
        </p>
      </div>
      <Attribution />
    </div>
  );
}

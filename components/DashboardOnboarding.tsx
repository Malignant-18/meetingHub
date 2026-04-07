"use client";

import { useEffect, useState } from "react";
import { Joyride, STATUS, type Step } from "react-joyride";

export const DASHBOARD_TOUR_SESSION_KEY = "mrminutes_dashboard_tour_session_done";

const steps: Step[] = [
  {
    target: "[data-tour='dashboard-welcome']",
    title: "Welcome to Mr.Minutes",
    content:
      "This is your command center for uploads, meeting insights, and project-level analysis.",
  },
  {
    target: "[data-tour='dashboard-create-project']",
    title: "Create a project",
    content:
      "Start here to upload transcripts into a new or existing project workspace.",
  },
  {
    target: "[data-tour='dashboard-projects']",
    title: "Your projects",
    content:
      "Every uploaded meeting is grouped under a project so you can review decisions, sentiment, and chat context together.",
  },
];

export default function DashboardOnboarding() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.sessionStorage.getItem(DASHBOARD_TOUR_SESSION_KEY);
    if (!seen) setRun(true);
  }, []);

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      showProgress
      showSkipButton
      disableScrolling
      disableOverlayClose
      styles={{
        options: {
          arrowColor: "#081004",
          backgroundColor: "#081004",
          overlayColor: "rgba(5, 10, 0, 0.74)",
          primaryColor: "#69FF97",
          textColor: "#d5f5dc",
          zIndex: 70,
        },
        beacon: {
          display: "none",
        },
        tooltipContainer: {
          backgroundColor: "#081004",
          border: "1px solid rgba(38, 162, 105, 0.22)",
          borderRadius: "24px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.38)",
          padding: "12px 12px 8px",
        },
        tooltipTitle: {
          color: "#f6fff7",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        },
        tooltipContent: {
          color: "#8fb79a",
          fontSize: 14,
          lineHeight: 1.7,
          padding: "10px 2px 4px",
        },
        tooltipFooter: {
          alignItems: "center",
          borderTop: "1px solid rgba(38, 162, 105, 0.12)",
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          paddingTop: 12,
        },
        buttonClose: { color: "#8fb79a", top: 12, right: 12 },
        buttonBack: {
          backgroundColor: "transparent",
          border: "1px solid rgba(38, 162, 105, 0.2)",
          borderRadius: 9999,
          color: "#d5f5dc",
          padding: "9px 14px",
        },
        buttonNext: {
          background:
            "linear-gradient(135deg, #69FF97 0%, #26a269 55%, #00E4FF 100%)",
          borderRadius: 9999,
          color: "#041102",
          fontWeight: 600,
          padding: "9px 16px",
        },
        buttonSkip: { color: "#8fb79a" },
        spotlight: {
          borderRadius: 28,
        },
      }}
      callback={(data) => {
        const finished =
          data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED;
        if (!finished || typeof window === "undefined") return;
        window.sessionStorage.setItem(DASHBOARD_TOUR_SESSION_KEY, "1");
        setRun(false);
      }}
    />
  );
}

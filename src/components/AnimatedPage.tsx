import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

const AnimatedPage = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<"visible" | "exit" | "enter">("visible");
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname === prevPath.current) {
      setDisplayChildren(children);
      return;
    }
    prevPath.current = location.pathname;

    // Exit phase
    setPhase("exit");
    const exitTimer = setTimeout(() => {
      setDisplayChildren(children);
      setPhase("enter");
      // Enter → visible
      const enterTimer = setTimeout(() => setPhase("visible"), 50);
      return () => clearTimeout(enterTimer);
    }, 250);

    return () => clearTimeout(exitTimer);
  }, [location.pathname, children]);

  const styles: React.CSSProperties = {
    transition: "opacity 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1), filter 0.3s ease",
    opacity: phase === "exit" ? 0 : phase === "enter" ? 0 : 1,
    transform:
      phase === "exit"
        ? "scale(0.97) translateY(-8px)"
        : phase === "enter"
        ? "scale(0.97) translateY(12px)"
        : "scale(1) translateY(0)",
    filter: phase === "visible" ? "blur(0px)" : "blur(3px)",
  };

  return <div style={styles}>{displayChildren}</div>;
};

export default AnimatedPage;

import { useEffect, useState, useRef } from "react";
import { gsap } from "gsap";
const VisualNoise = () => (
  <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.015] mix-blend-multiply">
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
  </div>
);
const AppInitialLoader = () => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const containerRef = useRef(null);
  const scanlineRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.set(".reveal-item", { y: 15, opacity: 0 });
      gsap.set(".exit-shutter", { scaleY: 0 });
      const tl = gsap.timeline({
        onUpdate: () => setProgress(Math.round(tl.progress() * 100)),
        onComplete: () => {
          const exitTl = gsap.timeline({
            onComplete: () => setVisible(false)
          });
          exitTl.to(".exit-shutter", {
            scaleY: 1,
            duration: 0.4,
            stagger: 0.05,
            ease: "expo.inOut",
          })
          .to(containerRef.current, { opacity: 0, duration: 0.1 });
        }
      });
      tl.to(".reveal-item", { 
        y: 0, 
        opacity: 1, 
        stagger: 0.05,
        duration: 0.5, 
        ease: "power4.out" 
      })
      .to(scanlineRef.current, { 
        top: "100%", 
        duration: 0.8,
        ease: "power2.inOut",
        repeat: 1
      }, "-=0.3")
      .to({}, { duration: 0.3 });
    }, containerRef);
    return () => ctx.revert();
  }, []);
  if (!visible) return null;
  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-black overflow-hidden flex flex-col justify-between p-10 md:p-16">
      <VisualNoise />
      {}
      <div 
        ref={scanlineRef}
        className="absolute top-0 left-0 w-full h-[2px] bg-black/10 z-[110] pointer-events-none shadow-[0_0_15px_rgba(0,0,0,0.1)]"
      />
      {}
      <div className="fixed inset-0 z-[120] pointer-events-none flex flex-col">
        <div className="exit-shutter w-full h-1/2 bg-black origin-top" />
        <div className="exit-shutter w-full h-1/2 bg-black origin-bottom" />
      </div>
      {}
      <div className="flex justify-between items-start z-10">
        <div className="reveal-item space-y-1">
          <div className="font-black text-[10px] tracking-[0.4em] uppercase">Intelligence OS</div>
          <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">
            v3.0.4
          </div>
        </div>
        <div className="reveal-item font-mono text-[10px] text-right">
          <span className="text-neutral-400">AUTH: </span>OK
        </div>
      </div>
      {}
      <div className="relative z-10 flex flex-col items-center">
        <div className="reveal-item flex items-baseline gap-4">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase italic">
            Collect <span className="not-italic text-neutral-200">Docs.</span>
          </h1>
          <div className="font-mono text-2xl md:text-4xl font-light text-neutral-300 w-20">
            {progress}%
          </div>
        </div>
        {}
        <div className="reveal-item mt-8 w-full max-w-sm h-[1px] bg-neutral-100 relative">
          <div 
            className="absolute top-0 left-0 h-full bg-black transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {}
      <div className="flex justify-between items-end z-10">
        <div className="reveal-item hidden md:block">
          <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">
            Node_04
          </div>
        </div>
        <div className="reveal-item text-right">
          <div className="font-black text-[10px] tracking-[0.3em] uppercase">
            Secured Access
          </div>
        </div>
      </div>
    </div>
  );
};
export default AppInitialLoader;
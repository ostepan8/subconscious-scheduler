"use client";

interface TourOverlayProps {
  cutout: { x: number; y: number; width: number; height: number } | null;
  padding: number;
  borderRadius: number;
  onClick: () => void;
}

export default function TourOverlay({
  cutout,
  padding,
  borderRadius,
  onClick,
}: TourOverlayProps) {
  return (
    <div className="fixed inset-0 z-[60]" onClick={onClick}>
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {cutout && (
              <rect
                x={cutout.x - padding}
                y={cutout.y - padding}
                width={cutout.width + padding * 2}
                height={cutout.height + padding * 2}
                rx={borderRadius}
                ry={borderRadius}
                fill="black"
                style={{
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(16, 24, 32, 0.80)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Pass-through zone over the cutout so highlighted element stays interactive */}
      {cutout && (
        <div
          className="absolute tour-spotlight-ring"
          style={{
            left: cutout.x - padding,
            top: cutout.y - padding,
            width: cutout.width + padding * 2,
            height: cutout.height + padding * 2,
            borderRadius,
            pointerEvents: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}

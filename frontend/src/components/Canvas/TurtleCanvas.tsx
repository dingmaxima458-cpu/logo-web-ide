import React, { useEffect, useRef } from 'react';
import './TurtleCanvas.css';

interface TurtleCommand {
  type: string;
  x?: number;
  y?: number;
  angle?: number;
  penDown?: boolean;
  down?: boolean;
  r?: number;
  g?: number;
  b?: number;
  width?: number;
}

interface TurtleCanvasProps {
  commands: TurtleCommand[];
}

const TurtleCanvas: React.FC<TurtleCanvasProps> = ({ commands }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const turtleRef = useRef<{ x: number; y: number; angle: number; penDown: boolean }>({
    x: 0,
    y: 0,
    angle: 90, // Start facing up (Logo convention)
    penDown: true,
  });

  useEffect(() => {
    console.log('[TurtleCanvas] useEffect triggered, commands count:', commands.length);
    console.log('[TurtleCanvas] Commands:', JSON.stringify(commands.slice(0, 3), null, 2));
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('[TurtleCanvas] Canvas ref is null');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[TurtleCanvas] Could not get 2d context');
      return;
    }

    const drawTurtle = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number) => {
      const x = centerX + turtleRef.current.x * scale;
      const y = centerY - turtleRef.current.y * scale;
      const angle = turtleRef.current.angle;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((-angle * Math.PI) / 180); // Convert to radians and rotate

      // Draw turtle as a triangle
      ctx.fillStyle = '#4ec9b0';
      ctx.beginPath();
      ctx.moveTo(0, -10 * scale);
      ctx.lineTo(-5 * scale, 5 * scale);
      ctx.lineTo(5 * scale, 5 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2d9cdb';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };

    // Define redraw function first
    const redraw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set up coordinate system: center origin, y-axis flipped
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 400; // Scale factor
      
      // Reset turtle state
      turtleRef.current = {
        x: 0,
        y: 0,
        angle: 90,
        penDown: true,
      };

      ctx.strokeStyle = '#4ec9b0';
      ctx.lineWidth = 2; // Default line width
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let pathStarted = false;
      let currentColor = '#4ec9b0';
      let currentWidth = 2;

      // Process all commands
      console.log('[TurtleCanvas] Processing', commands.length, 'commands');
      commands.forEach((cmd, index) => {
        const screenX = centerX + turtleRef.current.x * scale;
        const screenY = centerY - turtleRef.current.y * scale; // Flip y-axis

        if (index < 3) {
          console.log(`[TurtleCanvas] Command ${index}:`, cmd);
        }

        switch (cmd.type) {
          case 'move':
            if (cmd.x !== undefined && cmd.y !== undefined) {
              const newScreenX = centerX + cmd.x * scale;
              const newScreenY = centerY - cmd.y * scale;

              if (turtleRef.current.penDown) {
                if (!pathStarted) {
                  ctx.beginPath();
                  ctx.moveTo(screenX, screenY);
                  pathStarted = true;
                }
                ctx.lineTo(newScreenX, newScreenY);
                ctx.stroke();
                // After stroking, we need to start a new path for the next segment
                // This ensures color/width changes affect only subsequent segments
                pathStarted = false;
              } else {
                ctx.beginPath();
                ctx.moveTo(newScreenX, newScreenY);
                pathStarted = false;
              }
            }
            turtleRef.current.x = cmd.x ?? turtleRef.current.x;
            turtleRef.current.y = cmd.y ?? turtleRef.current.y;
            break;

          case 'turn':
            if (cmd.angle !== undefined) {
              turtleRef.current.angle = cmd.angle;
            }
            break;

          case 'pen':
            if (cmd.down !== undefined) {
              turtleRef.current.penDown = cmd.down;
              if (cmd.down && !pathStarted) {
                const screenX = centerX + turtleRef.current.x * scale;
                const screenY = centerY - turtleRef.current.y * scale;
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                pathStarted = true;
              } else if (!cmd.down && pathStarted) {
                // Pen up - close current path
                ctx.stroke();
                pathStarted = false;
              }
            }
            break;

          case 'color':
            if (cmd.r !== undefined && cmd.g !== undefined && cmd.b !== undefined) {
              currentColor = `rgb(${cmd.r}, ${cmd.g}, ${cmd.b})`;
              ctx.strokeStyle = currentColor;
              // If we have an active path, close it and start a new one with new color
              if (pathStarted) {
                ctx.stroke();
                pathStarted = false;
              }
            }
            break;

          case 'width':
            if (cmd.width !== undefined) {
              currentWidth = cmd.width;
              ctx.lineWidth = currentWidth;
              // If we have an active path, close it and start a new one with new width
              if (pathStarted) {
                ctx.stroke();
                pathStarted = false;
              }
            }
            break;
        }
      });

      // Draw turtle at current position
      drawTurtle(ctx, centerX, centerY, scale);
      console.log('[TurtleCanvas] Redraw complete');
    };

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      console.log('[TurtleCanvas] Canvas resized to:', canvas.width, 'x', canvas.height);
      
      // Reset and redraw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      redraw();
    };

    // Initial setup
    console.log('[TurtleCanvas] Initial setup');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial draw
    console.log('[TurtleCanvas] Initial draw');
    redraw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [commands]);

  return (
    <div className="turtle-canvas-container">
      <div className="turtle-canvas-header">
        <span>Turtle Graphics</span>
      </div>
      <canvas ref={canvasRef} className="turtle-canvas" />
    </div>
  );
};

export default TurtleCanvas;


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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let pathStarted = false;

      // Process all commands
      commands.forEach((cmd) => {
        const screenX = centerX + turtleRef.current.x * scale;
        const screenY = centerY - turtleRef.current.y * scale; // Flip y-axis

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
              }
            }
            break;

          case 'color':
            if (cmd.r !== undefined && cmd.g !== undefined && cmd.b !== undefined) {
              ctx.strokeStyle = `rgb(${cmd.r}, ${cmd.g}, ${cmd.b})`;
            }
            break;
        }
      });

      // Draw turtle at current position
      drawTurtle(ctx, centerX, centerY, scale);
    };

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      // Reset and redraw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      redraw();
    };

    // Initial setup
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial draw
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


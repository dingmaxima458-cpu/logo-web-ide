"""
Logo interpreter wrapper using Logopy
Converts Logo turtle commands to drawing instructions for the frontend
"""

from typing import List, Dict, Any, AsyncIterator
import math
import asyncio


class LogoInterpreter:
    """
    Wrapper around Logopy to execute Logo code and generate
    turtle graphics commands for the frontend
    """
    
    def __init__(self):
        # Initialize attributes before calling reset()
        self.turtle_x = 0.0
        self.turtle_y = 0.0
        self.turtle_angle = 90.0
        self.pen_down = True
        self.color = (0, 0, 0)
        self.commands = []
        
        # Try to import logopy, fallback to basic implementation if not available
        try:
            from logopy import Logo
            self.logo = Logo()
            self.use_logopy = True
        except ImportError:
            print("Warning: logopy not installed. Using basic implementation.")
            self.use_logopy = False
            self.logo = None
        
        # Now reset (which may use use_logopy)
        self.reset()
    
    def reset(self):
        """Reset turtle state to initial position"""
        self.turtle_x = 0.0
        self.turtle_y = 0.0
        self.turtle_angle = 90.0  # Start facing up (Logo convention)
        self.pen_down = True
        self.color = (0, 0, 0)  # Black
        self.commands = []
        
        if self.use_logopy and self.logo:
            try:
                self.logo.reset()
            except:
                pass
    
    def execute(self, code: str) -> tuple[List[Dict[str, Any]], str]:
        """
        Execute Logo code and return drawing commands
        
        Returns:
            (commands, output): Tuple of drawing commands and text output
        """
        self.reset()
        output = ""
        
        if self.use_logopy:
            try:
                # Use logopy if available
                result = self.logo.run(code)
                output = str(result) if result else ""
                # Extract turtle commands from logopy
                # Note: This is a simplified version - you may need to
                # customize based on logopy's actual API
                commands = self._extract_commands_from_logopy()
            except Exception as e:
                # Fallback to basic parser
                commands = self._parse_basic_logo(code)
                output = f"Error: {str(e)}"
        else:
            # Basic Logo command parser (fallback)
            commands = self._parse_basic_logo(code)
        
        return commands, output
    
    async def execute_stream(self, code: str) -> AsyncIterator[Dict[str, Any]]:
        """
        Execute Logo code and stream commands as they are generated
        Useful for real-time visualization
        """
        commands, _ = self.execute(code)
        for cmd in commands:
            yield cmd
            await asyncio.sleep(0.01)  # Small delay for smooth animation
    
    def _parse_basic_logo(self, code: str) -> List[Dict[str, Any]]:
        """
        Basic Logo command parser (fallback implementation)
        Supports common commands: forward, back, right, left, penup, pendown
        """
        commands = []
        lines = code.strip().split('\n')
        
        for line in lines:
            line = line.strip().lower()
            if not line or line.startswith(';'):
                continue
            
            # Parse forward/back commands
            if line.startswith('forward') or line.startswith('fd'):
                parts = line.split()
                if len(parts) >= 2:
                    try:
                        distance = float(parts[1])
                        commands.extend(self._move_forward(distance))
                    except ValueError:
                        pass
            
            elif line.startswith('back') or line.startswith('bk'):
                parts = line.split()
                if len(parts) >= 2:
                    try:
                        distance = float(parts[1])
                        commands.extend(self._move_backward(distance))
                    except ValueError:
                        pass
            
            # Parse turn commands
            elif line.startswith('right') or line.startswith('rt'):
                parts = line.split()
                if len(parts) >= 2:
                    try:
                        angle = float(parts[1])
                        self.turtle_angle -= angle
                        commands.append({
                            "type": "turn",
                            "angle": self.turtle_angle
                        })
                    except ValueError:
                        pass
            
            elif line.startswith('left') or line.startswith('lt'):
                parts = line.split()
                if len(parts) >= 2:
                    try:
                        angle = float(parts[1])
                        self.turtle_angle += angle
                        commands.append({
                            "type": "turn",
                            "angle": self.turtle_angle
                        })
                    except ValueError:
                        pass
            
            # Pen commands
            elif 'penup' in line or 'pu' in line:
                self.pen_down = False
                commands.append({
                    "type": "pen",
                    "down": False
                })
            
            elif 'pendown' in line or 'pd' in line:
                self.pen_down = True
                commands.append({
                    "type": "pen",
                    "down": True
                })
            
            # Home command
            elif 'home' in line:
                self.turtle_x = 0
                self.turtle_y = 0
                self.turtle_angle = 90
                commands.append({
                    "type": "move",
                    "x": 0,
                    "y": 0,
                    "penDown": self.pen_down
                })
        
        return commands
    
    def _move_forward(self, distance: float) -> List[Dict[str, Any]]:
        """Move turtle forward and generate move command"""
        angle_rad = math.radians(self.turtle_angle)
        dx = distance * math.cos(angle_rad)
        dy = distance * math.sin(angle_rad)
        
        self.turtle_x += dx
        self.turtle_y += dy
        
        return [{
            "type": "move",
            "x": self.turtle_x,
            "y": self.turtle_y,
            "penDown": self.pen_down
        }]
    
    def _move_backward(self, distance: float) -> List[Dict[str, Any]]:
        """Move turtle backward and generate move command"""
        return self._move_forward(-distance)
    
    def _extract_commands_from_logopy(self) -> List[Dict[str, Any]]:
        """
        Extract turtle commands from logopy execution
        This is a placeholder - actual implementation depends on logopy's API
        """
        # TODO: Implement based on logopy's actual API
        # This would need to hook into logopy's turtle graphics system
        return []


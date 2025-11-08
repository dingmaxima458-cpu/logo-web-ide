# Logo Commands Reference

## Standard Commands (Supported by logo npm package)

### Movement
- `FORWARD n` or `FD n` - Move forward n units
- `BACK n` or `BK n` - Move backward n units  
- `LEFT n` or `LT n` - Turn left n degrees
- `RIGHT n` or `RT n` - Turn right n degrees
- `HOME` - Return to center (0,0) facing up
- `SETXY x y` - Move to coordinates (x, y)
- `SETHEADING n` or `SETH n` - Set heading to n degrees

### Pen Control
- `PENDOWN` or `PD` - Lower pen (start drawing)
- `PENUP` or `PU` - Raise pen (stop drawing)

### Control Flow
- `REPEAT n [commands]` - Repeat commands n times
- `IF condition [commands]` - Execute if condition is true
- `IFELSE condition [true-commands] [false-commands]` - Conditional execution

### Procedures
- `TO name :param1 :param2 ...` - Define procedure
- `END` - End procedure definition

### Variables
- `MAKE "varname value` - Set variable
- `LOCAL "varname` - Declare local variable

## Extended Commands (Added by Logo Web IDE)

These commands are **automatically available** - you don't need to define them:

### Shapes
- `CIRCLE :radius` - Draw a circle
- `SQUARE :size` - Draw a square
- `RECTANGLE :width :height` - Draw a rectangle
- `TRIANGLE :size` - Draw an equilateral triangle
- `OVAL :width :height` - Draw an oval/ellipse

### Filled Shapes (Terrapin Logo style)
- `STAMPOVAL :width :height` - Draw a filled oval
- `STAMPCIRCLE :radius` - Draw a filled circle
- `STAMPSQUARE :size` - Draw a filled square

## Examples

```logo
; Draw a square
SQUARE 100

; Draw a circle
CIRCLE 50

; Draw a filled oval
STAMPOVAL 80 50

; Draw multiple shapes
REPEAT 4 [
  CIRCLE 30
  FD 50
  RT 90
]
```

## Notes

- **STAMPOVAL** requires **two parameters**: width and height
  - Correct: `STAMPOVAL 80 50`
  - Incorrect: `STAMPOVAL 50` (will error)

- All extended commands are implemented using basic turtle commands
- They are automatically loaded before your code executes
- Line numbers in errors account for the prepended shape commands


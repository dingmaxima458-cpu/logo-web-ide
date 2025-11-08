/**
 * Extended Logo Shape Commands
 * Adds support for common shape commands not in the base logo package
 * These are implemented as Logo procedures using basic turtle commands
 */

export const SHAPE_COMMANDS = `
; Extended shape commands for Logo Web IDE
; These implement common Terrapin Logo commands using basic turtle graphics

; Draw a circle by approximating with many small forward/turn steps
TO CIRCLE :radius
  LOCAL "steps "circumference
  MAKE "circumference :radius * 6.28318
  MAKE "steps :circumference / 2
  REPEAT :steps [
    FD 2
    RT 360 / :steps
  ]
END

; Draw a square
TO SQUARE :size
  REPEAT 4 [
    FD :size
    RT 90
  ]
END

; Draw a rectangle
TO RECTANGLE :width :height
  REPEAT 2 [
    FD :width
    RT 90
    FD :height
    RT 90
  ]
END

; Draw a triangle (equilateral)
TO TRIANGLE :size
  REPEAT 3 [
    FD :size
    RT 120
  ]
END

; Draw an oval/ellipse (simple approximation)
TO OVAL :width :height
  LOCAL "steps "i "angle "dist
  MAKE "steps 60
  REPEAT :steps [
    MAKE "i REPCOUNT
    MAKE "angle 360 * :i / :steps
    MAKE "dist SQRT :width * :width * COS :angle * COS :angle + :height * :height * SIN :angle * SIN :angle
    FD :dist / :steps
    RT 360 / :steps
  ]
END

; Draw a filled oval (stampoval) - draws concentric ovals
TO STAMPOVAL :width :height
  LOCAL "i "w "h
  REPEAT :width [
    MAKE "i REPCOUNT
    MAKE "w :width - :i
    MAKE "h :height - :i
    IF :w > 0 [
      IF :h > 0 [
        OVAL :w :h
      ]
    ]
  ]
END

; Draw a filled circle (stampcircle)
TO STAMPCIRCLE :radius
  LOCAL "i
  REPEAT :radius [
    MAKE "i REPCOUNT
    CIRCLE :radius - :i
  ]
END

; Draw a filled square (stampsquare)
TO STAMPSQUARE :size
  LOCAL "i
  REPEAT :size [
    MAKE "i REPCOUNT
    SQUARE :size - :i * 2
    FD 1
    RT 90
    FD 1
    LT 90
  ]
END
`;


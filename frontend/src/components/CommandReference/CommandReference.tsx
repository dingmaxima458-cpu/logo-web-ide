import React, { useState } from 'react';
import './CommandReference.css';

interface Command {
  name: string;
  aliases?: string[];
  description: string;
  syntax: string;
  example?: string;
}

interface CommandGroup {
  title: string;
  commands: Command[];
}

const COMMAND_GROUPS: CommandGroup[] = [
  {
    title: 'Basic Movement',
    commands: [
      {
        name: 'FORWARD',
        aliases: ['FD'],
        description: 'Move turtle forward by distance',
        syntax: 'FORWARD n',
        example: 'FORWARD 100'
      },
      {
        name: 'BACK',
        aliases: ['BK', 'BACKWARD'],
        description: 'Move turtle backward by distance',
        syntax: 'BACK n',
        example: 'BACK 50'
      },
      {
        name: 'RIGHT',
        aliases: ['RT'],
        description: 'Turn turtle right (clockwise) by degrees',
        syntax: 'RIGHT n',
        example: 'RIGHT 90'
      },
      {
        name: 'LEFT',
        aliases: ['LT'],
        description: 'Turn turtle left (counterclockwise) by degrees',
        syntax: 'LEFT n',
        example: 'LEFT 45'
      },
      {
        name: 'HOME',
        description: 'Move turtle to center [0, 0] and reset heading',
        syntax: 'HOME',
        example: 'HOME'
      },
      {
        name: 'SETXY',
        aliases: ['SETPOS'],
        description: 'Move turtle to absolute coordinates',
        syntax: 'SETXY x y',
        example: 'SETXY 100 50'
      },
      {
        name: 'SETHEADING',
        aliases: ['SETH'],
        description: 'Set turtle heading/direction in degrees (0=right, 90=up, 180=left, 270=down)',
        syntax: 'SETHEADING n',
        example: 'SETHEADING 90'
      }
    ]
  },
  {
    title: 'Pen Control',
    commands: [
      {
        name: 'PENDOWN',
        aliases: ['PD', 'PEN DOWN'],
        description: 'Lower pen to start drawing',
        syntax: 'PENDOWN',
        example: 'PENDOWN'
      },
      {
        name: 'PENUP',
        aliases: ['PU', 'PEN UP'],
        description: 'Lift pen to stop drawing',
        syntax: 'PENUP',
        example: 'PENUP'
      },
      {
        name: 'SETCOLOR',
        aliases: ['SETC', 'SETPENCOLOR', 'SETPC'],
        description: 'Set pen color (0-15: 0=black, 1=white, 2=red, 3=green, 4=blue, etc.)',
        syntax: 'SETCOLOR n',
        example: 'SETCOLOR 2'
      },
      {
        name: 'SETPENSIZE',
        aliases: ['SETPS', 'SETWIDTH'],
        description: 'Set pen width/thickness',
        syntax: 'SETPENSIZE n',
        example: 'SETPENSIZE 5'
      }
    ]
  },
  {
    title: 'Basic Shapes',
    commands: [
      {
        name: 'CIRCLE',
        description: 'Draw a circle',
        syntax: 'CIRCLE radius',
        example: 'CIRCLE 50'
      },
      {
        name: 'SQUARE',
        description: 'Draw a square',
        syntax: 'SQUARE size',
        example: 'SQUARE 100'
      },
      {
        name: 'RECTANGLE',
        description: 'Draw a rectangle',
        syntax: 'RECTANGLE width height',
        example: 'RECTANGLE 100 50'
      },
      {
        name: 'TRIANGLE',
        description: 'Draw an equilateral triangle',
        syntax: 'TRIANGLE size',
        example: 'TRIANGLE 80'
      },
      {
        name: 'OVAL',
        description: 'Draw an oval/ellipse',
        syntax: 'OVAL width height',
        example: 'OVAL 100 60'
      }
    ]
  },
  {
    title: 'Filled Shapes (STAMP)',
    commands: [
      {
        name: 'STAMPCIRCLE',
        description: 'Draw a filled circle',
        syntax: 'STAMPCIRCLE radius',
        example: 'STAMPCIRCLE 50'
      },
      {
        name: 'STAMPSQUARE',
        description: 'Draw a filled square',
        syntax: 'STAMPSQUARE size',
        example: 'STAMPSQUARE 100'
      },
      {
        name: 'STAMPRECT',
        description: 'Draw a filled rectangle',
        syntax: 'STAMPRECT width height',
        example: 'STAMPRECT 100 50'
      },
      {
        name: 'STAMPOVAL',
        description: 'Draw a filled oval/ellipse',
        syntax: 'STAMPOVAL width height',
        example: 'STAMPOVAL 100 60'
      }
    ]
  },
  {
    title: 'Curves & Advanced Shapes',
    commands: [
      {
        name: 'ARC',
        description: 'Draw a partial circle arc (angle in degrees: 180 = semicircle, 90 = quarter circle)',
        syntax: 'ARC radius angle',
        example: 'ARC 50 180'
      },
      {
        name: 'POLYGON',
        description: 'Draw a regular n-sided polygon',
        syntax: 'POLYGON sides size',
        example: 'POLYGON 6 50'
      },
      {
        name: 'SPIRAL',
        description: 'Draw a spiral pattern',
        syntax: 'SPIRAL turns radius',
        example: 'SPIRAL 3 50'
      },
      {
        name: 'STAR',
        description: 'Draw a star shape',
        syntax: 'STAR points size',
        example: 'STAR 5 50'
      }
    ]
  },
  {
    title: 'Control Flow',
    commands: [
      {
        name: 'REPEAT',
        description: 'Repeat commands n times',
        syntax: 'REPEAT n [commands]',
        example: 'REPEAT 4 [FD 100 RT 90]'
      },
      {
        name: 'TO',
        description: 'Define a procedure',
        syntax: 'TO name :param1 :param2 ...\n  commands\nEND',
        example: 'TO SQUARE :size\n  REPEAT 4 [FD :size RT 90]\nEND'
      },
      {
        name: 'IF',
        description: 'Conditional execution',
        syntax: 'IF condition [commands]',
        example: 'IF :x > 10 [FD 50]'
      }
    ]
  }
];

const CommandReference: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Basic Movement', 'Pen Control']));

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  return (
    <div className={`command-reference ${isOpen ? 'open' : ''}`}>
      <button 
        className="command-reference-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Hide Command Reference' : 'Show Command Reference'}
      >
        <span className="command-reference-icon">📚</span>
        <span className="command-reference-title">Commands</span>
        <span className="command-reference-arrow">{isOpen ? '▼' : '▶'}</span>
      </button>
      
      {isOpen && (
        <div className="command-reference-content">
          <div className="command-reference-header">
            <h3>Logo Command Reference</h3>
            <p className="command-reference-subtitle">All available commands in Logo Web IDE</p>
          </div>
          
          <div className="command-reference-groups">
            {COMMAND_GROUPS.map((group) => (
              <div key={group.title} className="command-group">
                <button
                  className="command-group-header"
                  onClick={() => toggleGroup(group.title)}
                >
                  <span className="command-group-title">{group.title}</span>
                  <span className="command-group-arrow">
                    {expandedGroups.has(group.title) ? '▼' : '▶'}
                  </span>
                </button>
                
                {expandedGroups.has(group.title) && (
                  <div className="command-group-commands">
                    {group.commands.map((cmd, idx) => (
                      <div key={idx} className="command-item">
                        <div className="command-name-row">
                          <code className="command-name">{cmd.name}</code>
                          {cmd.aliases && cmd.aliases.length > 0 && (
                            <span className="command-aliases">
                              {cmd.aliases.map((alias, i) => (
                                <code key={i} className="command-alias">{alias}</code>
                              ))}
                            </span>
                          )}
                        </div>
                        <p className="command-description">{cmd.description}</p>
                        <div className="command-syntax">
                          <span className="syntax-label">Syntax:</span>
                          <code>{cmd.syntax}</code>
                        </div>
                        {cmd.example && (
                          <div className="command-example">
                            <span className="example-label">Example:</span>
                            <code>{cmd.example}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandReference;

export const radioSnippet = `\`\`\`quiz
type: radio
content: >-
  Your question here?

options:
- content: ""
  feedback: ""
- content: ""
  feedback: ""
  correct: true
\`\`\``;

export const checkboxSnippet = `\`\`\`quiz
type: checkbox
content: >-
  Your question here?

options:
- content: ""
  feedback: ""
- content: ""
  feedback: ""
  correct: true
\`\`\``;

export const choiceSnippet = `\`\`\`quiz
type: choice
content: >-
  Match each situation with the correct option.

options:
- id: opt1
  content: "Option 1"
- id: opt2
  content: "Option 2"

questions:
- content: "Situation #1"
  correct_option: opt1
- content: "Situation #2"
  correct_option: opt2
\`\`\``;

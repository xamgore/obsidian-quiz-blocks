import { Plugin } from "obsidian";
import { renderQuiz } from "./renderer";

const radioTemplate = `\`\`\`quiz
question: Your question here?
type: radio
options:
- content: ""
  feedback: ""
  correct: true
- content: ""
  feedback: ""
\`\`\``;

const checkboxTemplate = `\`\`\`quiz
question: Your question here?
type: checkbox
options:
- content: ""
  feedback: ""
  correct: true
- content: ""
  feedback: ""
\`\`\``;

export default class QuizBlocksPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor("quiz", async (source, el, ctx) => {
			await renderQuiz({
				app: this.app,
				component: this,
				source,
				el,
				ctx,
			});
		});

		this.addCommand({
			id: "insert-quiz-block-radio",
			name: "Insert quiz (radio)",
			editorCallback: (editor) => {
				editor.replaceRange(radioTemplate, editor.getCursor());
			},
		});

		this.addCommand({
			id: "insert-quiz-block-checkbox",
			name: "Insert quiz (checkbox)",
			editorCallback: (editor) => {
				editor.replaceRange(checkboxTemplate, editor.getCursor());
			},
		});
	}
}

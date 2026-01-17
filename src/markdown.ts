import { App, Component, MarkdownRenderer } from "obsidian";

export interface AppContext {
	app: App,
	component: Component,
	sourcePath: string,
}

export async function renderInlineMarkdown(
	ctx: AppContext,
	markdown: string,
	host: HTMLElement,
	plainText: boolean,
) {
	let tmp = document.createElement("div");
	await MarkdownRenderer.render(ctx.app, markdown, tmp, ctx.sourcePath, ctx.component);

	if (plainText) {
		// i.e. plain-text labels for <option> (since <option> can't host rich HTML).
		host.appendText(tmp.textContent);
	} else {
		if (tmp.childElementCount === 1 && tmp.firstElementChild?.tagName === "P") {
			// unwrap the paragraph
			tmp = tmp.firstElementChild as HTMLDivElement;
		}
		while (tmp.firstChild) host.appendChild(tmp.firstChild);
	}

	tmp.remove();
}

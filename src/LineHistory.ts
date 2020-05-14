import { Disposable } from "@hediet/std/disposable";
import {
	Uri,
	window,
	workspace,
	MarkdownString,
	DecorationOptions,
} from "vscode";

export class LogResultDecorator {
	public readonly dispose = Disposable.fn();

	private readonly map = new Map<
		string,
		{ uri: Uri; lines: Map<number, LineHistory> }
	>();
	private readonly decorationType = this.dispose.track(
		window.createTextEditorDecorationType({
			after: {
				color: "gray",
				margin: "20px",
			},
		})
	);

	constructor() {
		this.dispose.track(
			workspace.onDidChangeTextDocument((evt) => {
				this.map.delete(evt.document.uri.toString());
				this.updateDecorations();
			})
		);
	}

	public log(uri: Uri, line: number, output: string): void {
		let entry = this.map.get(uri.toString());
		if (!entry) {
			entry = { uri, lines: new Map() };
			this.map.set(uri.toString(), entry);
		}

		let history = entry.lines.get(line);
		if (!history) {
			history = new LineHistory(uri, line);
			entry.lines.set(line, history);
		}

		history.history.unshift(output);

		this.updateDecorations();
	}

	public clear(): void {
		this.map.clear();
		this.updateDecorations();
	}

	private updateDecorations() {
		for (const editor of window.visibleTextEditors) {
			const entry = this.map.get(editor.document.uri.toString());
			if (!entry) {
				editor.setDecorations(this.decorationType, []);
				continue;
			}

			editor.setDecorations(
				this.decorationType,
				[...entry.lines.values()].map((history) => {
					const range = editor.document.lineAt(history.line).range;
					const hoverMessage = new MarkdownString();
					hoverMessage.isTrusted = true;
					for (const h of history.history.slice().reverse()) {
						hoverMessage.appendMarkdown(`* ${h}`);
					}
					/*const params = encodeURIComponent(
						JSON.stringify({ stepId: o.id } as RunCmdIdArgs)
					);*/
					/*hoverMessage.appendMarkdown(
						`* [Run Step '${o.id}'](command:${runCmdId}?${params})`
					);*/

					return {
						range,
						renderOptions: {
							after: {
								contentText: history.history[0],
							},
						},
						hoverMessage,
					} as DecorationOptions;
				})
			);
		}
	}
}

class LineHistory {
	constructor(public readonly uri: Uri, public readonly line: number) {}
	public readonly history: string[] = [];
}

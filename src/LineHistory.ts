import { Disposable } from "@hediet/std/disposable";
import {
	Uri,
	window,
	workspace,
	MarkdownString,
	DecorationOptions,
	TextDocument,
	TextDocumentChangeEvent,
	TextDocumentContentChangeEvent
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
				this.updateLineNumbers(evt);
				this.updateDecorations();
			})
		);
		this.dispose.track(
			workspace.onDidCloseTextDocument((doc) => {
				this.map.delete(doc.uri.toString());
			})
		);
		this.dispose.track(
			workspace.onDidSaveTextDocument((doc) => {
				this.map.delete(doc.uri.toString());
				this.updateDecorations();
			})
		);
		this.dispose.track(
			workspace.onDidOpenTextDocument((doc) => {
				this.updateOffsets(doc);
			})
		);
		this.dispose.track(
			window.onDidChangeActiveTextEditor((doc) => {
				if(doc){
					this.updateOffsets(doc.document);
				}
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

	private updateLineNumbers(evt: TextDocumentChangeEvent){
		if(evt.contentChanges.length === 0){
			this.updateOffsets(evt.document);
		} else{
			const entry = this.map.get(evt.document.uri.toString())
			if(entry){
				entry.lines.forEach((lineHistory, k) => {
					const success = updateLineLocation(lineHistory, evt);
					if(!success){
						entry.lines.delete(k);
					}
				})
			}
		}
	}
	private updateOffsets(doc: TextDocument){
		const entry = this.map.get(doc.uri.toString())
		if(entry){
			entry.lines.forEach(lineHistory => {
				const line = doc.lineAt(lineHistory.line);
				lineHistory.offset = doc.offsetAt(line.range.end);
			})
		}
	}
}

class LineHistory {
	constructor(public readonly uri: Uri, public line: number) {}
	public readonly history: string[] = [];
	public offset?: number;
}

function updateLineLocation(lineHistory: LineHistory, evt: TextDocumentChangeEvent){
	const doc = evt.document;
	let success: boolean = true;
	evt.contentChanges.forEach((change) => {
		const tmp = updateLineLocationByChange(lineHistory, change, doc);
		success = tmp && success;
	});
	return (success)
}
function updateLineLocationByChange(lineHistory: LineHistory, change: TextDocumentContentChangeEvent, doc: TextDocument){
	const start = change.rangeOffset;
	const end0 = start + change.rangeLength;
	const end1 = start + change.text.length;
	const offset = lineHistory.offset;
	let success: boolean = true;
	if(offset === undefined){
		success = false;
	} else if(offset < start){
		// do nothing
	} else if(offset <= end0){
		success = false;
	} else{ // offset > end0
		const offset1 = offset + end1 - end0;
		const position = doc.positionAt(offset1)
		const line = doc.lineAt(position)
		const lineNumber = line.lineNumber;
		lineHistory.offset = offset1;
		lineHistory.line = lineNumber;
		success = true;
	}
	return(success);
}

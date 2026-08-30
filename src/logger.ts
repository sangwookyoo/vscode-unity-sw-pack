// Minimal output-channel logger. Replaces the external "@vscode-logging/logger"
// dependency; only the printf style formatting used by the call sites is kept.
import { Disposable, OutputChannel, window, workspace } from "vscode";
import { format } from "util";

export type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

const CHANNEL_NAME = "Unity SW Pack";

let channel: OutputChannel | undefined;
let level: LogLevel = "info";

function write(messageLevel: LogLevel, message: string, args: unknown[]): void {
    if (levelOrder[messageLevel] < levelOrder[level] || !channel) {
        return;
    }

    const text = args.length > 0 ? format(message, ...args) : message;
    channel.appendLine(`[${new Date().toISOString()}] [${messageLevel}] ${text}`);
}

export const logger = {
    debug(message: string, ...args: unknown[]): void {
        write("debug", message, args);
    },
    info(message: string, ...args: unknown[]): void {
        write("info", message, args);
    },
    warn(message: string, ...args: unknown[]): void {
        write("warn", message, args);
    },
    error(message: string, ...args: unknown[]): void {
        write("error", message, args);
    },
};

function configuredLevel(): LogLevel {
    return workspace.getConfiguration("unitySWpack").get<boolean>("debugLogging") === true ? "debug" : "info";
}

/**
 * Creates the output channel and keeps the log level in sync with
 * "unitySWpack.debugLogging". Returns a disposable that tears both down.
 */
export function initializeLogger(): Disposable {
    if (!channel) {
        channel = window.createOutputChannel(CHANNEL_NAME);
    }
    level = configuredLevel();

    const configDisposable = workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("unitySWpack.debugLogging")) {
            level = configuredLevel();
        }
    });

    return {
        dispose: () => {
            configDisposable.dispose();
            channel?.dispose();
            channel = undefined;
            level = "info";
        },
    };
}

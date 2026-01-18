import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

type NativeResult<T> = { ok: true; data: T } | { ok: false; reason: string };

export async function computeWithNativeIfAvailable<T = unknown>(input: unknown, timeoutMs = 1500): Promise<NativeResult<T> | null> {
	const exePath = path.resolve(process.cwd(), 'algo', process.platform === 'win32' ? 'compute_route.exe' : 'compute_route');
	if (!fs.existsSync(exePath)) {
		return { ok: false, reason: 'native-binary-missing' };
	}
	// Write input to a temp file and read output temp file to be safer cross-platform
	const tmpIn = path.join(os.tmpdir(), `charge_input_${Date.now()}.json`);
	const tmpOut = path.join(os.tmpdir(), `charge_output_${Date.now()}.json`);
	await fs.promises.writeFile(tmpIn, JSON.stringify(input), 'utf-8');

	return new Promise((resolve) => {
		const child = spawn(exePath, [tmpIn, tmpOut], { stdio: 'ignore' });
		let finished = false;

		const done = (result: NativeResult<T>) => {
			if (finished) return;
			finished = true;
			try {
				fs.existsSync(tmpIn) && fs.unlinkSync(tmpIn);
				fs.existsSync(tmpOut) && fs.unlinkSync(tmpOut);
			} catch {
				// ignore cleanup errors
			}
			resolve(result);
		};

		const to = setTimeout(() => {
			try {
				child.kill('SIGKILL');
			} catch {
				// ignore
			}
			done({ ok: false, reason: 'native-timeout' });
		}, timeoutMs);

		child.on('exit', (code) => {
			clearTimeout(to);
			if (code === 0 && fs.existsSync(tmpOut)) {
				try {
					const raw = fs.readFileSync(tmpOut, 'utf-8');
					const data = JSON.parse(raw) as T;
					done({ ok: true, data });
				} catch (e: any) {
					done({ ok: false, reason: 'native-output-parse-failed' });
				}
			} else {
				done({ ok: false, reason: 'native-exit-nonzero' });
			}
		});

		child.on('error', () => {
			clearTimeout(to);
			done({ ok: false, reason: 'native-spawn-error' });
		});
	});
}



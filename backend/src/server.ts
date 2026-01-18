import express, { NextFunction, Request, Response } from 'express';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { router as computeRouteRouter } from './routes/computeRoute.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '2mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
	const now = dayjs();
	const utcTime = now.utc().format('YYYY-MM-DD HH:mm:ss');
	const istTime = now.tz('Asia/Kolkata').format('DD-MMM-YYYY hh:mm:ss A');
	// eslint-disable-next-line no-console
	console.log(`[IST ${istTime}] [UTC ${utcTime}] → ${req.method} ${req.originalUrl}`);
	res.on('finish', () => {
		const doneUtc = dayjs().utc().format('YYYY-MM-DD HH:mm:ss');
		const doneIst = dayjs().tz('Asia/Kolkata').format('DD-MMM-YYYY hh:mm:ss A');
		// eslint-disable-next-line no-console
		console.log(`[IST ${doneIst}] [UTC ${doneUtc}] ✅ ${req.method} ${req.originalUrl} → ${res.statusCode}`);
	});
	next();
});

app.get('/', (_req: Request, res: Response) => {
	res.json({
		status: 'ok',
		message: '✅ ChargeRoute backend is live and connected!',
		timestamp: new Date().toISOString()
	});
});

app.get('/api/health', (_req, res) => {
	app.locals.startedAt = app.locals.startedAt || new Date().toISOString();
	res.json({ status: 'ok', startedAt: app.locals.startedAt });
});

app.use('/api/compute-route', computeRouteRouter);

// Static sample for quick manual testing (optional)
app.get('/api/sample', (_req, res) => {
	res.json({
		message: 'Use POST /api/compute-route with the sample in frontend/public/sample-data.json'
	});
});

app.listen(PORT, () => {
	const startedIst = dayjs().tz('Asia/Kolkata').format('DD-MMM-YYYY hh:mm:ss A');
	// eslint-disable-next-line no-console
	console.log(`🚀 ChargeRoute backend connected and listening at http://localhost:${PORT} [Started: ${startedIst} IST]`);
});



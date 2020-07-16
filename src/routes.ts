import { Application, Request, Response } from 'express';
import createTestDb from './routes/create-test-db';

export default function (app: Application): void {
  app.get('/test', (req: Request, res: Response) => {
    res.send('TEST');
  });

  createTestDb(app);
}

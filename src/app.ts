import express from 'express';
import { connectDB } from './config/db';
import authRouter from './routes/auth.route';
import cors from 'cors';
const PORT = 3005
const app = express();
app.use(cors());

connectDB();

app.use(express.json());

app.use('/', authRouter);
// 
app.listen(PORT, () => {
  console.log(`Server is running port ${PORT}`);
});
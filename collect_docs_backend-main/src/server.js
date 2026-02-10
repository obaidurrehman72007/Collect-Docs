
import dotenv from 'dotenv';
import {app} from './app.js';
import { initModels } from './models/index.js';

dotenv.config();

const PORT = process.env.PORT || 3000;  

const startServer = async () => {
  try {
    await initModels();  
    
    app.listen(PORT, () => {
      
      
    });
  } catch (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
};

startServer();

const express = require('express');
const cors = require('cors');
const fileRoutes = require('./routes/fileRoutes');
const schemaRoutes = require('./routes/schemaRoutes');
const sqlRoutes = require('./routes/sqlRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/files', fileRoutes);
app.use('/api/schema', schemaRoutes);
app.use('/api/sql', sqlRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Data Extractor Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

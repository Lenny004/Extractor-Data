const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const FileRoutes = require('./routes/FileRoutes');
const SchemaRoutes = require('./routes/SchemaRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/files', FileRoutes);
app.use('/api/schemas', SchemaRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Data Extractor API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
